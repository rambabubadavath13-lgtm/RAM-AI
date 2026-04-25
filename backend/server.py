from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Body
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
import os
import logging
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import agents
import parsers

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="AI Job Application System v3")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
log = logging.getLogger("ajas")


# ---------- Models ----------
class ResumeText(BaseModel):
    resume_text: str
    role_hint: Optional[str] = None


class ProfileIn(BaseModel):
    profile: Dict[str, Any]


class JobItem(BaseModel):
    id: Optional[str] = None
    title: str
    company: str
    location: Optional[str] = ""
    description: str
    url: Optional[str] = ""


class ScoreRequest(BaseModel):
    profile: Dict[str, Any]
    jobs: List[JobItem]


class CustomizeRequest(BaseModel):
    resume_text: str
    profile: Dict[str, Any]
    job: JobItem


class CoverRequest(BaseModel):
    profile: Dict[str, Any]
    job: JobItem
    customized_resume: str


class ApplicationCreate(BaseModel):
    job: Dict[str, Any]
    score: Optional[Dict[str, Any]] = None
    customized_resume: Optional[str] = None
    cover_letter: Optional[str] = None
    quick_answers: Optional[Dict[str, Any]] = None
    status: str = "applied"  # applied | interview | rejected | offer


class StatusUpdate(BaseModel):
    status: str


class DownloadRequest(BaseModel):
    content: str
    filename: str = "document"


# ---------- Routes ----------
@api.get("/")
async def root():
    return {"service": "AI Job Application System v3", "status": "ok"}


@api.post("/resume/parse-file")
async def parse_resume_file(file: UploadFile = File(...)):
    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    try:
        text = parsers.parse_resume_file(file.filename or "", data)
    except Exception as e:
        log.exception("parse failed")
        raise HTTPException(400, f"Failed to parse file: {e}")
    if not text.strip():
        raise HTTPException(400, "Could not extract text from file")
    return {"resume_text": text}


@api.post("/agents/extract-profile")
async def extract_profile(payload: ResumeText):
    if not payload.resume_text.strip():
        raise HTTPException(400, "resume_text is empty")
    try:
        profile = await agents.run_profile_extractor(payload.resume_text, payload.role_hint or "")
    except Exception as e:
        log.exception("agent1 failed")
        raise HTTPException(500, f"Agent 1 failed: {e}")
    return {"profile": profile}


@api.post("/agents/job-search")
async def job_search(payload: ProfileIn):
    try:
        result = await agents.run_job_hunter(payload.profile)
    except Exception as e:
        log.exception("agent2 failed")
        raise HTTPException(500, f"Agent 2 failed: {e}")
    return {"searches": result}


@api.post("/agents/score-jobs")
async def score_jobs(payload: ScoreRequest):
    if not payload.jobs:
        raise HTTPException(400, "No jobs provided")
    jobs = []
    for j in payload.jobs:
        d = j.model_dump()
        if not d.get("id"):
            d["id"] = str(uuid.uuid4())
        jobs.append(d)
    try:
        result = await agents.run_scorer(payload.profile, jobs)
    except Exception as e:
        log.exception("agent3 failed")
        raise HTTPException(500, f"Agent 3 failed: {e}")
    # Attach original descriptions back to ranked jobs for downstream use
    by_id = {j["id"]: j for j in jobs}
    for rj in result.get("ranked_jobs", []):
        src = by_id.get(rj.get("id"))
        if src:
            rj["description"] = src.get("description", "")
            rj["url"] = src.get("url", "")
    return {"result": result}


@api.post("/agents/customize-resume")
async def customize_resume(payload: CustomizeRequest):
    try:
        result = await agents.run_resume_customizer(
            payload.resume_text, payload.profile, payload.job.model_dump()
        )
    except Exception as e:
        log.exception("agent4 failed")
        raise HTTPException(500, f"Agent 4 failed: {e}")
    return {"result": result}


@api.post("/agents/cover-letter")
async def cover_letter(payload: CoverRequest):
    try:
        result = await agents.run_cover_letter(
            payload.profile, payload.job.model_dump(), payload.customized_resume
        )
    except Exception as e:
        log.exception("agent5 failed")
        raise HTTPException(500, f"Agent 5 failed: {e}")
    return {"result": result}


# ---------- Applications (Tracker) ----------
@api.post("/applications")
async def create_application(app_in: ApplicationCreate):
    doc = {
        "id": str(uuid.uuid4()),
        "job": app_in.job,
        "score": app_in.score,
        "customized_resume": app_in.customized_resume,
        "cover_letter": app_in.cover_letter,
        "quick_answers": app_in.quick_answers,
        "status": app_in.status,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.applications.insert_one(doc.copy())
    doc.pop("_id", None)
    return doc


@api.get("/applications")
async def list_applications():
    items = await db.applications.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"items": items}


@api.patch("/applications/{app_id}/status")
async def update_status(app_id: str, body: StatusUpdate):
    if body.status not in {"applied", "interview", "rejected", "offer"}:
        raise HTTPException(400, "invalid status")
    res = await db.applications.update_one(
        {"id": app_id},
        {"$set": {"status": body.status,
                  "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "not found")
    return {"id": app_id, "status": body.status}


@api.delete("/applications/{app_id}")
async def delete_application(app_id: str):
    res = await db.applications.delete_one({"id": app_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "not found")
    return {"deleted": app_id}


# ---------- Downloads ----------
@api.post("/download/{fmt}")
async def download(fmt: str, payload: DownloadRequest):
    if fmt not in {"txt", "pdf", "docx"}:
        raise HTTPException(400, "unsupported format")
    text = payload.content or ""
    fname = (payload.filename or "document").replace("/", "_")
    if fmt == "txt":
        data = parsers.export_txt(text)
        media = "text/plain"
        ext = "txt"
    elif fmt == "docx":
        data = parsers.export_docx(text)
        media = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ext = "docx"
    else:
        data = parsers.export_pdf(text)
        media = "application/pdf"
        ext = "pdf"
    headers = {"Content-Disposition": f'attachment; filename="{fname}.{ext}"'}
    return Response(content=data, media_type=media, headers=headers)


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
