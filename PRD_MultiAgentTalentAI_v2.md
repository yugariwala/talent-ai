# Product Requirements Document
# Multi-Agent Talent AI — v2.0
### Intelligent Resume Parsing · Skill Taxonomy · Semantic Matching · Explainable Decisions

---

**Team:** Innovators
**Event:** Tic Tech Toe '26 — IEEE Student Branch, DAIICT × Prama
**Problem Statement:** 9
**Team Leader:** Rachit Kaila
**Members:** Dirgh Abhangi (AI/ML), Nishil Dave (Full Stack), Yug Ariwala (Backend), Rachit Kaila (Frontend), Kavan Saradava (Frontend)
**Document Version:** 2.0
**Status:** Pre-Build — Approved for Development
**Previous Version:** PRD v1.0 (deprecated)

---

## What Changed from v1.0

This revision makes the system buildable in a hackathon. Five architectural decisions from v1.0 were reversed:

| v1.0 Decision | v2.0 Replacement | Reason |
|---|---|---|
| Ollama Mistral-7B local inference | Claude API for all LLM calls | GPU dependency eliminated; no hardware risk |
| PostgreSQL + pgvector + Alembic | SQLite + SQLAlchemy + numpy | Zero setup; works anywhere |
| Celery + Redis task queue | FastAPI `BackgroundTasks` | 3 dependencies become 0 |
| WebSocket real-time updates | Polling (2s interval) | Same UX, far simpler implementation |
| "Fine-tuned" Sentence-BERT | `all-MiniLM-L6-v2` stock model | Honest; still fast; CPU-viable |

