"""Skills router — taxonomy endpoints."""

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/v1/skills", tags=["Skills"])

NOT_IMPLEMENTED = HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/taxonomy")
async def get_taxonomy(depth: int = 2, domain: str | None = None):
    raise NOT_IMPLEMENTED


@router.get("/taxonomy/search")
async def search_taxonomy(q: str, limit: int = 10):
    raise NOT_IMPLEMENTED
