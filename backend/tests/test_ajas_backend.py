"""End-to-end backend tests for AI Job Application System v3.

Exercises all endpoints with a single realistic QA engineer resume so the full
5-agent chain runs once. LLM calls are slow (10-40s each) so generous timeouts.
"""
import io
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"
TIMEOUT = 120  # per LLM call

# Realistic QA engineer resume
RESUME = """Asha Verma
Senior QA Engineer
Bengaluru, India | asha.verma@example.com | +91-9876543210

SUMMARY
Senior QA Engineer with 7 years building automation frameworks for fintech and SaaS
products. Strong in API testing, Selenium/Playwright, and CI/CD-driven QA pipelines.

TECHNICAL SKILLS
Languages: Python, Java, JavaScript
Automation: Selenium WebDriver, Playwright, Cypress, TestNG, PyTest
API Testing: Postman, REST Assured, Karate
CI/CD: Jenkins, GitHub Actions, GitLab CI
Databases: MySQL, PostgreSQL, MongoDB
Bug Tracking: JIRA, Zephyr, TestRail
Methodologies: Agile/Scrum, BDD (Cucumber), TDD

EXPERIENCE
Senior QA Engineer - Razorpay (Jan 2021 - Present)
- Built Playwright + Python framework reducing regression cycle from 2 days to 4 hours.
- Authored 600+ API tests in REST Assured improving defect detection by 35%.
- Integrated tests into Jenkins; cut release blockers by 40%.

QA Engineer - Freshworks (Jun 2017 - Dec 2020)
- Automated 70% of manual regression suite using Selenium + TestNG.
- Owned bug triage in JIRA across 3 squads.

EDUCATION
B.Tech, Computer Science - VIT, 2017

CERTIFICATIONS
ISTQB Foundation Level (2018)
"""


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    return sess


@pytest.fixture(scope="session")
def state():
    return {}


# --- Health ---
def test_health(s):
    r = s.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j.get("status") == "ok"
    assert "AI Job Application System" in j.get("service", "")


# --- Resume parse (TXT) ---
def test_parse_resume_txt(s, state):
    files = {"file": ("resume.txt", io.BytesIO(RESUME.encode("utf-8")), "text/plain")}
    r = s.post(f"{API}/resume/parse-file", files=files, timeout=30)
    assert r.status_code == 200, r.text
    txt = r.json().get("resume_text", "")
    assert "Asha Verma" in txt and "Playwright" in txt
    state["resume_text"] = txt


def test_parse_resume_empty(s):
    files = {"file": ("empty.txt", io.BytesIO(b""), "text/plain")}
    r = s.post(f"{API}/resume/parse-file", files=files, timeout=15)
    assert r.status_code == 400


