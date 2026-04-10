"""Candidates router — candidate profile endpoints."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/candidates", tags=["Candidates"])

NOT_IMPLEMENTED = HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{candidate_id}/skills")
async def get_candidate_skills(candidate_id: str):
    raise NOT_IMPLEMENTED
