"""Jobs router — job post management endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Ranking, JobPost, Resume
import random

from schemas import CriteriaCardUpdate, JobPostCreate, TierBoundaryUpdate

router = APIRouter(prefix="/api/v1/jobs", tags=["Jobs"])

NOT_IMPLEMENTED = HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/")
async def create_job_post(body: JobPostCreate):
    raise NOT_IMPLEMENTED


@router.get("/")
async def list_job_posts():
    raise NOT_IMPLEMENTED


@router.get("/{job_id}")
async def get_job_post(job_id: str):
    raise NOT_IMPLEMENTED


@router.patch("/{job_id}/criteria")
async def update_criteria_card(job_id: str, body: CriteriaCardUpdate):
    raise NOT_IMPLEMENTED


@router.patch("/{job_id}/thresholds")
async def update_tier_thresholds(job_id: str, body: TierBoundaryUpdate, db: AsyncSession = Depends(get_db)):
    job = await db.get(JobPost, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.green_threshold = body.green_threshold
    job.yellow_threshold = body.yellow_threshold
    db.add(job)
    return {"status": "ok"}


@router.get("/{job_id}/rankings")
async def get_rankings(job_id: str, db: AsyncSession = Depends(get_db)):
    query = select(Ranking).where(Ranking.job_post_id == job_id)
    res = await db.execute(query)
    rankings = res.scalars().all()

    # If no rankings exist, let's create some dummy ones for the demo histogram
    if not rankings:
        res_query = select(Resume).where(Resume.job_post_id == job_id)
        res_res = await db.execute(res_query)
        resumes = res_res.scalars().all()

        if not resumes:
            # Return generated list of scores for the chart
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
        {"candidate_id": r.resume_id, "score": r.total_score}
        for r in rankings
    ]


@router.get("/{job_id}/traces")
async def get_agent_traces(job_id: str):
    raise NOT_IMPLEMENTED


@router.post("/{job_id}/jd-chat")
async def send_jd_chat_message(job_id: str, body: dict):
    raise NOT_IMPLEMENTED


@router.post("/{job_id}/confirm")
async def confirm_criteria(job_id: str):
    raise NOT_IMPLEMENTED


@router.post("/{job_id}/close")
async def close_job_post(job_id: str):
    raise NOT_IMPLEMENTED
