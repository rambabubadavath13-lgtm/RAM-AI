# AJAS v3.0 — AI Job Application System

## Original Problem Statement
Resume-First, Auto-Discovery 5-agent system for QA engineers:
1. Profile Extractor → 2. Job Hunter → 3. Scorer & Ranker → 4. Resume Customizer → 5. Cover Letter Writer.
Plus dashboards: Profile, Ranked Jobs (Tier 1/2/3), Application Package per job, Kanban Tracker.

## User Choices
- LLM: Claude Sonnet 4.5 via Emergent Universal LLM Key (`anthropic/claude-sonnet-4-5-20250929`)
- Job discovery: Generate clickable search URLs (no scraping); user pastes job descriptions back
- Resume input: PDF/DOCX upload OR paste text
- Downloads: .txt / .pdf / .docx
- Auth: None (single user)

## Architecture (2026-02)
- **Backend** FastAPI (`/api` prefix) + MongoDB (Motor) + emergentintegrations LlmChat
  - `/api/resume/parse-file` (PDF via pdfplumber, DOCX via python-docx, TXT)
  - `/api/agents/{extract-profile,job-search,score-jobs,customize-resume,cover-letter}`
  - `/api/applications` CRUD + status patch (kanban: applied/interview/rejected/offer)
  - `/api/download/{txt|pdf|docx}` via reportlab + python-docx
- **Frontend** React 19 + react-router-dom v7 + Tailwind + Shadcn primitives + Recharts + sonner
  - Pages: UploadPage, ProfilePage, JobHuntPage, RankedJobsPage, PackagePage, TrackerPage
  - Workflow state cached in `localStorage` (`/lib/store.js`)
  - Neo-Brutalist design: Bricolage Grotesque + IBM Plex Sans/Mono, thick black borders, solid offset shadows, sharp edges, Tier colors (#00C853 / #FFD600 / #D50000)

## What's Implemented (2026-02)
- All 5 agents working end-to-end with Claude Sonnet 4.5
- Resume parsing (PDF/DOCX/TXT), structured profile + skills radar chart
- Generated multi-platform job search URLs + 20 target companies + boolean/X-Ray strings
- Job scoring with tiered ranking + breakdown bars + matched skills/gaps
- ATS-optimized resume customization + cover letter + quick answers
- Downloads in .txt/.pdf/.docx
- Drag-and-drop kanban tracker (4 status columns)
- 16/16 backend tests passing (iteration_1.json)

## Test Credentials
N/A — no authentication.

## Backlog / Next Tasks
- P1: Persist multi-resume sessions (currently single localStorage workflow)
- P1: Bulk job paste (CSV / multi-line splitter)
- P2: LinkedIn `Easy Apply` deep-link auto-fill via clipboard prefilled cover-letter
- P2: Application analytics — response rates per company / per match-score band
- P2: Scheduled daily job-hunt reminders (email)
- P3: Multi-user accounts + role-based dashboards
- P3: Add interview prep agent (Agent 6) generating role-specific Q&A
