"""
Multi-Agent Talent AI — FastAPI Entry Point
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
import models  # noqa: F401 — registers all tables with Base.metadata


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Server started")
    yield


app = FastAPI(
    title="Multi-Agent Talent AI",
    description="Intelligent Resume Parsing · Skill Taxonomy · Semantic Matching · Explainable Decisions",
    version="2.0",
    lifespan=lifespan,
)

# CORS — allow all origins (hackathon mode)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router registrations ---
from routers import parse, candidates, match, skills, jobs, webhooks

app.include_router(parse.router)
app.include_router(candidates.router)
app.include_router(match.router)
app.include_router(skills.router)
app.include_router(jobs.router)
app.include_router(webhooks.router)

# Mount uploads directory for static file serving
uploads_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0"}
