"""Parse router — resume parsing endpoints."""

import json
import os
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import Resume, JobPost, ResumeParsedData, Ranking, CandidateAnalysis
from agents.orchestrator import Orchestrator

router = APIRouter(prefix="/api/v1/parse", tags=["Parse"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

orchestrator = Orchestrator()


def _get_format(filename: str) -> str | None:
    """Return normalized format string or None if unsupported."""
    ext = os.path.splitext(filename)[1].lower()
    if ext == ".pdf":
        return "pdf"
    if ext in (".doc", ".docx"):
        return "docx"
    if ext == ".txt":
        return "txt"
    return None


@router.post("/")
async def parse_single_resume(
    file: UploadFile,
    job_post_id: str | None = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
):
    fmt = _get_format(file.filename or "")
    if not fmt:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.filename}")

    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit")

    file_id = str(uuid4())
    safe_name = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as f:
        f.write(contents)

    job_id = job_post_id or "unassigned"

    # Ensure JobPost exists
    job_post = await db.get(JobPost, job_id)
    if not job_post:
        job_post = JobPost(id=job_id, title=f"Job {job_id}")
        db.add(job_post)
        await db.flush()

    resume = Resume(
        id=file_id,
        job_post_id=job_id,
        filename=file.filename or "unknown",
        file_path=file_path,
        file_format=fmt,
        status="queued",
    )
    db.add(resume)
    await db.flush()

    # Launch pipeline as background task
    background_tasks.add_task(orchestrator.run_pipeline, file_id, job_id)

    return {
        "id": file_id,
        "name": file.filename,
        "size": len(contents),
        "format": fmt,
        "status": "queued",
    }


@router.post("/batch")
async def parse_batch(
    files: list[UploadFile],
    job_post_id: str | None = None,
    webhook_url: str | None = None,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Ensure JobPost exists (auto-create for dev convenience)
    job_id = job_post_id or "unassigned"
    job_post = await db.get(JobPost, job_id)
    if not job_post:
        job_post = JobPost(id=job_id, title=f"Job {job_id}")
        db.add(job_post)
        await db.flush()

    results = []
    for file in files:
        fmt = _get_format(file.filename or "")
        if not fmt:
            results.append({
                "name": file.filename,
                "size": 0,
                "format": "unknown",
                "status": "error",
                "error": f"Unsupported file type",
            })
            continue

        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            results.append({
                "name": file.filename,
                "size": len(contents),
                "format": fmt,
                "status": "error",
                "error": "File exceeds 10MB limit",
            })
            continue

        file_id = str(uuid4())
        safe_name = f"{file_id}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_name)

        with open(file_path, "wb") as f:
            f.write(contents)

        resume = Resume(
            id=file_id,
            job_post_id=job_id,
            filename=file.filename or "unknown",
            file_path=file_path,
            file_format=fmt,
            status="queued",
        )
        db.add(resume)

        # Launch pipeline as background task for each resume
        background_tasks.add_task(orchestrator.run_pipeline, file_id, job_id)

        results.append({
            "name": file.filename,
            "size": len(contents),
            "format": fmt,
            "status": "queued",
        })

    await db.flush()
    return results


@router.get("/{job_id}/status")
async def get_batch_status(job_id: str, db: AsyncSession = Depends(get_db)):
    """Return real status counts for all resumes belonging to job_id."""
    # Count totals
    total_query = select(func.count()).select_from(Resume).where(Resume.job_post_id == job_id)
    total_res = await db.execute(total_query)
    total = total_res.scalar() or 0

    if total == 0:
        return {"status": "pending", "total": 0, "completed": 0, "failed": 0, "queued": 0}

    # Count by status
    status_counts = {}
    for status_val in ["queued", "parsing", "taxonomy", "scoring", "done", "failed"]:
        q = select(func.count()).select_from(Resume).where(
            Resume.job_post_id == job_id, Resume.status == status_val
        )
        r = await db.execute(q)
        status_counts[status_val] = r.scalar() or 0

    completed = status_counts["done"]
    failed = status_counts["failed"]
    queued = status_counts["queued"]
    processing = status_counts["parsing"] + status_counts["taxonomy"] + status_counts["scoring"]

    if completed + failed == total:
        overall_status = "complete"
    elif processing > 0 or queued < total:
        overall_status = "processing"
    else:
        overall_status = "pending"

    return {
        "status": overall_status,
        "total": total,
        "completed": completed,
        "failed": failed,
        "queued": queued,
        "processing": processing,
    }


@router.get("/{job_id}/results")
async def get_batch_results(job_id: str, db: AsyncSession = Depends(get_db)):
    """Return parsed + ranked candidates for all resumes belonging to job_id."""
    # Query resumes with parsed data and rankings
    query = (
        select(Resume, ResumeParsedData, Ranking, CandidateAnalysis)
        .outerjoin(ResumeParsedData, Resume.id == ResumeParsedData.resume_id)
        .outerjoin(Ranking, Resume.id == Ranking.resume_id)
        .outerjoin(CandidateAnalysis, Resume.id == CandidateAnalysis.resume_id)
        .where(Resume.job_post_id == job_id)
    )
    result = await db.execute(query)
    rows = result.all()

    if not rows:
        return {"candidates": [], "total": 0}

    candidates = []
    for resume, parsed, ranking, analysis in rows:
        candidate = {
            "resume_id": resume.id,
            "filename": resume.filename,
            "status": resume.status,
            "name": parsed.candidate_name if parsed else None,
            "email": None,
            "total_score": ranking.total_score if ranking else None,
            "tier": ranking.tier if ranking else None,
            "dimension_scores": None,
            "skills": [],
            "red_flags": [],
            "pros": [],
            "cons": [],
            "summary": None,
        }

        if parsed:
            # Extract email from contact_json
            if parsed.contact_json:
                try:
                    contact = json.loads(parsed.contact_json)
                    candidate["email"] = contact.get("email")
                except (json.JSONDecodeError, TypeError):
                    pass

            # Extract skills
            if parsed.skills_json:
                try:
                    candidate["skills"] = json.loads(parsed.skills_json)
                except (json.JSONDecodeError, TypeError):
                    pass

            # Extract red flags
            if parsed.red_flags_json:
                try:
                    candidate["red_flags"] = json.loads(parsed.red_flags_json)
                except (json.JSONDecodeError, TypeError):
                    pass

        if ranking:
            if ranking.dimension_scores_json:
                try:
                    candidate["dimension_scores"] = json.loads(ranking.dimension_scores_json)
                except (json.JSONDecodeError, TypeError):
                    pass

        if analysis:
            if analysis.pros_json:
                try:
                    candidate["pros"] = json.loads(analysis.pros_json)
                except (json.JSONDecodeError, TypeError):
                    pass
            if analysis.cons_json:
                try:
                    candidate["cons"] = json.loads(analysis.cons_json)
                except (json.JSONDecodeError, TypeError):
                    pass
            candidate["summary"] = analysis.summary_sentence

        candidates.append(candidate)

    # Sort by score descending
    candidates.sort(key=lambda c: c["total_score"] or 0, reverse=True)

    return {"candidates": candidates, "total": len(candidates)}
