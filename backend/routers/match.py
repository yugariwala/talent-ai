"""Match router — candidate matching endpoints."""

from fastapi import APIRouter, HTTPException

from schemas import MatchRequest

router = APIRouter(prefix="/api/v1/match", tags=["Match"])

NOT_IMPLEMENTED = HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/")
async def match_candidate(body: MatchRequest):
    raise NOT_IMPLEMENTED
