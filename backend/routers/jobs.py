"""Jobs router — job post management endpoints."""

import json
import os
import random
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import Ranking, JobPost, Resume, StructuredJD, AgentTrace

from schemas import CriteriaCardUpdate, JobPostCreate, TierBoundaryUpdate

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])


# ---------------------------------------------------------------------------
# POST / — Create a new job post
# ---------------------------------------------------------------------------

@router.post("/")
async def create_job_post(body: JobPostCreate, db: AsyncSession = Depends(get_db)):
    job_id = str(uuid4())
    job = JobPost(
        id=job_id,
        title=body.title,
    )
    db.add(job)
    await db.flush()
    return {
        "job_id": job_id,
        "title": job.title,
        "status": job.status,
        "created_at": job.created_at.isoformat() if job.created_at else None,
    }


# ---------------------------------------------------------------------------
# GET / — List all job posts
# ---------------------------------------------------------------------------

@router.get("/")
async def list_job_posts(db: AsyncSession = Depends(get_db)):
    query = select(JobPost).order_by(JobPost.created_at.desc())
    result = await db.execute(query)
    jobs = result.scalars().all()

    job_list = []
    for job in jobs:
        # Count resumes for this job
        count_q = select(func.count()).select_from(Resume).where(Resume.job_post_id == job.id)
        count_res = await db.execute(count_q)
        resume_count = count_res.scalar() or 0

        job_list.append({
            "job_id": job.id,
            "title": job.title,
            "status": job.status,
            "resume_count": resume_count,
            "created_at": job.created_at.isoformat() if job.created_at else None,
        })

    return job_list


# ---------------------------------------------------------------------------
# GET /{job_id} — Get full job detail
# ---------------------------------------------------------------------------

