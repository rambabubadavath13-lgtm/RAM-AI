"""All 5 AI agent prompts and orchestration via Claude Sonnet 4.5."""
import os
import json
import re
import uuid
from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
MODEL_PROVIDER = "anthropic"
MODEL_NAME = "claude-sonnet-4-5-20250929"


def _new_chat(system_message: str) -> LlmChat:
    return LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=str(uuid.uuid4()),
        system_message=system_message,
    ).with_model(MODEL_PROVIDER, MODEL_NAME)


def _extract_json(text: str):
    """Robust JSON extraction from LLM responses."""
    if not text:
        return None
    # try fenced
    m = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
    candidate = m.group(1) if m else None
    if not candidate:
        # try first { ... last }
        first = text.find("{")
        last = text.rfind("}")
        if first >= 0 and last > first:
            candidate = text[first:last + 1]
    if not candidate:
        return None
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None


# =========== AGENT 1 — PROFILE EXTRACTOR ===========
PROFILE_SYS = """You are a QA Engineering Career Analyst.

Your ONLY input is the candidate's BASE RESUME.
Your job is to extract a complete, structured profile that downstream agents
will use to search and match jobs automatically.

Always respond with VALID JSON ONLY (no markdown fences, no prose). Schema:
{
  "candidate": {
    "name": "string",
    "total_years_experience": number,
    "current_title": "string",
    "current_location": "string",
    "experience_level": "Junior" | "Mid" | "Senior",
    "email": "string or null",
    "phone": "string or null"
  },
  "skills": {
    "hard": {
      "testing_types": ["Manual"|"Automation"|"API"|"Performance"|"Security"|"Mobile"],
      "automation_frameworks": [],
      "api_tools": [],
      "languages": [],
      "databases": [],
      "ci_cd": [],
      "bug_tracking": [],
      "methodologies": []
    },
    "soft": [],
    "domains": []
  },
  "search_params": {
    "titles": ["5-8 variants"],
    "must_have_keywords": ["top 10"],
    "nice_to_have_keywords": ["top 5"],
    "exclude_keywords": [],
    "salary_estimate": "string e.g. '8-15 LPA' or '$80k-110k'"
  },
  "profile_score": {
    "strengths": ["top 3"],
    "gaps": ["top 3"],
    "uniqueness_score": number_1_to_10,
    "summary": "2-3 sentence narrative"
  }
}
Be accurate. Only include skills/tools explicitly present in the resume.
"""


# =========== AGENT 2 — JOB HUNTER ===========
JOB_HUNTER_SYS = """You are a Job Search Strategist for QA Engineers.

Given the candidate profile JSON, generate ready-to-use job search URLs across
LinkedIn, Naukri/Indeed, and Wellfound, plus 20 target companies and boolean
search strings.

Respond with VALID JSON ONLY (no fences, no prose). Schema:
{
  "linkedin": [
    {"label": "short label", "url": "https://www.linkedin.com/jobs/search/?keywords=...&location=..."}
  ],
  "naukri": [
    {"label": "short label", "url": "https://www.naukri.com/..."}
  ],
  "indeed": [
    {"label": "short label", "url": "https://www.indeed.com/jobs?q=...&l=..."}
  ],
  "wellfound": [
    {"label": "short label", "url": "https://wellfound.com/jobs?q=...&l=..."}
  ],
  "target_companies": [
    {"company": "name", "why_fits": "1 line", "careers_url": "url",
     "stack_match": "tech overlap"}
  ],
  "boolean_search": "boolean string for job boards",
  "google_xray": "site:linkedin.com/in ... boolean string"
}

Rules:
- Generate 5 LinkedIn, 5 Naukri, 5 Indeed, 3 Wellfound entries.
- 20 target companies tailored to the candidate's domain + tech stack.
- URL-encode spaces as %20 inside URLs.
- Use the candidate's actual location and titles.
"""


