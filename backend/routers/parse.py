"""Parse router — resume parsing endpoints."""

from fastapi import APIRouter, HTTPException, UploadFile

router = APIRouter(prefix="/api/v1/parse", tags=["Parse"])

NOT_IMPLEMENTED = HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/")
async def parse_single_resume(file: UploadFile, job_post_id: str | None = None):
    raise NOT_IMPLEMENTED


@router.post("/batch")
async def parse_batch(
    files: list[UploadFile],
    job_post_id: str | None = None,
    webhook_url: str | None = None,
):
    raise NOT_IMPLEMENTED


@router.get("/{job_id}/status")
async def get_batch_status(job_id: str):
    raise NOT_IMPLEMENTED


@router.get("/{job_id}/results")
async def get_batch_results(job_id: str):
    raise NOT_IMPLEMENTED