@router.get("/{job_id}")
async def get_job_post(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Resume count
    count_q = select(func.count()).select_from(Resume).where(Resume.job_post_id == job_id)
    count_res = await db.execute(count_q)
    resume_count = count_res.scalar() or 0

    # Tier counts
    tier_counts = {"green": 0, "yellow": 0, "red": 0, "rejected": 0}
    for tier_val in tier_counts:
        tq = select(func.count()).select_from(Ranking).where(
            Ranking.job_post_id == job_id, Ranking.tier == tier_val
        )
        tr = await db.execute(tq)
        tier_counts[tier_val] = tr.scalar() or 0

    # Criteria card
    criteria_card = None
    jd_query = select(StructuredJD).where(StructuredJD.job_post_id == job_id)
    jd_res = await db.execute(jd_query)
    structured_jd = jd_res.scalar()
    if structured_jd and structured_jd.criteria_json:
        try:
            criteria_card = json.loads(structured_jd.criteria_json)
        except (json.JSONDecodeError, TypeError):
            pass

    return {
        "job_id": job.id,
        "title": job.title,
        "status": job.status,
        "green_threshold": job.green_threshold,
        "yellow_threshold": job.yellow_threshold,
        "resume_count": resume_count,
        "tier_counts": tier_counts,
        "criteria_card": criteria_card,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
    }


# ---------------------------------------------------------------------------
# PATCH /{job_id}/criteria — Update criteria card
# ---------------------------------------------------------------------------

@router.patch("/{job_id}/criteria")
async def update_criteria_card(job_id: str, body: CriteriaCardUpdate, db: AsyncSession = Depends(get_db)):
    job = await db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Find or create StructuredJD
    jd_query = select(StructuredJD).where(StructuredJD.job_post_id == job_id)
    jd_res = await db.execute(jd_query)
    structured_jd = jd_res.scalar()

    update_data = body.model_dump(exclude_none=True)

    if structured_jd:
        # Merge with existing
        existing = {}
        if structured_jd.criteria_json:
            try:
                existing = json.loads(structured_jd.criteria_json)
            except (json.JSONDecodeError, TypeError):
                pass
        existing.update(update_data)
        structured_jd.criteria_json = json.dumps(existing)

        if body.must_haves is not None:
            structured_jd.must_haves = json.dumps(body.must_haves)
        if body.nice_to_haves is not None:
            structured_jd.nice_to_haves = json.dumps(body.nice_to_haves)

        structured_jd.version += 1
        db.add(structured_jd)
    else:
        structured_jd = StructuredJD(
            job_post_id=job_id,
            criteria_json=json.dumps(update_data),
            must_haves=json.dumps(body.must_haves) if body.must_haves else None,
            nice_to_haves=json.dumps(body.nice_to_haves) if body.nice_to_haves else None,
            version=1,
        )
        db.add(structured_jd)

    await db.flush()
    return {"status": "ok", "version": structured_jd.version}


# ---------------------------------------------------------------------------
# PATCH /{job_id}/thresholds — Update tier boundaries
# ---------------------------------------------------------------------------

@router.patch("/{job_id}/thresholds")
async def update_tier_thresholds(job_id: str, body: TierBoundaryUpdate, db: AsyncSession = Depends(get_db)):
    job = await db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.green_threshold = body.green_threshold
    job.yellow_threshold = body.yellow_threshold
    db.add(job)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# GET /{job_id}/rankings — Get ranked candidates
# ---------------------------------------------------------------------------

@router.get("/{job_id}/rankings")
async def get_rankings(job_id: str, db: AsyncSession = Depends(get_db)):
    query = select(Ranking).where(Ranking.job_post_id == job_id)
    res = await db.execute(query)
    rankings = res.scalars().all()

    # If no rankings exist, generate demo data for the chart
    if not rankings:
        res_query = select(Resume).where(Resume.job_post_id == job_id)
        res_res = await db.execute(res_query)
        resumes = res_res.scalars().all()

        if not resumes:
            return [
                {"candidate_id": f"c-{i}", "name": f"Candidate {i}", "score": random.randint(10, 95)}
                for i in range(25)
            ]

        results = []
        for r in resumes:
            score = random.randint(30, 98)
            new_rank = Ranking(
                resume_id=r.id,
                job_post_id=job_id,
                total_score=score,
            )
            db.add(new_rank)
            results.append({
                "candidate_id": r.id,
                "name": r.filename,
                "score": score
            })
        await db.flush()
        return results

    return [
        {"candidate_id": r.resume_id, "score": r.total_score, "tier": r.tier}
        for r in rankings
    ]


# ---------------------------------------------------------------------------
# GET /{job_id}/traces — Get agent traces
# ---------------------------------------------------------------------------

@router.get("/{job_id}/traces")
async def get_agent_traces(job_id: str, db: AsyncSession = Depends(get_db)):
    query = (
        select(AgentTrace)
        .where(AgentTrace.job_post_id == job_id)
        .order_by(AgentTrace.started_at.desc())
    )
    result = await db.execute(query)
    traces = result.scalars().all()

    return [
        {
            "id": t.id,
            "agent_name": t.agent_name,
            "resume_id": t.resume_id,
            "started_at": t.started_at.isoformat() if t.started_at else None,
            "completed_at": t.completed_at.isoformat() if t.completed_at else None,
            "latency_ms": t.latency_ms,
            "status": t.status,
            "input_tokens": t.input_tokens,
            "output_tokens": t.output_tokens,
            "quality_score": t.quality_score,
            "error_message": t.error_message,
        }
        for t in traces
    ]


# ---------------------------------------------------------------------------
# POST /{job_id}/jd-chat — JD intake chat
# ---------------------------------------------------------------------------

JD_INTAKE_SYSTEM_PROMPT = """You are an AI JD Intake Assistant for a recruitment platform. Your job is to help HR managers define clear evaluation criteria for a job opening.

When the user provides a job description or role info, you must identify which of these 5 fields are still missing or unclear:
1. min_experience — minimum years of experience required
2. key_skills — the most important technical skills (at least 3)
3. education_level — minimum education requirement
4. role_seniority — junior / mid / senior / lead / principal
5. team_context — team size, reporting structure, or domain

CONVERSATION RULES:
- If ANY of the 5 fields above are missing or unclear, ask ONE clarifying question at a time
- Provide 3-4 concrete option chips with each question to make it easy to answer
- After 5-6 questions OR when all fields are populated, generate the final criteria card
- If the user types "proceed" or "skip", immediately generate the criteria card with best guesses

RESPONSE FORMAT — you must return valid JSON in exactly one of these two formats:

Format A (asking a question):
{"type": "question", "question": {"question": "your question text", "options": ["Option 1", "Option 2", "Option 3", "Option 4"]}, "question_number": N}

Format B (final criteria card):
{"type": "criteria_card", "criteria_card": {"role_name": "...", "must_haves": ["skill1", "skill2"], "nice_to_haves": ["skill3"], "weights": {"Technical Skills": "45%", "Experience": "30%", "Education": "15%", "Achievements": "10%"}, "dimensions": [{"name": "Technical Skills", "weight": 0.45, "description": "..."}, {"name": "Experience Depth", "weight": 0.30, "description": "..."}, {"name": "Education", "weight": 0.15, "description": "..."}, {"name": "Achievements", "weight": 0.10, "description": "..."}], "proficiency_rubrics": {}, "experience_range": {"min": 2, "max": 8, "unit": "years"}, "education": {"level": "Bachelor's", "field": "Computer Science or related", "mandatory": false}}}

Return ONLY the JSON object, no markdown, no explanation."""


@router.post("/{job_id}/jd-chat")
async def send_jd_chat_message(job_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    message = body.get("message", "")
    qa_log = body.get("qa_log", [])
    question_number = body.get("question_number", 0)

    if not message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Ensure job exists
    job = await db.get(JobPost, job_id)
    if not job:
        job = JobPost(id=job_id, title=f"Job {job_id}")
        db.add(job)
        await db.flush()

    # Load chat history
    chat_history = []
    if job.jd_chat_history_json:
        try:
            chat_history = json.loads(job.jd_chat_history_json)
        except (json.JSONDecodeError, TypeError):
            pass

    # Add user message to history
    chat_history.append({"role": "user", "content": message})

    # Build messages for the LLM
    llm_messages = [{"role": "system", "content": JD_INTAKE_SYSTEM_PROMPT}]

    # Add conversation context
    context = f"Question number: {question_number}\n"
    if qa_log:
        context += "Previous Q&A:\n"
        for qa in qa_log:
            context += f"Q: {qa['question']}\nA: {qa['answer']}\n"
    context += f"\nUser message: {message}"

    llm_messages.append({"role": "user", "content": context})

    try:
        # Try Groq first (it's already configured)
        from groq import Groq
        groq_key = os.getenv("GROQ_API_KEY")

        if groq_key:
            client = Groq(api_key=groq_key)
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=llm_messages,
                temperature=0.7,
                max_tokens=2000,
            )
            assistant_content = response.choices[0].message.content.strip()
        else:
            raise ValueError("No API key available")

        # Parse the JSON response
        # Strip markdown code fences if present
        if assistant_content.startswith("```"):
            lines = assistant_content.split("\n")
            assistant_content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        result = json.loads(assistant_content)

        # Save chat history
        chat_history.append({"role": "assistant", "content": assistant_content})
        job.jd_chat_history_json = json.dumps(chat_history)
        db.add(job)
        await db.flush()

        return result

    except json.JSONDecodeError:
        # If LLM returns non-JSON, wrap it as an assistant message
        chat_history.append({"role": "assistant", "content": assistant_content})
        job.jd_chat_history_json = json.dumps(chat_history)
        db.add(job)
        await db.flush()
        return {"type": "assistant", "text": assistant_content}

    except Exception as e:
        # Fallback: generate a simple question without LLM
        import logging
        logging.warning("JD chat LLM call failed: %s — using fallback", e)

        fallback_questions = [
            {
                "type": "question",
                "question": {
                    "question": "What seniority level is this role?",
                    "options": ["Junior (0-2 yrs)", "Mid-level (2-5 yrs)", "Senior (5-8 yrs)", "Lead/Principal (8+ yrs)"]
                },
                "question_number": 1
            },
            {
                "type": "question",
                "question": {
                    "question": "What are the top 3 must-have technical skills?",
                    "options": ["Python", "JavaScript/React", "Cloud (AWS/GCP)", "Machine Learning"]
                },
                "question_number": 2
            },
            {
                "type": "question",
                "question": {
                    "question": "What education level is required?",
                    "options": ["No requirement", "Bachelor's degree", "Master's degree", "PhD"]
                },
                "question_number": 3
            },
            {
                "type": "question",
                "question": {
                    "question": "What's the team context?",
                    "options": ["Small startup (2-5)", "Growth team (5-15)", "Large org (15+)", "Individual contributor"]
                },
                "question_number": 4
            },
        ]

        if question_number < len(fallback_questions):
            result = fallback_questions[question_number]
        else:
            # Generate criteria card from what we have
            result = {
                "type": "criteria_card",
                "criteria_card": {
                    "role_name": job.title or "Software Engineer",
                    "must_haves": ["Python", "Problem Solving", "Communication"],
                    "nice_to_haves": ["Cloud experience", "CI/CD", "Agile"],
                    "weights": {
                        "Technical Skills": "45%",
                        "Experience": "30%",
                        "Education": "15%",
                        "Achievements": "10%",
                    },
                    "dimensions": [
                        {"name": "Technical Skills", "weight": 0.45, "description": "Core technical competencies"},
                        {"name": "Experience Depth", "weight": 0.30, "description": "Relevant work experience"},
                        {"name": "Education", "weight": 0.15, "description": "Academic qualifications"},
                        {"name": "Achievements", "weight": 0.10, "description": "Quantifiable achievements"},
                    ],
                    "proficiency_rubrics": {},
                    "experience_range": {"min": 2, "max": 8, "unit": "years"},
                    "education": {"level": "Bachelor's", "field": "Computer Science or related", "mandatory": False},
                },
            }

        chat_history.append({"role": "assistant", "content": json.dumps(result)})
        job.jd_chat_history_json = json.dumps(chat_history)
        db.add(job)
        await db.flush()

        return result


# ---------------------------------------------------------------------------
# POST /{job_id}/confirm — Confirm criteria card
# ---------------------------------------------------------------------------

@router.post("/{job_id}/confirm")
async def confirm_criteria(job_id: str, body: dict = {}, db: AsyncSession = Depends(get_db)):
    job = await db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    criteria_card = body.get("criteria_card", {})

    # Find or create StructuredJD
    jd_query = select(StructuredJD).where(StructuredJD.job_post_id == job_id)
    jd_res = await db.execute(jd_query)
    structured_jd = jd_res.scalar()

    if structured_jd:
        structured_jd.criteria_json = json.dumps(criteria_card)
        if criteria_card.get("must_haves"):
            structured_jd.must_haves = json.dumps(criteria_card["must_haves"])
        if criteria_card.get("nice_to_haves"):
            structured_jd.nice_to_haves = json.dumps(criteria_card["nice_to_haves"])
        structured_jd.version += 1
        db.add(structured_jd)
    else:
        structured_jd = StructuredJD(
            job_post_id=job_id,
            criteria_json=json.dumps(criteria_card),
            must_haves=json.dumps(criteria_card.get("must_haves", [])),
            nice_to_haves=json.dumps(criteria_card.get("nice_to_haves", [])),
            version=1,
        )
        db.add(structured_jd)

    await db.flush()

    return {
        "status": "confirmed",
        "criteria_card": criteria_card,
        "version": structured_jd.version,
    }


# ---------------------------------------------------------------------------
# POST /{job_id}/close — Close a job post
# ---------------------------------------------------------------------------

@router.post("/{job_id}/close")
async def close_job_post(job_id: str, db: AsyncSession = Depends(get_db)):
    job = await db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = "closed"
    db.add(job)
    await db.flush()
    return {"status": "closed", "job_id": job_id}
