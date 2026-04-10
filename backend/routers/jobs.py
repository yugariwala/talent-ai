"""Jobs router — job post management endpoints."""

from fastapi import APIRouter, HTTPException

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
async def update_tier_thresholds(job_id: str, body: TierBoundaryUpdate):
    raise NOT_IMPLEMENTED


@router.get("/{job_id}/rankings")
async def get_rankings(job_id: str):
    raise NOT_IMPLEMENTED


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