The new requirements from Problem Statement 9 are fully incorporated: multi-format parsing, standalone skill taxonomy agent, semantic matching, orchestration observability, and a REST API layer.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [System Architecture](#4-system-architecture)
5. [Agent Specifications](#5-agent-specifications)
6. [REST API Specification](#6-rest-api-specification)
7. [Feature Specifications](#7-feature-specifications)
8. [User Flow](#8-user-flow)
9. [Data Architecture](#9-data-architecture)
10. [Tech Stack](#10-tech-stack)
11. [Build Order & Task Allocation](#11-build-order--task-allocation)
12. [Non-Functional Requirements](#12-non-functional-requirements)
13. [Demo Scope](#13-demo-scope)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Out of Scope](#15-out-of-scope)
16. [Glossary](#16-glossary)

---

## 1. Executive Summary

Multi-Agent Talent AI is a five-agent recruitment intelligence system that processes resumes in any format, normalises extracted skills against a hierarchical taxonomy, and matches candidates to job descriptions semantically — not just by keyword. Every hiring decision is explained in plain language. Every pipeline step is traced for observability.

The system exposes its full pipeline through a documented REST API, making it consumable by any third-party ATS or HR tool. A clean HR-facing dashboard provides the human interface over the same pipeline.

**Core tagline:** *"Every candidate gets a verdict. Every verdict gets a reason."*

---

## 2. Problem Statement

### 2.1 Inefficient Screening
Recruiters manually review hundreds of resumes in inconsistent formats with no tooling assistance. No systematic way to handle new applications after initial screening.

### 2.2 Poor Evaluation Quality
Legacy ATS tools apply rigid keyword matching. Qualified candidates are rejected for using different terminology. No explainability: HR cannot see why a candidate was shortlisted or rejected. Binary skill detection ("has Python: yes/no") ignores depth and experience level.

### 2.3 No Interoperability
Current tools are walled gardens. There is no standard API for resume parsing, skill normalisation, or semantic matching that HR software can consume. Every vendor requires a proprietary integration.

---

## 3. Solution Overview

The system solves all three problems through a five-agent pipeline built around four principles:

**Reduce, then match.** Resumes are parsed into structured `(skill, proficiency_level)` signals. Matching operates on signals, not raw text. This cuts token consumption by ~80% compared to feeding raw resumes to an LLM.

**Dynamic scoring per role.** A Sales Manager and a Backend Engineer are never evaluated on the same dimensions. The JD Intelligence Agent generates scoring criteria, dimension weights, and proficiency rubrics fresh for every job post before a single resume is touched.

**Semantic, not lexical.** Skill matching uses vector embeddings to detect near-equivalences ("statistical modelling" ≈ "data analysis") that keyword matching misses. Skill normalisation resolves synonyms and abbreviations through a hierarchical taxonomy.

**AI recommends, HR decides.** Every decision is visible, auditable, and overridable. The system enforces nothing.

---

## 4. System Architecture

### 4.1 High-Level Pipeline

```
┌──────────────────────────────────────────────────────────┐
│  INTAKE PHASE                                             │
│  1. Multi-format upload (PDF / DOCX / TXT)               │
│  2. JD Chat Input → freeform natural language            │
│  3. Clarifying Q&A → Agent 1 asks until confident        │
│  4. Criteria Card generated → HR reviews and confirms    │
└──────────────────────────┬───────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│  PROCESSING PHASE  (parallel background tasks)           │
│  5. Resume Parser Agent → multi-format structured data   │
│  6. Skill Taxonomy Agent → normalise + infer + flag      │
│  7. Embedding pre-filter → fast relevance ranking        │
│  8. Semantic Matching Agent → score + gap analysis       │
│  9. Explainability Agent → pros/cons + summary           │
└──────────────────────────┬───────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│  RESULTS PHASE                                           │
│  10. Score distribution → tier boundaries suggested      │
│  11. HR adjusts boundaries via slider                    │
│  12. Dashboard: Green / Yellow / Red candidate list      │
│  13. Candidate detail drawer: full breakdown + original  │
└──────────────────────────┬───────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────┐
│  API LAYER  (concurrent with all phases)                 │
│  All pipeline capabilities exposed as REST endpoints     │
│  API key auth, rate limiting, OpenAPI docs at /docs      │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Model Strategy

One LLM provider, two usage patterns:

| Task | Model | Frequency |
|---|---|---|
| JD analysis, Q&A generation, Criteria Card | claude-sonnet-4-20250514 | Once per job post |
| Resume entity extraction | claude-sonnet-4-20250514 | Per resume (shortlisted only) |
| Explainability generation | claude-sonnet-4-20250514 | Per resume (shortlisted only) |
| Skill taxonomy inference (unknown skills) | claude-sonnet-4-20250514 | Per unknown skill batch |
| Embedding pre-filter | all-MiniLM-L6-v2 (local, CPU) | All resumes — effectively $0 |
| Scoring engine | Deterministic Python (rule-based) | All shortlisted resumes |

**No local GPU dependency.** Claude API handles all LLM tasks. The only local model is `all-MiniLM-L6-v2` via `sentence-transformers`, which runs comfortably on CPU in under 100ms for 200 resumes.

### 4.3 Staged Pipeline — Cost Control

**Stage 0 — Embedding Pre-filter (all resumes)**
All resumes are embedded using `all-MiniLM-L6-v2`. The JD is embedded with the same model. Cosine similarity (numpy dot product on L2-normalised vectors) ranks every resume. Bottom 40% receive a pre-filter rejection. No API call is made for these candidates. Cost: $0.

**Stage 1 — Structured Extraction (top 60% only)**
Claude API extracts structured entities from each resume with a Pydantic-enforced output schema. Runs in parallel via FastAPI `BackgroundTasks`. Each extraction prompt is ~2,000 tokens. At 60 resumes from a batch of 100, total extraction cost is approximately $0.30.

**Stage 2 — Deep Matching (top shortlist only)**
The scoring engine is deterministic and free. Claude API is used only for the final top 10 candidates to reason about near-equivalent skills ("Is 'scikit-learn expertise' sufficient for a role requiring 'ML framework proficiency'?"). This is 10 × ~1,000 tokens = $0.05.

**Estimated total cost per job post (100 resumes): ~$2–5 including JD analysis and explainability.**

---

## 5. Agent Specifications

### Agent 0 — Orchestrator

**Type:** Python class with async methods
**Role:** Coordinates all other agents. Contains no AI reasoning logic.

**Responsibilities:**
- Maintain job post session state in SQLite
- Invoke agents in correct sequence with correct inputs
- Handle agent failures: retry up to 2 times, then mark resume as `failed` with error stored
- Write an `agent_trace` record at the start and end of every agent invocation
- Track per-resume status: `queued → embedding → parsing → taxonomy → scoring → explained → done`
- Decide when to surface HR decision points (post-Q&A, post-scoring, new green-tier arrival)

**Does NOT** contain any LLM calls, business logic, or scoring rules. Pure coordination.

**Agent Trace Record (written per invocation):**
```json
{
  "agent": "parser",
  "resume_id": "uuid",
  "started_at": "ISO timestamp",
  "completed_at": "ISO timestamp",
  "latency_ms": 1240,
  "status": "success | retry | failed | partial",
  "input_tokens": 1820,
  "output_tokens": 340,
  "quality_score": 0.91,
  "error": null
}
```

Quality score is agent-specific: parser reports schema completeness (% of fields populated); taxonomy agent reports normalisation coverage (% of skills mapped to canonical form); scoring engine reports skill match coverage (% of required skills found).

---

### Agent 1 — JD Intelligence Agent

**Type:** Claude API call sequence
**LLM:** claude-sonnet-4-20250514
**Runs:** Once per job post, once per HR-triggered edit

**1a. Clarifying Q&A**

Reads the raw JD from HR chat. Identifies missing or ambiguous requirements. Generates one question at a time, each with 4–5 selectable option chips plus a free-text field. Terminates when all must-have fields are populated (experience level, required skills, education, role type) OR when HR types "proceed". Question limit: 6 max regardless of confidence state.

Must-have coverage fields: `min_experience`, `key_skills` (≥3 named), `education_level`, `role_seniority`, `team_context`. If all five are populated, Q&A terminates.

**1b. Criteria Card Generation**

Outputs a structured JSON document:
```json
{
  "must_haves": ["5+ years Python", "AWS experience", "system design"],
  "nice_to_haves": ["Kubernetes", "ML exposure"],
  "dimensions": [
    {"name": "Technical Skills", "weight": 0.45, "description": "..."},
    {"name": "Experience Depth", "weight": 0.30, "description": "..."},
    {"name": "Education", "weight": 0.15, "description": "..."},
    {"name": "Achievements", "weight": 0.10, "description": "..."}
  ],
  "proficiency_rubrics": {
    "Python": {
      "Beginner": "Writes basic scripts; needs guidance",
      "Intermediate": "Builds features independently",
      "Advanced": "Complex systems, code reviews, optimisation",
      "Expert": "Architecture, mentoring, language-level decisions"
    }
  },
  "experience_range": {"min": 5, "max": 10, "unit": "years"},
  "education": {"level": "Bachelor's", "field": "CS or related", "mandatory": false},
  "required_level": "Advanced"
}
```

Saved to `structured_jd` table. Visible and editable by HR in the Criteria Card panel. Dimension weights are enforced to sum to 1.0.

**Note:** The Ideal Candidate Resume feature from v1.0 is cut. It added complexity without improving matching quality.

---

### Agent 2 — Resume Parser Agent

**Type:** Claude API call with Pydantic-enforced output schema
**LLM:** claude-sonnet-4-20250514 (for entity extraction)
**Runs:** Once per resume (after embedding pre-filter)

**2a. Format Detection and Text Extraction**

Format is detected by file extension and MIME type. Extraction strategy is format-specific:

- **PDF:** `pdfplumber` (primary). If extracted text length < 100 characters or contains >30% garbled characters (heuristic: high ratio of non-ASCII or symbol characters), fall back to `PyMuPDF`. If still <100 characters, fall back to `pytesseract` OCR and flag as `ocr_processed: true`.
- **DOCX:** `python-docx` paragraph extraction. Tables are iterated separately and appended as structured text blocks. Header/footer content is included.
- **Plain text (.txt):** Direct string read with UTF-8 decoding, latin-1 fallback.

Multi-column PDF handling: if `pdfplumber` returns text that appears column-interleaved (detected by checking if line widths cluster into two groups using word bounding boxes), use `extract_words()` with bounding box sorting (sort by `(top, x0)`) to reconstruct reading order before passing to the LLM.

**2b. Structured Entity Extraction**

The extracted text is passed to Claude with a Pydantic schema. The model is instructed to return only valid JSON matching the schema, with retry on schema violation (max 2 retries). Fallback to partial extraction if retries exhausted.

Extracted fields:
- `personal`: name, email, phone, location
- `work_history`: list of `{company, title, start, end, duration_months, responsibilities}`
- `education`: list of `{institution, degree, field, year, gpa}`
- `raw_skills`: list of `{skill_name, context_sentence, years_mentioned}`
- `certifications`: list of `{name, issuer, year}`
- `achievements`: list of quantified accomplishments (strings containing numbers)
- `projects`: list of `{name, tech_stack, description}`

**2c. Proficiency Level Assignment**

For each raw skill, assigns one of: `Beginner / Intermediate / Advanced / Expert` using:
- Years of stated experience with that skill
- Seniority of roles where used
- Complexity of described tasks (architecting, leading, reviewing signals Expert/Advanced; "familiar with" signals Beginner)

The proficiency rubrics from the Criteria Card are injected into the extraction prompt as behavioral anchors. Rubrics for skills not in the Criteria Card use generic anchors.

**2d. Red Flag Detection**

Automatically flags (does not auto-reject without reasoning):
- Must-have skills completely absent from the entire resume → `hard_reject` flag
- Employment gaps > 8 months with no stated reason → `gap_flag`
- Claimed skills in summary section absent from all work experience entries → `unsubstantiated_flag`

Resumes with `hard_reject` flags receive instant rejection before scoring. The rejection reason is stored as `rejection_reason` in the `rankings` table for display in the UI.

**Output written to:** `resume_parsed_data` table. Agent 3 reads from here only — never from the file.

---

### Agent 3 — Skill Taxonomy Agent

**Type:** Python class (deterministic) + Claude API (unknown skills only)
**Runs:** After Agent 2 completes for each resume

This agent was a sub-step in v1.0. It is now a standalone agent with its own taxonomy database and trace record.

**3a. Taxonomy Structure**

The taxonomy is stored as a JSON file (`taxonomy.json`) loaded into memory at startup. Structure:

```json
{
  "Python": {
    "canonical": "Python",
    "parent": "Programming Languages",
    "grandparent": "Technical Skills",
    "aliases": ["py", "python3", "python 3.x", "python programming"],
    "implies": ["Object-Oriented Programming", "Scripting"],
    "implies_at_proficiency": {
      "Advanced": ["Software Architecture Patterns"],
      "Expert": ["Language Internals", "Performance Optimisation"]
    }
  },
  "TensorFlow": {
    "canonical": "TensorFlow",
    "parent": "ML Frameworks",
    "grandparent": "Deep Learning",
    "aliases": ["tensorflow 2", "tf", "tf2"],
    "implies": ["Deep Learning", "Python", "Neural Networks"],
    "implies_at_proficiency": {}
  }
}
```

Seed size: 350 skills covering common tech, data, product, and management domains. Seeded from O*NET skill taxonomy and augmented manually.

**3b. Normalisation**

For each raw skill from Agent 2:
1. Exact match against canonical names → resolved immediately
2. Exact match against alias lists → resolved to canonical
3. Case-insensitive and punctuation-stripped match → resolved to canonical
4. No match → classified as `unknown_skill`

All resolved skills are stored in canonical form in `resume_parsed_data.skills_json`.

**3c. Hierarchy Inference**

After resolving all skills, traverse the `implies` field for each resolved skill. If a candidate has TensorFlow (Advanced), they are inferred to have Deep Learning (Intermediate), Python (Intermediate), and Neural Networks (Intermediate) — unless a higher proficiency for those skills was already extracted directly. Inferred skills are stored with `source: "inferred"` to distinguish from directly extracted skills.

**3d. Unknown Skill Handling**

For `unknown_skill` entries, batched and sent to Claude with the prompt: "Classify each of these skills into a parent category and grandparent category from the perspective of a technical recruiter. Return JSON only." The response is used temporarily for scoring but is also written to the `unknown_skills` table for human review and future taxonomy addition. Unknown skills are flagged in the UI with a "⚠ unverified" tag in the candidate detail drawer.

**Output written to:** `resume_parsed_data.skills_json` (updated with canonical forms and inferred skills), `unknown_skills` table.

---

### Agent 4 — Semantic Matching & Scoring Agent

**Type:** Python class (deterministic scoring) + Claude API (top 10 nuanced matching)
**Runs:** After Agent 3 completes for each resume

**4a. Embedding-Based Skill Similarity**

For skills that survived taxonomy normalisation, compute cosine similarity between the candidate's skill embeddings and required skill embeddings from the Criteria Card. Embeddings are pre-computed using `all-MiniLM-L6-v2` and cached in memory per session.

This catches semantic near-matches that the alias map misses: "statistical modelling" and "data analysis" will have high cosine similarity (~0.82) even if the alias lookup fails. Threshold: cosine similarity > 0.75 is treated as a skill match.

**4b. Dimension Scoring**

For each dimension in the Criteria Card, compute a 0–100 score:

- **Technical Skills (default weight: 45%):** For each required skill, compute a match score: direct match = 1.0, inferred match = 0.7, semantic near-match (>0.75 cosine) = 0.6, partial proficiency (delta of -1 from required) = 0.5. Multiply each skill's match score by its importance weight (must-have skills weighted 2x vs. nice-to-haves). Aggregate to a 0–100 dimension score.

- **Experience Depth (default weight: 30%):** Years of relevant experience mapped against the `experience_range` from the Criteria Card. Full score at or above midpoint of the range. Linear interpolation below.

- **Education (default weight: 15%):** Degree level match (exact field match = 100, related field = 70, different field = 30, not stated = 0). If education is marked `mandatory: false` in the Criteria Card, maximum penalty for mismatch is capped at 50.

- **Achievements (default weight: 10%):** Presence and density of quantified accomplishments. 3+ quantified achievements = 100; 1–2 = 60; 0 = 0.

**4c. Weighted Total Score**

```
total_score = Σ (dimension_score × dimension_weight)
```

Score is a float 0.0–100.0. Stored with full dimension breakdown.

**4d. Gap Analysis**

For each required skill where the candidate does not meet the required proficiency level, generate a gap entry:
```json
{
  "skill": "Python",
  "required": "Expert",
  "found": "Advanced",
  "delta": -1,
  "suggestion": "Open-source contributions, system design projects, or mentoring roles bridge Advanced to Expert"
}
```

Suggestions for standard gaps are templated (no LLM needed for this). The `upskilling_suggestions_json` field in `candidate_analysis` stores the full gap list.

**4e. Top-10 Nuanced Matching (Claude API)**

For the final top 10 candidates by score, one Claude API call per candidate asks: "Given this candidate's skill profile and this job's requirements, are there any skills listed under different names that should count as equivalent, or any skills that the candidate's experience implies even if not explicitly stated?" The response is used to adjust the technical skills score if warranted, and the adjustment is logged in `dimension_scores_json.adjustment_reason` for auditability.

**4f. Configurable Matching Threshold**

After all resumes are scored, the Orchestrator analyses the score distribution and suggests tier boundaries. These map to the Green/Yellow/Red tiers visible in the HR dashboard. The boundaries are exposed as a parameter in the API (see Section 6) so external consumers can configure precision vs. recall.

**Output written to:** `rankings` table.

---

### Agent 5 — Explainability Agent

**Type:** Claude API call per candidate
**Runs:** After Agent 4 completes for each shortlisted resume

**5a. Pros Generation**

3–5 bullet points highlighting the candidate's strengths relative to the specific JD. Written in recruiter-friendly plain language. References specific evidence from the resume ("Led 3 backend API redesigns with measurable latency reduction"). Tagged `pro`.

**5b. Cons Generation**

3–5 bullet points stating unmet or underfilled requirements. For each, includes the proficiency delta where applicable ("Python: Advanced found, Expert required — one level short"). For rejected candidates, the primary rejection reason is stated at the top. Tagged `con`.

**5c. Summary Sentence**

One sentence that captures the overall candidate stance. Examples:
- Green: "Strong systems background with 7 years Python and three production deployments — meets all must-haves, slight gap in Kubernetes depth."
- Red: "1 year total experience against a 3-year minimum; system design and AWS both absent from work history."

**5d. Upskilling Paths**

For each skill gap identified by Agent 4, the gap analysis entries (already generated deterministically) are passed to Claude to generate one specific, actionable upskilling suggestion per gap. These are shown in the candidate detail drawer under "Growth Path."

**5e. Comparison Brief**

When HR selects two candidates for side-by-side comparison, Agent 5 generates a 2–3 sentence comparative brief: dimension-by-dimension trade-off framing, no binary recommendation.

**Output written to:** `candidate_analysis` table.

---

## 6. REST API Specification

The API is implemented on top of the existing FastAPI backend. No separate service — the same process serves the HR dashboard and the external API.

All endpoints are prefixed `/api/v1/`. OpenAPI docs available at `/docs` (auto-generated by FastAPI). Auth is via `X-API-Key` header, validated against the `api_keys` table. Rate limiting: 100 requests/minute per key via `slowapi`.

### Endpoints

---

**`POST /api/v1/parse`**

Single resume parsing. Returns a fully structured candidate profile synchronously.

Request: `multipart/form-data` with `file` (PDF, DOCX, or TXT, max 10MB) and optional `job_post_id` (UUID, to use for red flag detection against a specific Criteria Card).

Response (200):
```json
{
  "candidate_id": "uuid",
  "name": "Jane Smith",
  "contact": {"email": "...", "phone": "...", "location": "..."},
  "work_history": [...],
  "education": [...],
  "skills": [
    {
      "skill": "Python",
      "canonical_form": "Python",
      "proficiency": "Advanced",
      "source": "direct",
      "taxonomy_path": "Technical Skills > Programming Languages > Python"
    }
  ],
  "certifications": [...],
  "achievements": [...],
  "red_flags": [...],
  "parse_quality_score": 0.91,
  "file_format": "pdf",
  "ocr_processed": false
}
```

Error responses: `400 Bad Request` (unsupported format), `422 Unprocessable Entity` (parsing failed), `429 Too Many Requests`.

---

**`POST /api/v1/parse/batch`**

Async batch processing. Returns a `job_id` immediately. Processing runs in background.

Request: `multipart/form-data` with `files[]` (array of files, max 50 per batch) and optional `job_post_id`.

Response (202 Accepted):
```json
{
  "job_id": "uuid",
  "file_count": 23,
  "status": "queued",
  "estimated_completion_seconds": 45,
  "webhook_url": null
}
```

If `webhook_url` is provided in the request body, the system will POST the full result to that URL when processing completes.

---

**`GET /api/v1/parse/batch/{job_id}/status`**

Async job tracking.

Response (200):
```json
{
  "job_id": "uuid",
  "status": "processing",
  "total": 23,
  "completed": 14,
  "failed": 1,
  "queued": 8,
  "results_url": "/api/v1/parse/batch/{job_id}/results"
}
```

---

**`GET /api/v1/parse/batch/{job_id}/results`**

Returns the full results array once `status` is `complete`.

Response (200): Array of candidate profiles (same schema as single parse response).

---

**`GET /api/v1/candidates/{candidate_id}/skills`**

Returns the normalised skill profile for a parsed candidate.

Response (200):
```json
{
  "candidate_id": "uuid",
  "skills": [
    {
      "skill": "Python",
      "canonical_form": "Python",
      "proficiency": "Advanced",
      "source": "direct | inferred | semantic_match",
      "taxonomy_path": "Technical Skills > Programming Languages > Python",
      "context": "5 years Python at Acme Corp, led API redesign"
    }
  ],
  "unknown_skills": ["some_emerging_tool"],
  "taxonomy_coverage": 0.94
}
```

---

**`POST /api/v1/match`**

Matches a candidate's skill profile against a job description. Can accept either a `candidate_id` (already parsed) or a raw `job_description` string to match against an already-parsed candidate.

Request body:
```json
{
  "candidate_id": "uuid",
  "job_description": "string (raw JD text)",
  "match_threshold": 0.70,
  "weights": {
    "technical_skills": 0.45,
    "experience_depth": 0.30,
    "education": 0.15,
    "achievements": 0.10
  }
}
```

Response (200):
```json
{
  "candidate_id": "uuid",
  "total_score": 74.3,
  "tier": "yellow",
  "dimension_scores": {
    "technical_skills": 81.0,
    "experience_depth": 70.0,
    "education": 60.0,
    "achievements": 60.0
  },
  "matched_skills": [...],
  "skill_gaps": [...],
  "upskilling_suggestions": [...]
}
```

---

**`GET /api/v1/skills/taxonomy`**

Returns the full taxonomy hierarchy as a nested tree.

Query params: `depth` (1–3, default 2), `domain` (filter by grandparent: `Technical Skills`, `Soft Skills`, etc.)

Response (200): Nested JSON tree of the taxonomy.

---

**`GET /api/v1/skills/taxonomy/search`**

Search the taxonomy by keyword.

Query params: `q` (search string, min 2 chars), `limit` (default 10, max 50)

Response (200):
```json
{
  "results": [
    {
      "canonical": "Kubernetes",
      "aliases": ["k8s", "kube"],
      "parent": "Container Orchestration",
      "grandparent": "DevOps",
      "taxonomy_path": "Technical Skills > DevOps > Container Orchestration > Kubernetes"
    }
  ]
}
```

---

**`GET /api/v1/jobs/{job_id}/traces`**

Returns the full agent execution trace for a job post. Enables observability from any external monitoring tool.

Response (200): Array of `agent_trace` records (see Agent 0 spec) grouped by resume, with per-agent latency, token counts, quality scores, and error messages.

---

**`POST /api/v1/webhooks/register`**

Registers a webhook callback URL for a batch job.

Request: `{ "job_id": "uuid", "callback_url": "https://..." }`
Response (200): `{ "registered": true }`

The system fires a POST to the callback URL with the complete results payload when the batch job completes. The callback receives an `X-Signature` header (HMAC-SHA256 of the payload using the API key as the secret) for verification.

---

### SDK Examples

**Python:**
```python
import requests

API_BASE = "http://localhost:8000/api/v1"
HEADERS = {"X-API-Key": "your-api-key"}

# Parse a single resume
with open("resume.pdf", "rb") as f:
    response = requests.post(
        f"{API_BASE}/parse",
        files={"file": f},
        headers=HEADERS
    )
candidate = response.json()
print(candidate["skills"])

# Match against a job description
match = requests.post(
    f"{API_BASE}/match",
    json={
        "candidate_id": candidate["candidate_id"],
        "job_description": "We need a senior Python engineer with AWS experience...",
        "match_threshold": 0.70
    },
    headers=HEADERS
).json()
print(f"Score: {match['total_score']} — Tier: {match['tier']}")
```

**JavaScript:**
```javascript
const API_BASE = "http://localhost:8000/api/v1";
const HEADERS = { "X-API-Key": "your-api-key" };

// Parse a single resume
const formData = new FormData();
formData.append("file", fileInput.files[0]);

const candidate = await fetch(`${API_BASE}/parse`, {
  method: "POST",
  headers: HEADERS,
  body: formData,
}).then(r => r.json());

// Match against a job description
const match = await fetch(`${API_BASE}/match`, {
  method: "POST",
  headers: { ...HEADERS, "Content-Type": "application/json" },
  body: JSON.stringify({
    candidate_id: candidate.candidate_id,
    job_description: "We need a senior Python engineer...",
    match_threshold: 0.70,
  }),
}).then(r => r.json());

console.log(`Score: ${match.total_score} — Tier: ${match.tier}`);
```

---

## 7. Feature Specifications

### 7.1 Multi-Format Resume Upload

HR can upload resumes in PDF, DOCX, or plain text format, individually or in bulk.

Accepted formats: `.pdf`, `.docx`, `.doc` (converted to docx internally), `.txt`. Max file size: 10MB per file. Max batch: 50 files.

Upload is non-blocking. Files are stored immediately and assigned status `queued`. Processing does not begin until HR confirms the Criteria Card.

Each uploaded file shows a per-file status indicator: `queued / parsing / normalising / scoring / explained / done / failed`.

---

### 7.2 JD Chat Intake

HR types the job description in free-form natural language in a chat interface. No structured form. Agent 1 reads the submission and begins the Q&A phase.

---

### 7.3 Clarifying Q&A

Agent 1 asks up to 6 targeted questions, one at a time. Each question shows 4–5 option chips plus a free-text field. HR can type "proceed" at any time to skip remaining questions and use defaults.

A progress indicator shows "Question 2 of ~5" to set HR expectations. All answers are stored in `structured_jd.qa_log_json`.

---

### 7.4 Criteria Card

Displayed as a collapsible panel in the Job Post Room after Q&A completes.

Shows: scoring dimensions with weight sliders (must sum to 100%, enforced client-side), must-haves vs. nice-to-haves, proficiency rubrics per key skill, experience range, education requirements.

HR can edit all fields. Edits are saved to the DB on every change. If the Criteria Card is edited after resumes have been scored, the system prompts: "Re-score with updated criteria?" and marks existing scores as `stale` until re-scored.

---

### 7.5 Parallel Resume Processing

All queued resumes are processed as background tasks once HR confirms the Criteria Card.

The UI shows a live progress bar updated by polling (`GET /api/v1/jobs/{id}/status`, every 2 seconds): "Processed 47 of 150 resumes." A per-resume status feed below the bar shows each file's current state. HR can browse other parts of the UI while processing runs.

---

### 7.6 Tier Boundary Adjustment

After all resumes are scored, the system suggests Green/Yellow/Red tier boundaries based on natural distribution breaks in the score histogram. HR sees a dual-handle range slider overlaid on the histogram. As sliders move, candidate counts per tier update in real-time.

Default suggested thresholds: Green ≥ 80, Yellow 60–79, Red < 60. HR confirms to lock boundaries.

---

### 7.7 Results Dashboard

Primary HR workspace after processing.

Left panel: Criteria Card (collapsed/expandable). Main panel: Three colour-coded tier sections (Green/Yellow/Red). Each candidate row shows name, match percentage, top 1 pro and 1 con, upload date. Top bar: job title, status badge, totals.

Candidates within each tier are ranked by score (descending). Tier sections are collapsible. Search bar filters by skill ("show only candidates with Python AND AWS" — resolved against canonical skill names).

---

### 7.8 Candidate Detail Drawer

Full breakdown opened by clicking any candidate row.

Content:
- Candidate name, extracted contact info, match score, tier badge
- Dimension score bars (candidate score vs. requirement per dimension)
- Proficiency gap table: Required Level | Candidate Level | Delta
- Pros (green-highlighted, 3–5 bullets)
- Cons (red-highlighted, 3–5 bullets with proficiency delta)
- AI summary sentence
- Growth Path: upskilling suggestions per gap
- Embedded file viewer (original resume, PDF/DOCX rendered via browser iframe)
- Unknown skills flagged with "⚠ unverified" tag
- Quick actions: Move to tier, Add note, Flag for interview

For rejected candidates: rejection reason shown prominently at the top in red before pros/cons.

---

### 7.9 Side-by-Side Comparison

HR selects two candidates (checkbox) and clicks "Compare." Split-view showing both candidates with dimension scores in parallel, proficiency gap tables side by side, pros/cons colour-highlighted, and Agent 5's comparative brief at the bottom.

---

### 7.10 Live Re-ranking

HR can upload additional resumes to a fully processed Job Post Room at any time. New files are processed through the full pipeline. Upon completion, the new candidate is inserted at the correct rank position. Tier boundaries from the original run are applied unless HR requests re-analysis. A banner notification appears if a new candidate lands in the Green tier.

---

### 7.11 Activity Log

Full audit trail per Job Post Room. Entries: `resume_uploaded`, `criteria_edited`, `processing_started`, `candidate_ranked`, `tier_boundary_changed`, `candidate_moved`, `note_added`, `room_closed`. Each entry has timestamp, event type, and plain-language description.

---

## 8. User Flow

### 8.1 New Job Post — Full Flow

```
1.  HR clicks "New Job Post"
2.  HR uploads resumes (multi-format bulk) → files queued, not processed
3.  HR types JD in chat (freeform)
4.  Agent 1 reads JD → begins Q&A
5.  HR answers each question (options or free text)
      └── At any point: HR types "proceed" → Q&A ends immediately
6.  Agent 1 generates Criteria Card → displayed in left panel
7.  HR reviews, edits weights/fields if needed
8.  HR confirms ("looks good, proceed")
9.  Processing begins (parallel background tasks):
      ├── Embedding pre-filter (all resumes) — instant
      ├── Pre-filter rejections written immediately with reason
      ├── Agent 2: multi-format parsing (top 60% only)
      ├── Agent 3: taxonomy normalisation (after Agent 2)
      ├── Agent 4: scoring + gap analysis (after Agent 3)
      └── Agent 5: explainability (after Agent 4)
10. Progress bar shown via 2s polling
11. Processing complete → Tier Boundary Adjustment shown
12. HR adjusts slider → sees live candidate counts
13. HR confirms → Results Dashboard loads
14. HR browses candidates, clicks for detail, uses comparison
15. HR uploads additional resumes anytime → re-ranked live
16. HR closes Room when position is filled
```

### 8.2 API Consumer Flow

```
1.  Consumer obtains API key (issued via dashboard)
2.  POST /api/v1/parse — single resume → structured profile (sync)
       OR
    POST /api/v1/parse/batch — bulk upload → job_id (async)
    GET  /api/v1/parse/batch/{job_id}/status → poll until complete
3.  GET  /api/v1/candidates/{id}/skills → normalised skill profile
4.  POST /api/v1/match — candidate + JD → score, tier, gap analysis
5.  GET  /api/v1/skills/taxonomy/search?q=kubernetes → taxonomy lookup
6.  GET  /api/v1/jobs/{id}/traces → observability data
```

---

## 9. Data Architecture

### 9.1 Core Tables

**`job_posts`**
```
id                  TEXT PRIMARY KEY  (UUID)
title               TEXT
status              TEXT  ('active', 'paused', 'closed')
green_threshold     REAL DEFAULT 80.0
yellow_threshold    REAL DEFAULT 60.0
created_at          TEXT  (ISO datetime)
updated_at          TEXT
```

**`structured_jd`**
```
id                  TEXT PRIMARY KEY  (UUID)
job_post_id         TEXT FK → job_posts.id
raw_jd_text         TEXT
qa_log_json         TEXT  (JSON)
criteria_json       TEXT  (JSON — dimensions, weights, rubrics)
must_haves          TEXT  (JSON)
nice_to_haves       TEXT  (JSON)
version             INTEGER
updated_at          TEXT
```

**`resumes`**
```
id                  TEXT PRIMARY KEY  (UUID)
job_post_id         TEXT FK → job_posts.id
filename            TEXT
file_path           TEXT
file_format         TEXT  ('pdf', 'docx', 'txt')
status              TEXT  ('queued','embedding','parsing','taxonomy',
                           'scoring','explained','rejected','done','failed')
uploaded_at         TEXT
error_message       TEXT  (null unless failed)
```

**`resume_parsed_data`**
```
id                  TEXT PRIMARY KEY  (UUID)
resume_id           TEXT FK → resumes.id
candidate_name      TEXT
contact_json        TEXT  (JSON)
experience_json     TEXT  (JSON)
skills_json         TEXT  (JSON — [{skill, canonical_form, proficiency,
                           source, taxonomy_path, context}])
education_json      TEXT  (JSON)
certifications      TEXT  (JSON)
achievements_json   TEXT  (JSON)
projects_json       TEXT  (JSON)
red_flags_json      TEXT  (JSON — [{type, description, severity}])
embedding_json      TEXT  (JSON — float array, stored as JSON for SQLite)
parse_quality_score REAL
ocr_processed       INTEGER DEFAULT 0  (boolean)
parsed_at           TEXT
```

**`rankings`**
```
id                      TEXT PRIMARY KEY  (UUID)
resume_id               TEXT FK → resumes.id
job_post_id             TEXT FK → job_posts.id
total_score             REAL
tier                    TEXT  ('green','yellow','red','rejected')
rank_position           INTEGER
dimension_scores_json   TEXT  (JSON — per-dimension with adjustment notes)
proficiency_gap_json    TEXT  (JSON — per-skill: required/found/delta)
criteria_version        INTEGER
is_stale                INTEGER DEFAULT 0  (boolean)
last_updated            TEXT
rejection_reason        TEXT  (null unless rejected)
```

**`candidate_analysis`**
```
id                          TEXT PRIMARY KEY  (UUID)
resume_id                   TEXT FK → resumes.id
job_post_id                 TEXT FK → job_posts.id
pros_json                   TEXT  (JSON)
cons_json                   TEXT  (JSON)
summary_sentence            TEXT
upskilling_suggestions_json TEXT  (JSON)
comparison_brief            TEXT  (null until comparison triggered)
generated_at                TEXT
```

**`agent_traces`**
```
id              TEXT PRIMARY KEY  (UUID)
job_post_id     TEXT FK → job_posts.id
resume_id       TEXT  (null for job-level operations)
agent_name      TEXT  ('orchestrator','jd_intelligence','parser',
                       'taxonomy','scorer','explainer')
started_at      TEXT
completed_at    TEXT
latency_ms      INTEGER
status          TEXT  ('success','retry','failed','partial')
input_tokens    INTEGER
output_tokens   INTEGER
quality_score   REAL
error_message   TEXT
```

**`unknown_skills`**
```
id              TEXT PRIMARY KEY  (UUID)
skill_name      TEXT
frequency       INTEGER DEFAULT 1
first_seen_at   TEXT
reviewed        INTEGER DEFAULT 0  (boolean)
suggested_parent TEXT  (Claude's suggested taxonomy placement)
```

**`api_keys`**
```
id              TEXT PRIMARY KEY  (UUID)
key_hash        TEXT  (SHA-256 of actual key — never store plaintext)
label           TEXT
created_at      TEXT
last_used_at    TEXT
is_active       INTEGER DEFAULT 1
```

**`webhook_callbacks`**
```
id              TEXT PRIMARY KEY  (UUID)
job_id          TEXT
callback_url    TEXT
registered_at   TEXT
fired_at        TEXT  (null until fired)
response_status INTEGER  (HTTP status of the callback response)
```

**`activity_log`**
```
id              TEXT PRIMARY KEY  (UUID)
job_post_id     TEXT FK → job_posts.id
event_type      TEXT
description     TEXT
metadata_json   TEXT  (JSON)
created_at      TEXT
```

### 9.2 Key Architectural Rules

Agent 2 writes to `resume_parsed_data`. Agent 3 updates `resume_parsed_data.skills_json` (normalised). Agent 4 reads from `resume_parsed_data` and writes to `rankings`. Agent 5 reads from `rankings` and writes to `candidate_analysis`. No agent reads from another agent's output directly — all communication via DB tables. The Orchestrator sequences them.

Embeddings are stored as JSON float arrays in SQLite (`embedding_json`). Cosine similarity is computed in Python using numpy: `np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))`. At demo scale (≤200 resumes), this is fast enough that no vector database is needed.

---

## 10. Tech Stack

### 10.1 Backend
| Component | Technology | Notes |
|---|---|---|
| API framework | FastAPI | Serves both HR dashboard API and REST API |
| Async processing | FastAPI `BackgroundTasks` | Replaces Celery + Redis entirely |
| LLM | Anthropic Python SDK (Claude Sonnet) | All LLM calls — one provider |
| Structured LLM output | Instructor + Pydantic | Schema enforcement, auto-retry |
| PDF extraction (primary) | pdfplumber | Text-based PDFs |
| PDF extraction (fallback) | PyMuPDF (fitz) | Alternative layouts |
| OCR (scanned PDFs) | pytesseract | Last fallback, flagged in UI |
| DOCX extraction | python-docx | Full paragraph + table support |
| Embeddings | sentence-transformers (all-MiniLM-L6-v2) | CPU-viable, local |
| Vector similarity | numpy | Cosine similarity, no DB needed |
| Rate limiting | slowapi | 100 req/min per API key |
| Input validation | Pydantic v2 | All request/response schemas |

### 10.2 Data
| Component | Technology | Notes |
|---|---|---|
| Database | SQLite | Zero setup, file-based, no Docker dependency |
| ORM | SQLAlchemy 2.0 | Async-compatible |
| Taxonomy | JSON file (taxonomy.json) | Loaded into memory at startup |
| File storage | Local filesystem | `./uploads/` directory |

### 10.3 Frontend
| Component | Technology |
|---|---|
| Framework | React 18 |
| Styling | Tailwind CSS + shadcn/ui |
| HTTP client | fetch / axios |
| Polling | setInterval 2000ms |
| Chat interface | Custom component (shadcn primitives) |
| File viewer | PDF.js / iframe embed |
| Charts | Recharts (score histogram, dimension bars) |
| State management | React Query (server state) + useState (local) |

### 10.4 Infrastructure
| Component | Technology |
|---|---|
| All services | Docker Compose (single machine) |
| Backend server | uvicorn (single process) |
| Frontend dev | Vite + React |
| API docs | FastAPI auto-generated at `/docs` |

**Total Docker services: 2** (backend, frontend). Previously 5 in v1.0 (backend, frontend, PostgreSQL, Redis, Celery worker).

---

## 11. Build Order & Task Allocation

This is a suggested build order optimised for a 24-hour hackathon with Claude Code assistance. Each phase is designed to produce something runnable before the next begins.

### Phase 0 — Project Skeleton (Hours 0–2)
**Owner: Backend (Yug)**

- Scaffold FastAPI project with SQLAlchemy + SQLite
- Define all DB models in `models.py` and call `Base.metadata.create_all()`
- Define all Pydantic schemas in `schemas.py`
- Create stub endpoint handlers (return 501) for all 9 API routes
- Create the Orchestrator class with stub method signatures
- Load `taxonomy.json` at startup

**Deliverable:** Server starts, `/docs` page loads, all endpoints are listed, DB tables exist.

**Claude Code prompt to use:** "Generate a FastAPI project with SQLAlchemy SQLite ORM. Create models for: job_posts, structured_jd, resumes, resume_parsed_data, rankings, candidate_analysis, agent_traces, unknown_skills, api_keys, webhook_callbacks, activity_log. Fields as specified in the PRD data schema section. Use async SQLAlchemy. Include Alembic-free init (create_all on startup)."

---

### Phase 1 — Resume Parser (Hours 2–6)
**Owner: AI/ML (Dirgh) + Backend (Yug)**

- Implement format detection and text extraction (pdfplumber, python-docx, plain text)
- Implement multi-column PDF heuristic (bounding box sort)
- Write Claude API extraction prompt with Pydantic schema
- Implement Instructor wrapper with 2-retry logic
- Implement proficiency assignment logic
- Implement red flag detection
- Wire `POST /api/v1/parse` to full pipeline (sync)
- Test with 5 real resume files in all 3 formats

**Deliverable:** `/api/v1/parse` returns structured candidate profile for PDF, DOCX, and TXT inputs.

---

### Phase 2 — Taxonomy Agent (Hours 4–7, overlapping)
**Owner: AI/ML (Dirgh)**

- Seed `taxonomy.json` with 350 skills (can use Claude to generate bulk entries)
- Implement alias resolution (exact → alias → normalised → unknown)
- Implement hierarchy inference (traverse `implies` array)
- Implement unknown skill batching + Claude classification call
- Wire taxonomy agent to run after Agent 2 and update `skills_json`
- Wire `GET /api/v1/skills/taxonomy` and `GET /api/v1/skills/taxonomy/search`

**Deliverable:** Skills extracted by Agent 2 are resolved to canonical form with taxonomy path. Taxonomy search returns results.

---

### Phase 3 — JD Intelligence Agent + Criteria Card (Hours 4–8, overlapping)
**Owner: Full Stack (Nishil)**

- Implement Agent 1: Q&A generation prompt, confidence check, Criteria Card generation
- Implement must-have coverage tracking (terminate Q&A when all 5 fields populated)
- Store Criteria Card in `structured_jd`
- Build frontend: chat interface, Q&A option chips, Criteria Card panel with editable weight sliders
- Connect frontend to backend via WebSocket or polling

**Deliverable:** HR can type a JD, complete a Q&A, and see a generated Criteria Card with editable weights.

---

### Phase 4 — Scoring + Matching + Explainability (Hours 7–12)
**Owner: AI/ML (Dirgh) + Backend (Yug)**

- Implement embedding pre-filter using sentence-transformers + numpy cosine similarity
- Implement dimension scoring engine (all deterministic Python)
- Implement skill gap analysis with templated upskilling suggestions
- Implement top-10 nuanced matching (Claude API call)
- Implement Agent 5 (Explainability): pros/cons/summary/upskilling Claude call
- Wire `POST /api/v1/match` endpoint
- Wire batch processing via FastAPI `BackgroundTasks`
- Wire `POST /api/v1/parse/batch` and polling status endpoint

**Deliverable:** Full pipeline runs end-to-end for a batch of resumes. `/api/v1/match` returns scores.

---

### Phase 5 — Frontend Dashboard (Hours 8–16, overlapping)
**Owner: Frontend (Rachit + Kavan)**

- Build Job Post Room layout: left panel (Criteria Card) + main panel (results)
- Build candidate list with Green/Yellow/Red tier sections and sorting
- Build tier boundary slider with histogram using Recharts
- Build Candidate Detail Drawer: score bars, gap table, pros/cons, upskilling paths, file viewer
- Build Side-by-Side Comparison view
- Build progress bar with 2s polling
- Build Activity Log panel
- Connect all frontend to backend API

**Deliverable:** Full HR-facing dashboard functional end-to-end with real data.

---

### Phase 6 — API Layer Polish + Observability (Hours 14–18)
**Owner: Backend (Yug)**

- Implement API key auth middleware
- Implement slowapi rate limiting
- Implement webhook callback firing logic
- Implement HMAC-SHA256 signature generation
- Wire `GET /api/v1/jobs/{id}/traces` with formatted response
- Verify all OpenAPI schema descriptions are accurate
- Test all 9 endpoints with Postman/curl

**Deliverable:** All API endpoints work with authentication. Traces endpoint returns per-agent observability data.

---

### Phase 7 — Demo Data + Polish (Hours 18–22)
**Owner: All**

- Generate 3 pre-loaded Job Post Rooms (Senior Backend Engineer, Product Designer, Sales Manager)
- Generate 15 dummy resumes per room in varied formats and quality levels (Claude Code can generate these)
- Set each room at a different pipeline stage for demo flow variety
- Test the full demo script end-to-end
- Fix any UI/UX issues found during demo rehearsal
- Prepare the live demo room for the "created from scratch" demo segment

---

### Phase 8 — Presentation (Hours 22–24)
**Owner: Rachit (lead)**

Prepare 5-minute presentation covering: problem, architecture diagram, live demo, API demo (curl/Postman), research backing, and differentiation from existing tools. The live demo should show: full intake → criteria → processing → tiered results → candidate detail → comparison → API call.

---

## 12. Non-Functional Requirements

**Performance**
- Embedding pre-filter (200 resumes): < 1 second on CPU
- Text extraction per resume: < 3 seconds
- Claude API extraction per resume: < 10 seconds (Sonnet)
- Total processing for 50 resumes: < 8 minutes (sequential background tasks)
- Dashboard initial load: < 2 seconds
- Polling response: < 200ms

**Reliability**
- If a single resume fails, the pipeline continues for all others — no batch abort
- Failed resumes show error type in UI and remain in `failed` status for HR visibility
- Agent failures: retry up to 2 times. After 2 failures, mark `failed`, log error, continue batch
- Partial extraction (some fields populated) is returned rather than total failure where possible

**Data Integrity**
- All agent communication via DB tables — no in-memory shared state between agents
- Criteria Card edits increment `version` on `structured_jd`
- Scoring records carry `criteria_version` — stale records are flagged if criteria change
- API keys are stored as SHA-256 hashes — plaintext never persists

**Hackathon Constraints**
- No authentication or user management for the HR dashboard (single-user prototype)
- No multi-tenancy
- SQLite file stored at `./data/talent_ai.db`
- All uploads stored at `./uploads/`
- Single-machine Docker Compose deployment

---

## 13. Demo Scope

### 13.1 In Scope for Hackathon Demo

| Feature | Priority | Status Target |
|---|---|---|
| Multi-format upload (PDF, DOCX, TXT) | P0 | Required |
| JD chat intake | P0 | Required |
| Clarifying Q&A with option chips | P0 | Required |
| Criteria Card display + edit | P0 | Required |
| Parallel processing with progress bar | P0 | Required |
| Embedding pre-filter (instant rejection) | P0 | Required |
| Red flag detection + fast rejection | P0 | Required |
| Skill taxonomy normalisation | P0 | Required |
| Dimension scoring + proficiency gap | P0 | Required |
| Green/Yellow/Red tiered results | P0 | Required |
| Tier boundary slider + live counts | P0 | Required |
| Candidate detail drawer (pros/cons/upskilling) | P0 | Required |
| REST API: parse, batch, match, taxonomy | P0 | Required |
| API key auth + rate limiting | P0 | Required |
| OpenAPI docs at /docs | P0 | Required |
| Agent execution traces (observability) | P0 | Required |
| Side-by-side comparison | P1 | High value |
| Live re-ranking (new resume uploads) | P1 | High value |
| Activity log | P1 | High value |
| Webhook callbacks | P1 | High value |
| Taxonomy search endpoint | P1 | High value |
| Export (PDF/CSV) | P2 | Nice to have |
| Duplicate detection | P2 | Nice to have |

### 13.2 Demo Configuration

**Pre-loaded rooms (3):**
- Senior Backend Engineer — fully processed, all tiers populated
- Product Designer — at tier boundary adjustment screen
- Sales Manager — processing in progress (demonstrating the progress bar)

**Live demo room:** Created from scratch during the demo. HR types a JD for a "Junior Data Scientist" role, completes Q&A, confirms Criteria Card, watches processing, reviews results.

**Resume set:** 15 resumes per room. 5 in each format (PDF, DOCX, TXT) per room. Varied quality levels: 4 strong candidates, 6 average, 5 clearly unsuitable. Generated using Claude to ensure consistent structure while covering different skill profiles.

**API demo:** Show `POST /api/v1/parse` with a DOCX file and display the structured JSON response. Then show `POST /api/v1/match` with the candidate ID and a JD string. Then show `GET /api/v1/skills/taxonomy/search?q=python`. Then show `GET /api/v1/jobs/{id}/traces` to demonstrate observability.

---

## 14. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Claude API rate limits during batch processing | Medium | Process resumes with a 0.5s delay between API calls. At demo scale (50 resumes, 60% shortlisted = 30 LLM calls), this is under 2 minutes total and well within rate limits |
| Multi-column PDF text extraction failure | Medium | pdfplumber bounding-box sort handles most cases. Flag in UI as "complex layout" if extraction quality score < 0.6. Pytesseract OCR as final fallback |
| Taxonomy JSON not covering a key skill in the demo | Medium | Pre-generate taxonomy to cover all skills present in demo resumes. Unknown skills are handled gracefully (Claude classifies them, they appear in UI with "⚠ unverified" tag) |
| SQLite concurrency during parallel background tasks | Low | FastAPI BackgroundTasks run in the same process. Use SQLAlchemy connection pooling with check_same_thread=False. For hackathon scale this is fine |
| Pydantic schema extraction failure (Claude returns malformed JSON) | Low | Instructor enforces schema with 2 auto-retries. Fallback to partial extraction. Demo resumes are pre-tested to ensure clean extraction |
| all-MiniLM-L6-v2 download at demo time | Low | Pre-download model in Docker build step (`RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"`) |
| Demo environment has no internet access | Low | All external dependencies are pulled at Docker build time. Claude API key is the only runtime network dependency — confirm venue has internet |

---

## 15. Out of Scope

The following are explicitly not built for the prototype:

- Authentication / login for the HR dashboard
- Candidate-facing portal
- Multi-user / collaborative access
- GDPR / data compliance (dummy data only, no real PII)
- Email or calendar integration
- Mobile responsiveness (desktop browser only)
- Internationalisation / multilingual support
- Job board integrations (LinkedIn, Indeed, ATS sync)
- Paid cloud infrastructure
- Feedback loop / model fine-tuning from HR ratings
- Analytics dashboard across multiple job posts
- Published npm/PyPI SDKs (code examples in `/docs` are sufficient)

---

## 16. Glossary

| Term | Definition |
|---|---|
| **Job Post Room** | A persistent session tied to one job post. Contains the JD, Criteria Card, all resumes, ranked list, and activity log. Lives until HR closes it. |
| **Criteria Card** | The structured output of Agent 1. Contains scoring dimensions with weights, must-haves, nice-to-haves, proficiency rubrics, experience range, and education requirements. Visible and editable by HR. |
| **Staged Hybrid Pipeline** | The three-stage architecture: embedding pre-filter (all resumes, free) → LLM extraction (top 60%, cheap) → deep matching (top 10, nuanced). Cost scales with resume quality, not volume. |
| **Proficiency Level** | One of: Beginner / Intermediate / Advanced / Expert. Assigned per skill using Dreyfus-aligned behavioural rubrics generated from each JD by Agent 1. |
| **Proficiency Delta** | The difference between required and found proficiency levels. "Required: Expert | Found: Advanced | Delta: -1". Shown in the gap table in the candidate detail drawer. |
| **Canonical Skill Form** | The standardised name for a skill after alias resolution. "ReactJS", "React.js", "React 18" all resolve to "React". Stored consistently across all DB fields. |
| **Taxonomy Path** | The full hierarchical path of a skill: "Technical Skills > Programming Languages > Python". Used for browsing and search in the taxonomy API. |
| **Inferred Skill** | A skill added to a candidate's profile through taxonomy hierarchy traversal. If a candidate has TensorFlow (Advanced), Deep Learning (Intermediate) is inferred. Stored with `source: "inferred"`. |
| **Tier Boundary** | The score thresholds separating Green, Yellow, and Red tiers. Suggested by the system based on score distribution; adjusted by HR via slider before results finalise. |
| **Red Flag** | A hard signal detected during parsing: must-have skill completely absent, extreme employment gaps, skills claimed but absent from all work experience entries. |
| **Fast-path Rejection** | Rejection that occurs during Stage 0 (embedding pre-filter) or during Agent 2 red flag detection, before full scoring runs. Reason stored and shown to HR. |
| **Agent Trace** | A record written by the Orchestrator for every agent invocation: start/end timestamps, latency, token counts, quality score, status, and error message. Enables full observability. |
| **Upskilling Suggestion** | For each skill gap (required level not met), one specific and actionable suggestion for how the candidate could bridge the gap. Shown in the candidate detail drawer under "Growth Path". |
| **Pre-filter Rejection** | Candidates in the bottom 40% by cosine similarity to the JD embedding. Rejected before any LLM call. Reason shown as "Low semantic relevance to job requirements". |
| **Unknown Skill** | A skill extracted from a resume that has no entry in the taxonomy JSON. Sent to Claude for classification, stored in `unknown_skills` table for human review, shown in UI with "⚠ unverified" tag. |
| **Comparison Brief** | A 2–3 sentence comparative summary generated by Agent 5 when HR selects two candidates for side-by-side comparison. States the key trade-off without issuing a binary recommendation. |

---

*End of Document*

**Multi-Agent Talent AI — PRD v2.0**
**Team Innovators — Tic Tech Toe '26 — IEEE × DAIICT**
