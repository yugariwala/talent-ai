"""
Multi-Agent Talent AI — SQLAlchemy ORM Models

All JSON fields are stored as Text (SQLite has no native JSON type).
Callers should use json.loads() / json.dumps() when reading / writing
any column whose name ends with _json.
"""

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import relationship

from database import Base


def _utcnow() -> datetime:
    """Return timezone-aware UTC now, used as column defaults."""
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# JobPost
# ---------------------------------------------------------------------------

class JobPost(AsyncAttrs, Base):
    __tablename__ = "job_posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    title = Column(String, nullable=False)
    status = Column(String, nullable=False, default="active")  # active | paused | closed
    green_threshold = Column(Float, nullable=False, default=80.0)
    yellow_threshold = Column(Float, nullable=False, default=60.0)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    updated_at = Column(DateTime, nullable=False, default=_utcnow, onupdate=_utcnow)

    # Relationships
    structured_jd = relationship("StructuredJD", back_populates="job_post", uselist=False)
    resumes = relationship("Resume", back_populates="job_post")
    activity_logs = relationship("ActivityLog", back_populates="job_post")


# ---------------------------------------------------------------------------
# StructuredJD
# ---------------------------------------------------------------------------

class StructuredJD(AsyncAttrs, Base):
    __tablename__ = "structured_jds"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    job_post_id = Column(String, ForeignKey("job_posts.id"), nullable=False)
    raw_jd_text = Column(Text, nullable=True)
    qa_log_json = Column(Text, nullable=True)      # JSON stored as string
    criteria_json = Column(Text, nullable=True)     # JSON stored as string
    must_haves = Column(Text, nullable=True)        # JSON stored as string
    nice_to_haves = Column(Text, nullable=True)     # JSON stored as string
    version = Column(Integer, nullable=False, default=1)
    updated_at = Column(DateTime, nullable=False, default=_utcnow, onupdate=_utcnow)

    # Relationships
    job_post = relationship("JobPost", back_populates="structured_jd")


# ---------------------------------------------------------------------------
# Resume
# ---------------------------------------------------------------------------

