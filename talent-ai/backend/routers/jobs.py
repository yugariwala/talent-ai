"""
Jobs router — CRUD endpoints for Job Posts
GET  /api/v1/jobs/         → list all jobs
POST /api/v1/jobs/         → create a new job
GET  /api/v1/jobs/{job_id} → get a single job with activity_log
"""

import json
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Job

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])


# ── Pydantic schemas ─────────────────────────────────────────────────
class JobCreate(BaseModel):
    title: str
    criteria: Optional[dict] = {}


class JobResponse(BaseModel):
    id: str
    title: str
    status: str
    criteria: dict
    logs: list
    resume_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Helpers ──────────────────────────────────────────────────────────
def _parse_json(val: str, default):
    try:
        return json.loads(val)
    except Exception:
        return default


def _job_to_response(job: Job) -> dict:
    return {
        "id": job.id,
        "title": job.title,
        "status": job.status,
        "criteria": _parse_json(job.criteria, {}),
        "logs": _parse_json(job.activity_log, []),
        "resume_count": job.resume_count,
        "created_at": job.created_at.isoformat(),
    }


# ── Routes ───────────────────────────────────────────────────────────
@router.get("/", response_model=List[dict])
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).order_by(Job.created_at.desc()))
    jobs = result.scalars().all()
    return [_job_to_response(j) for j in jobs]


@router.post("/", response_model=dict, status_code=201)
async def create_job(payload: JobCreate, db: AsyncSession = Depends(get_db)):
    job = Job(
        id=str(uuid.uuid4()),
        title=payload.title,
        status="intake",
        criteria=json.dumps(payload.criteria or {}),
        activity_log=json.dumps([{"message": "Job created", "ts": datetime.utcnow().isoformat()}]),
        resume_count=0,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(job)
    await db.flush()
    return _job_to_response(job)


@router.get("/{job_id}", response_model=dict)
async def get_job(job_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return _job_to_response(job)


@router.patch("/{job_id}/status", response_model=dict)
async def update_status(job_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if "status" in body:
        job.status = body["status"]
    job.updated_at = datetime.utcnow()
    return _job_to_response(job)