# --- Agent 1 ---
def test_agent1_extract_profile(s, state):
    assert "resume_text" in state, "previous test must seed resume"
    r = s.post(f"{API}/agents/extract-profile",
               json={"resume_text": state["resume_text"]}, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    profile = r.json().get("profile")
    assert isinstance(profile, dict)
    for key in ("candidate", "skills", "search_params", "profile_score"):
        assert key in profile, f"missing {key} in profile"
    assert profile["candidate"].get("name")
    assert isinstance(profile["search_params"].get("titles"), list)
    state["profile"] = profile


# --- Agent 2 ---
def test_agent2_job_search(s, state):
    assert "profile" in state
    r = s.post(f"{API}/agents/job-search",
               json={"profile": state["profile"]}, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    res = r.json().get("searches")
    assert isinstance(res, dict)
    for key in ("linkedin", "naukri", "indeed", "wellfound",
                "target_companies", "boolean_search", "google_xray"):
        assert key in res, f"missing {key}"
    assert isinstance(res["linkedin"], list) and len(res["linkedin"]) >= 1
    assert isinstance(res["target_companies"], list) and len(res["target_companies"]) >= 1


# --- Agent 3 ---
SAMPLE_JOBS = [
    {
        "title": "Senior QA Automation Engineer",
        "company": "Acme Fintech",
        "location": "Bengaluru, India",
        "description": ("Looking for senior QA with Playwright/Selenium, Python, "
                        "REST Assured, Jenkins, MySQL, JIRA, Agile, fintech domain."),
        "url": "https://example.com/job/1",
    },
    {
        "title": "SDET - Backend",
        "company": "GlobalSaaS",
        "location": "Remote",
        "description": ("SDET with Java, REST Assured, Karate, GitHub Actions, "
                        "PostgreSQL, BDD/Cucumber for SaaS platform."),
        "url": "https://example.com/job/2",
    },
    {
        "title": "Embedded Firmware Engineer",
        "company": "HardwareCo",
        "location": "Pune",
        "description": "C/C++ embedded firmware for automotive ECUs. RTOS experience.",
        "url": "https://example.com/job/3",
    },
]


def test_agent3_score_jobs(s, state):
    assert "profile" in state
    r = s.post(f"{API}/agents/score-jobs",
               json={"profile": state["profile"], "jobs": SAMPLE_JOBS},
               timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    res = r.json().get("result")
    assert isinstance(res, dict)
    ranked = res.get("ranked_jobs")
    assert isinstance(ranked, list) and len(ranked) >= 1
    top = ranked[0]
    for key in ("rank", "title", "company", "match_score", "tier", "breakdown"):
        assert key in top, f"missing {key} in ranked_job"
    assert isinstance(top["match_score"], (int, float))
    state["top_job"] = {
        "id": top.get("id"),
        "title": top["title"],
        "company": top["company"],
        "location": top.get("location", ""),
        "description": top.get("description") or SAMPLE_JOBS[0]["description"],
        "url": top.get("url", ""),
    }
    state["score"] = top


# --- Agent 4 ---
def test_agent4_customize_resume(s, state):
    assert "top_job" in state
    payload = {
        "resume_text": state["resume_text"],
        "profile": state["profile"],
        "job": state["top_job"],
    }
    r = s.post(f"{API}/agents/customize-resume", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    res = r.json().get("result")
    assert isinstance(res, dict)
    assert isinstance(res.get("customized_resume"), str) and len(res["customized_resume"]) > 100
    assert isinstance(res.get("change_summary"), list)
    assert isinstance(res.get("keyword_insertion_map"), list)
    state["customized_resume"] = res["customized_resume"]


# --- Agent 5 ---
def test_agent5_cover_letter(s, state):
    assert "customized_resume" in state
    payload = {
        "profile": state["profile"],
        "job": state["top_job"],
        "customized_resume": state["customized_resume"],
    }
    r = s.post(f"{API}/agents/cover-letter", json=payload, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    res = r.json().get("result")
    assert isinstance(res, dict)
    assert isinstance(res.get("cover_letter"), str) and len(res["cover_letter"]) > 100
    assert "word_count" in res
    assert "tone_used" in res
    assert isinstance(res.get("quick_answers"), dict)
    state["cover_letter"] = res["cover_letter"]
    state["quick_answers"] = res["quick_answers"]


# --- Applications CRUD ---
def test_create_application(s, state):
    payload = {
        "job": state["top_job"],
        "score": state["score"],
        "customized_resume": state["customized_resume"],
        "cover_letter": state["cover_letter"],
        "quick_answers": state["quick_answers"],
        "status": "applied",
    }
    r = s.post(f"{API}/applications", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert "_id" not in doc
    assert doc.get("id")
    assert doc.get("status") == "applied"
    state["app_id"] = doc["id"]


def test_list_applications(s, state):
    r = s.get(f"{API}/applications", timeout=30)
    assert r.status_code == 200
    items = r.json().get("items", [])
    assert any(it.get("id") == state["app_id"] for it in items)
    for it in items:
        assert "_id" not in it


def test_update_status(s, state):
    r = s.patch(f"{API}/applications/{state['app_id']}/status",
                json={"status": "interview"}, timeout=15)
    assert r.status_code == 200
    assert r.json().get("status") == "interview"

    # invalid
    r = s.patch(f"{API}/applications/{state['app_id']}/status",
                json={"status": "bogus"}, timeout=15)
    assert r.status_code == 400

    # not found
    r = s.patch(f"{API}/applications/does-not-exist/status",
                json={"status": "offer"}, timeout=15)
    assert r.status_code == 404


def test_delete_application(s, state):
    r = s.delete(f"{API}/applications/{state['app_id']}", timeout=15)
    assert r.status_code == 200
    assert r.json().get("deleted") == state["app_id"]
    # already deleted -> 404
    r = s.delete(f"{API}/applications/{state['app_id']}", timeout=15)
    assert r.status_code == 404


# --- Downloads ---
@pytest.mark.parametrize("fmt,media,magic", [
    ("txt", "text/plain", b"Hello"),
    ("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", b"PK"),
    ("pdf", "application/pdf", b"%PDF"),
])
def test_downloads(s, fmt, media, magic):
    r = s.post(f"{API}/download/{fmt}",
               json={"content": "Hello\nWorld", "filename": "doc"}, timeout=30)
    assert r.status_code == 200, r.text
    assert media in r.headers.get("content-type", "")
    cd = r.headers.get("content-disposition", "")
    assert f"doc.{fmt}" in cd
    assert r.content[: len(magic)] == magic or magic in r.content[:8]


def test_download_unsupported(s):
    r = s.post(f"{API}/download/xls",
               json={"content": "x", "filename": "y"}, timeout=15)
    assert r.status_code == 400