# =========== AGENT 3 — SCORER ===========
SCORER_SYS = """You are a Job-Fit Analyst for QA Engineers.

You receive a candidate profile and a list of job listings. Score every job
against the profile using this weighting:
  Hard Skills 40% | ATS Keywords 25% | Tools 15% | Domain 10% | Seniority 10%

Respond with VALID JSON ONLY (no fences, no prose). Schema:
{
  "ranked_jobs": [
    {
      "rank": 1,
      "id": "stable id from input",
      "title": "string",
      "company": "string",
      "location": "string",
      "match_score": 0-100,
      "tier": "TIER_1" | "TIER_2" | "TIER_3",
      "verdict": "APPLY" | "CAUTION" | "SKIP",
      "breakdown": {
        "hard_skills": 0-100,
        "keywords": 0-100,
        "tools": 0-100,
        "domain": 0-100,
        "seniority": 0-100
      },
      "matched_skills": ["top 3"],
      "critical_gaps": ["max 2"],
      "why_apply": "1 sentence"
    }
  ],
  "top_5_recommendations": ["job ids in order"],
  "skill_gap_pattern": "1-2 sentence overall pattern"
}

Tiers: 75-100=TIER_1 (APPLY), 50-74=TIER_2 (CAUTION), <50=TIER_3 (SKIP).
"""


# =========== AGENT 4 — RESUME CUSTOMIZER ===========
RESUME_SYS = """You are an ATS-Optimization Expert for QA Engineers.

You receive: candidate base resume, candidate profile JSON, ONE target job.

Strict rules:
- Rephrase bullets to include exact JD keywords; reorder most-relevant first.
- Strengthen each bullet: Action Verb + Task + Measurable Impact.
- Mirror JD language in Summary; never fabricate tools, jobs, or metrics.
- Plain text only. Single column. No tables/icons/emojis.
- Section names exactly: Summary | Technical Skills | Experience | Education | Certifications.
- Dates: MMM YYYY - MMM YYYY. Use hyphens for bullets.

Respond with VALID JSON ONLY (no fences, no prose). Schema:
{
  "keyword_insertion_map": [
    {"keyword": "string", "where_added": "section/bullet description"}
  ],
  "customized_resume": "FULL plain-text ATS resume here with newlines",
  "change_summary": ["max 5 bullets describing key edits"]
}
"""


# =========== AGENT 5 — COVER LETTER ===========
COVER_SYS = """You are a Professional Cover Letter Writer for QA Engineers.

You receive: candidate profile, target job (title+company+JD), customized resume.

Cover letter structure (250 words MAX):
  Para 1 — Hook: specific role + company; one compelling fit reason; reference
    something specific about the company (mission/product/tech).
  Para 2 — Proof: 2 achievements addressing top 2 JD requirements; numbers when
    possible.
  Para 3 — Close: genuine role-specific interest, notice period placeholder,
    clear CTA.

Tone:
  Startup (<200 employees) -> conversational/energetic.
  Enterprise (>1000) -> formal/structured.
  Product company -> technical/outcome-focused.
  Service/consulting -> process-focused/reliable.
  Unknown -> professional default.

Strict rules: never "I am writing to apply for..."; every line specific to THIS
job; company name appears at least twice; role title at least once.

Respond with VALID JSON ONLY (no fences, no prose). Schema:
{
  "cover_letter": "full letter as plain text with newlines",
  "tone_used": "Startup" | "Enterprise" | "Product" | "Service" | "Professional",
  "word_count": number,
  "quick_answers": {
    "tell_us_about_yourself": "3-4 lines",
    "why_should_we_hire_you": "role-specific",
    "summarize_qa_experience": "2-3 lines",
    "notice_period": "[YOUR ACTUAL NOTICE PERIOD]"
  }
}
"""


async def _send(system: str, user_text: str) -> dict:
    chat = _new_chat(system)
    response = await chat.send_message(UserMessage(text=user_text))
    parsed = _extract_json(response)
    if parsed is None:
        raise ValueError(f"LLM returned non-JSON response: {response[:500]}")
    return parsed


async def run_profile_extractor(resume_text: str) -> dict:
    return await _send(PROFILE_SYS, f"BASE RESUME:\n{resume_text}")


async def run_job_hunter(profile: dict) -> dict:
    return await _send(JOB_HUNTER_SYS, f"CANDIDATE PROFILE JSON:\n{json.dumps(profile)}")


async def run_scorer(profile: dict, jobs: list) -> dict:
    payload = {"profile": profile, "jobs": jobs}
    return await _send(SCORER_SYS, f"INPUT:\n{json.dumps(payload)}")


async def run_resume_customizer(resume_text: str, profile: dict, job: dict) -> dict:
    payload = {"base_resume": resume_text, "profile": profile, "target_job": job}
    return await _send(RESUME_SYS, f"INPUT:\n{json.dumps(payload)}")


async def run_cover_letter(profile: dict, job: dict, customized_resume: str) -> dict:
    payload = {
        "profile": profile,
        "target_job": job,
        "customized_resume": customized_resume,
    }
    return await _send(COVER_SYS, f"INPUT:\n{json.dumps(payload)}")
