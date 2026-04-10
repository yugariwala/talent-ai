"""
Multi-Agent Talent AI — Pydantic v2 Schemas

Request and response models for all API endpoints.
"""

from enum import Enum

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Shared Enums
# ---------------------------------------------------------------------------

class TierEnum(str, Enum):
    green = "green"
    yellow = "yellow"
    red = "red"
    rejected = "rejected"


class StatusEnum(str, Enum):
    queued = "queued"
    embedding = "embedding"
    parsing = "parsing"
    taxonomy = "taxonomy"
    scoring = "scoring"
    explained = "explained"
    rejected = "rejected"
    done = "done"
    failed = "failed"


class ProficiencyEnum(str, Enum):
    beginner = "Beginner"
    intermediate = "Intermediate"
    advanced = "Advanced"
    expert = "Expert"


class FileFormatEnum(str, Enum):
    pdf = "pdf"
    docx = "docx"
    txt = "txt"


# ---------------------------------------------------------------------------
# Skill Schemas
# ---------------------------------------------------------------------------

class SkillOut(BaseModel):
    skill: str
    canonical_form: str
    proficiency: ProficiencyEnum
    source: str  # "direct" | "inferred" | "semantic_match"
    taxonomy_path: str
    context: str | None = None


class TaxonomyEntry(BaseModel):
    canonical: str
    aliases: list[str]
    parent: str
    grandparent: str
    taxonomy_path: str


class TaxonomySearchResponse(BaseModel):
    results: list[TaxonomyEntry]


# ---------------------------------------------------------------------------
# Candidate Schemas
# ---------------------------------------------------------------------------

class ContactInfo(BaseModel):
    email: str | None = None
    phone: str | None = None
    location: str | None = None


class WorkEntry(BaseModel):
    company: str | None = None
    title: str | None = None
    start: str | None = None
    end: str | None = None
    duration_months: int | None = None
    responsibilities: list[str] = []


class EducationEntry(BaseModel):
    institution: str | None = None
    degree: str | None = None
    field: str | None = None
    year: int | None = None
    gpa: float | None = None


class RedFlag(BaseModel):
    type: str
    description: str
    severity: str  # "low" | "medium" | "high"


class CandidateProfile(BaseModel):
    candidate_id: str
    name: str | None = None
    contact: ContactInfo = ContactInfo()
    work_history: list[WorkEntry] = []
    education: list[EducationEntry] = []
    skills: list[SkillOut] = []
    unknown_skills: list[str] = []
    certifications: list[dict] = []
    achievements: list[str] = []
    projects: list[dict] = []
    red_flags: list[RedFlag] = []
    parse_quality_score: float | None = None
    file_format: FileFormatEnum
    ocr_processed: bool = False


# ---------------------------------------------------------------------------
# Parse Schemas
# ---------------------------------------------------------------------------

class ParseBatchRequest(BaseModel):
    job_post_id: str | None = None
    webhook_url: str | None = None


class BatchJobResponse(BaseModel):
    job_id: str
    file_count: int
    status: str
    estimated_completion_seconds: int


class BatchStatusResponse(BaseModel):
    job_id: str
    status: str
    total: int
    completed: int
    failed: int
    queued: int
    results_url: str | None = None


# ---------------------------------------------------------------------------
# Match Schemas
# ---------------------------------------------------------------------------

class MatchWeights(BaseModel):
    technical_skills: float = 0.45
    experience_depth: float = 0.30
    education: float = 0.15
    achievements: float = 0.10


class MatchRequest(BaseModel):
    candidate_id: str
    job_description: str
    match_threshold: float = 0.70
    weights: MatchWeights = MatchWeights()


class SkillGap(BaseModel):
    skill: str
    required: ProficiencyEnum
    found: ProficiencyEnum | None
    delta: int
    suggestion: str | None = None


class MatchResponse(BaseModel):
    candidate_id: str
    total_score: float
    tier: TierEnum
    dimension_scores: dict[str, float]
    matched_skills: list[SkillOut] = []
    skill_gaps: list[SkillGap] = []
    upskilling_suggestions: list[dict] = []


# ---------------------------------------------------------------------------
# Job Post Schemas
# ---------------------------------------------------------------------------

class JobPostCreate(BaseModel):
    title: str


class JobPostOut(BaseModel):
    id: str
    title: str
    status: str
    green_threshold: float
    yellow_threshold: float
    created_at: str
    updated_at: str


class CriteriaCardUpdate(BaseModel):
    must_haves: list[str] | None = None
    nice_to_haves: list[str] | None = None
    dimensions: list[dict] | None = None
    proficiency_rubrics: dict | None = None
    experience_range: dict | None = None
    education: dict | None = None


class TierBoundaryUpdate(BaseModel):
    green_threshold: float
    yellow_threshold: float


class AgentTraceOut(BaseModel):
    id: str
    agent_name: str
    resume_id: str | None
    started_at: str
    completed_at: str | None
    latency_ms: int | None
    status: str
    input_tokens: int
    output_tokens: int
    quality_score: float | None
    error_message: str | None


# ---------------------------------------------------------------------------
# Webhook Schemas
# ---------------------------------------------------------------------------

class WebhookRegister(BaseModel):
    job_id: str
    callback_url: str
