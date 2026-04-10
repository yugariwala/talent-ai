"""Parse router — resume parsing endpoints."""

import os
import shutil
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Resume

router = APIRouter(prefix="/api/v1/parse", tags=["Parse"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


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

    resume = Resume(
        id=file_id,
        job_post_id=job_post_id or "unassigned",
        filename=file.filename or "unknown",
        file_path=file_path,
        file_format=fmt,
        status="queued",
    )
    db.add(resume)
    await db.flush()

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
    db: AsyncSession = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

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
            job_post_id=job_post_id or "unassigned",
            filename=file.filename or "unknown",
            file_path=file_path,
            file_format=fmt,
            status="queued",
        )
        db.add(resume)

        results.append({
            "name": file.filename,
            "size": len(contents),
            "format": fmt,
            "status": "queued",
        })

    await db.flush()
    return results


@router.get("/{job_id}/status")
async def get_batch_status(job_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{job_id}/results")
async def get_batch_results(job_id: str):
    raise HTTPException(status_code=501, detail="Not implemented yet")
