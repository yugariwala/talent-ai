import asyncio
import sys
import os

# Add the current directory to path so we can import models and database
sys.path.append(os.getcwd())

from database import AsyncSessionLocal
from models import Resume, JobPost

async def populate():
    print("Populating database...")
    async with AsyncSessionLocal() as session:
        # Ensure job-123 exists
        job = await session.get(JobPost, "job-123")
        if not job:
            job = JobPost(id="job-123", title="Mock Software Engineer Job")
            session.add(job)
            await session.flush()
        
        # Add a few resumes
        for i in range(5):
            res_id = f"mock-res-{i}"
            existing = await session.get(Resume, res_id)
            if not existing:
                r = Resume(
                    id=res_id,
                    job_post_id="job-123",
                    filename=f"candidate_{i+1}.pdf",
                    file_path=f"c:/uploads/candidate_{i+1}.pdf",
                    file_format="pdf",
                    status="queued"
                )
                session.add(r)
        
        await session.commit()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(populate())
