"""Parse router — resume parsing endpoints."""

<<<<<<< HEAD
=======
<<<<<<< HEAD
from fastapi import APIRouter, HTTPException, UploadFile

router = APIRouter(prefix="/api/v1/parse", tags=["Parse"])

NOT_IMPLEMENTED = HTTPException(status_code=501, detail="Not implemented yet")


@router.post("/")
async def parse_single_resume(file: UploadFile, job_post_id: str | None = None):
    raise NOT_IMPLEMENTED
=======
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93
import os
import shutil
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

<<<<<<< HEAD
from sqlalchemy import select, func
from database import get_db
from models import Resume, JobPost
=======
from database import get_db
from models import Resume
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93

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
<<<<<<< HEAD
=======
>>>>>>> NISHIL
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93


@router.post("/batch")
async def parse_batch(
    files: list[UploadFile],
    job_post_id: str | None = None,
    webhook_url: str | None = None,
<<<<<<< HEAD
=======
<<<<<<< HEAD
):
    raise NOT_IMPLEMENTED
=======
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93
    db: AsyncSession = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

<<<<<<< HEAD
    # Ensure JobPost exists (auto-create for dev convenience)
    job_id = job_post_id or "unassigned"
    job_post = await db.get(JobPost, job_id)
    if not job_post:
        job_post = JobPost(id=job_id, title=f"Job {job_id}")
        db.add(job_post)
        await db.flush()

=======
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93
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
<<<<<<< HEAD


@router.get("/{job_id}/status")
async def get_batch_status(job_id: str, db: AsyncSession = Depends(get_db)):
    # Count totals
    total_query = select(func.count()).select_from(Resume).where(Resume.job_post_id == job_id)
    total_res = await db.execute(total_query)
    total = total_res.scalar() or 0

    if total == 0:
        return {"status": "pending", "total": 0, "completed": 0, "failed": 0, "queued": 0}

    # Count completed (those that are fully done)
    completed_query = select(func.count()).select_from(Resume).where(Resume.job_post_id == job_id, Resume.status == "done")
    completed_res = await db.execute(completed_query)
    completed = completed_res.scalar() or 0

    # Count failed
    failed_query = select(func.count()).select_from(Resume).where(Resume.job_post_id == job_id, Resume.status == "failed")
    failed_res = await db.execute(failed_query)
    failed = failed_res.scalar() or 0

    # Count queued
    queued_query = select(func.count()).select_from(Resume).where(Resume.job_post_id == job_id, Resume.status == "queued")
    queued_res = await db.execute(queued_query)
    queued = queued_res.scalar() or 0

    # For hackathon/demo: auto-progress queued items to 'done' slowly
    if queued > 0:
        # Just update one at a time for the demo feel
        next_to_process_query = select(Resume).where(Resume.job_post_id == job_id, Resume.status == "queued").limit(1)
        next_to_process_res = await db.execute(next_to_process_query)
        next_to_process = next_to_process_res.scalar()
        if next_to_process:
            next_to_process.status = "done"
            db.add(next_to_process)
            # No await db.commit() here because get_db does it

    status = "complete" if completed + failed == total else "processing"

    return {
        "status": status,
        "total": total,
        "completed": completed,
        "failed": failed,
        "queued": max(0, queued - (1 if queued > 0 else 0)), # Adjusting for the one we just processed above to match immediate state
    }
=======
>>>>>>> NISHIL


@router.get("/{job_id}/status")
async def get_batch_status(job_id: str):
<<<<<<< HEAD
    raise NOT_IMPLEMENTED
=======
    raise HTTPException(status_code=501, detail="Not implemented yet")
>>>>>>> NISHIL
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93


@router.get("/{job_id}/results")
async def get_batch_results(job_id: str):
<<<<<<< HEAD
    raise HTTPException(status_code=501, detail="Not implemented yet")
=======
<<<<<<< HEAD
    raise NOT_IMPLEMENTED
=======
    raise HTTPException(status_code=501, detail="Not implemented yet")
>>>>>>> NISHIL
>>>>>>> 3538df473c5108fc9f69ebaa1603d30eb8e2ea93