class Resume(AsyncAttrs, Base):
    __tablename__ = "resumes"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    job_post_id = Column(String, ForeignKey("job_posts.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_format = Column(String, nullable=False)    # pdf | docx | txt
    status = Column(String, nullable=False, default="queued")
    # status values: queued | embedding | parsing | taxonomy | scoring |
    #                explained | rejected | done | failed
    uploaded_at = Column(DateTime, nullable=False, default=_utcnow)
    error_message = Column(Text, nullable=True)

    # Relationships
    job_post = relationship("JobPost", back_populates="resumes")
    parsed_data = relationship("ResumeParsedData", back_populates="resume", uselist=False)
    ranking = relationship("Ranking", back_populates="resume", uselist=False)
    analysis = relationship("CandidateAnalysis", back_populates="resume", uselist=False)
    traces = relationship("AgentTrace", back_populates="resume")


# ---------------------------------------------------------------------------
# ResumeParsedData
# ---------------------------------------------------------------------------

class ResumeParsedData(AsyncAttrs, Base):
    __tablename__ = "resume_parsed_data"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    resume_id = Column(String, ForeignKey("resumes.id"), unique=True, nullable=False)
    candidate_name = Column(String, nullable=True)
    contact_json = Column(Text, nullable=True)          # {email, phone, location}
    experience_json = Column(Text, nullable=True)        # JSON array
    skills_json = Column(Text, nullable=True)            # JSON array of skill objects
    education_json = Column(Text, nullable=True)         # JSON array
    certifications = Column(Text, nullable=True)         # JSON array
    achievements_json = Column(Text, nullable=True)      # JSON array of strings
    projects_json = Column(Text, nullable=True)          # JSON array
    red_flags_json = Column(Text, nullable=True)         # JSON array of {type, description, severity}
    embedding_json = Column(Text, nullable=True)         # JSON float array (768 dims)
    parse_quality_score = Column(Float, nullable=True)
    ocr_processed = Column(Boolean, nullable=False, default=False)
    parsed_at = Column(DateTime, nullable=True)

    # Relationships
    resume = relationship("Resume", back_populates="parsed_data")


# ---------------------------------------------------------------------------
# Ranking
# ---------------------------------------------------------------------------

class Ranking(AsyncAttrs, Base):
    __tablename__ = "rankings"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    resume_id = Column(String, ForeignKey("resumes.id"), unique=True, nullable=False)
    job_post_id = Column(String, ForeignKey("job_posts.id"), nullable=False)
    total_score = Column(Float, nullable=True)
    tier = Column(String, nullable=True)                 # green | yellow | red | rejected
    rank_position = Column(Integer, nullable=True)
    dimension_scores_json = Column(Text, nullable=True)  # JSON object
    proficiency_gap_json = Column(Text, nullable=True)   # JSON array
    criteria_version = Column(Integer, nullable=True)
    is_stale = Column(Boolean, nullable=False, default=False)
    rejection_reason = Column(Text, nullable=True)
    last_updated = Column(DateTime, nullable=False, default=_utcnow, onupdate=_utcnow)

    # Relationships
    resume = relationship("Resume", back_populates="ranking")
    job_post = relationship("JobPost")


# ---------------------------------------------------------------------------
# CandidateAnalysis
# ---------------------------------------------------------------------------

class CandidateAnalysis(AsyncAttrs, Base):
    __tablename__ = "candidate_analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    resume_id = Column(String, ForeignKey("resumes.id"), unique=True, nullable=False)
    job_post_id = Column(String, ForeignKey("job_posts.id"), nullable=False)
    pros_json = Column(Text, nullable=True)                     # JSON array of {text, dimension_ref}
    cons_json = Column(Text, nullable=True)                     # JSON array of {text, dimension_ref, proficiency_delta}
    summary_sentence = Column(Text, nullable=True)
    upskilling_suggestions_json = Column(Text, nullable=True)   # JSON array
    comparison_brief = Column(Text, nullable=True)
    generated_at = Column(DateTime, nullable=False, default=_utcnow)

    # Relationships
    resume = relationship("Resume", back_populates="analysis")


# ---------------------------------------------------------------------------
# AgentTrace
# ---------------------------------------------------------------------------

class AgentTrace(AsyncAttrs, Base):
    __tablename__ = "agent_traces"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    job_post_id = Column(String, ForeignKey("job_posts.id"), nullable=True)
    resume_id = Column(String, ForeignKey("resumes.id"), nullable=True)
    agent_name = Column(String, nullable=False)
    # agent_name values: orchestrator | jd_intelligence | parser | taxonomy | scorer | explainer
    started_at = Column(DateTime, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    latency_ms = Column(Integer, nullable=True)
    status = Column(String, nullable=False)          # success | retry | failed | partial
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    quality_score = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)

    # Relationships
    resume = relationship("Resume", back_populates="traces")


# ---------------------------------------------------------------------------
# UnknownSkill
# ---------------------------------------------------------------------------

class UnknownSkill(AsyncAttrs, Base):
    __tablename__ = "unknown_skills"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    skill_name = Column(String, unique=True, nullable=False)
    frequency = Column(Integer, nullable=False, default=1)
    first_seen_at = Column(DateTime, nullable=False, default=_utcnow)
    reviewed = Column(Boolean, nullable=False, default=False)
    suggested_parent = Column(Text, nullable=True)


# ---------------------------------------------------------------------------
# ApiKey
# ---------------------------------------------------------------------------

class ApiKey(AsyncAttrs, Base):
    __tablename__ = "api_keys"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    key_hash = Column(String, unique=True, nullable=False)  # SHA-256 hash, never store plaintext
    label = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    last_used_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)


# ---------------------------------------------------------------------------
# WebhookCallback
# ---------------------------------------------------------------------------

class WebhookCallback(AsyncAttrs, Base):
    __tablename__ = "webhook_callbacks"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    job_id = Column(String, nullable=False)
    callback_url = Column(String, nullable=False)
    registered_at = Column(DateTime, nullable=False, default=_utcnow)
    fired_at = Column(DateTime, nullable=True)
    response_status = Column(Integer, nullable=True)


# ---------------------------------------------------------------------------
# ActivityLog
# ---------------------------------------------------------------------------

class ActivityLog(AsyncAttrs, Base):
    __tablename__ = "activity_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    job_post_id = Column(String, ForeignKey("job_posts.id"), nullable=False)
    event_type = Column(String, nullable=False)
    # event_type values: resume_uploaded | criteria_edited | processing_started |
    #                    candidate_ranked | tier_boundary_changed | candidate_moved |
    #                    note_added | room_closed
    description = Column(Text, nullable=False)
    metadata_json = Column(Text, nullable=True)  # JSON
    created_at = Column(DateTime, nullable=False, default=_utcnow)

    # Relationships
    job_post = relationship("JobPost", back_populates="activity_logs")
