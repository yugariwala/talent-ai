"""
Multi-Agent Talent AI — Orchestrator (Agent 0)

Pure coordination logic — no LLM calls. Runs the pipeline:
  1. Parser Agent → extract structured data
  2. Taxonomy Agent → normalize and infer skills
  3. Scoring → compute match score + tier assignment
  4. Update DB with results

Designed to be called as a FastAPI BackgroundTask.
"""

from __future__ import annotations

import json
import logging
import random
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import AsyncSessionLocal
from models import Resume, ResumeParsedData, Ranking, AgentTrace, StructuredJD
from agents.parser import ParserAgent
from agents.taxonomy_agent import SkillTaxonomyAgent

logger = logging.getLogger(__name__)

MAX_RETRIES = 2


class Orchestrator:
    """
    Coordinates the resume processing pipeline.

    Pipeline steps:
      1. parsing   — ParserAgent extracts structured data from resume
      2. taxonomy  — SkillTaxonomyAgent normalizes and infers skills
      3. scoring   — Simple weighted scoring based on extracted data
      4. done      — All processing complete
    """

    def __init__(self) -> None:
        self.parser = ParserAgent()
        self.taxonomy = SkillTaxonomyAgent()

    async def run_pipeline(self, resume_id: str, job_post_id: str) -> None:
        """
        Execute the full pipeline for a single resume.

        Uses its own DB session (suitable for BackgroundTask usage).
        """
        async with AsyncSessionLocal() as db:
            try:
                await self._execute(resume_id, job_post_id, db)
                await db.commit()
            except Exception as e:
                await db.rollback()
                logger.error(
                    "Pipeline failed for resume %s: %s", resume_id, e
                )
                # Mark as failed
                try:
                    async with AsyncSessionLocal() as db2:
                        resume = await db2.get(Resume, resume_id)
                        if resume:
                            resume.status = "failed"
                            resume.error_message = str(e)[:500]
                            db2.add(resume)
                            await db2.commit()
                except Exception:
                    logger.error("Failed to mark resume %s as failed", resume_id)

    async def _execute(
        self, resume_id: str, job_post_id: str, db: AsyncSession
    ) -> None:
        """Core pipeline logic with retry."""
        resume = await db.get(Resume, resume_id)
        if not resume:
            raise ValueError(f"Resume {resume_id} not found")

        # Load criteria card if available
        must_haves: list[str] | None = None
        criteria_rubrics: dict | None = None
        jd_query = select(StructuredJD).where(
            StructuredJD.job_post_id == job_post_id
        )
        jd_result = await db.execute(jd_query)
        structured_jd = jd_result.scalar()
        if structured_jd:
            if structured_jd.must_haves:
                try:
                    must_haves = json.loads(structured_jd.must_haves)
                except (json.JSONDecodeError, TypeError):
                    pass
            if structured_jd.criteria_json:
                try:
                    criteria = json.loads(structured_jd.criteria_json)
                    criteria_rubrics = criteria.get("proficiency_rubrics")
                except (json.JSONDecodeError, TypeError):
                    pass

        # ── Step 1: Parsing ──
        resume.status = "parsing"
        db.add(resume)
        await db.flush()

        parser_result = await self._run_with_retry(
            agent_name="parser",
            resume_id=resume_id,
            job_post_id=job_post_id,
            db=db,
            coroutine_factory=lambda: self.parser.run(
                resume_id=resume_id,
                file_path=resume.file_path,
                file_format=resume.file_format,
                must_haves=must_haves,
                criteria_rubrics=criteria_rubrics,
            ),
        )

        # Save parsed data to DB
        parsed_data = ResumeParsedData(
            resume_id=resume_id,
            candidate_name=parser_result.get("candidate_name"),
            contact_json=parser_result.get("contact_json"),
            experience_json=parser_result.get("experience_json"),
            skills_json=parser_result.get("skills_json"),
            education_json=parser_result.get("education_json"),
            certifications=parser_result.get("certifications"),
            achievements_json=parser_result.get("achievements_json"),
            projects_json=parser_result.get("projects_json"),
            red_flags_json=parser_result.get("red_flags_json"),
            parse_quality_score=parser_result.get("parse_quality_score"),
            ocr_processed=parser_result.get("ocr_processed", False),
            parsed_at=datetime.now(timezone.utc),
        )
        db.add(parsed_data)
        await db.flush()

        # ── Step 2: Taxonomy ──
        resume.status = "taxonomy"
        db.add(resume)
        await db.flush()

        raw_skills = parser_result.get("raw_skills", [])
        taxonomy_started = datetime.now(timezone.utc)

        try:
            # Build skill input for taxonomy agent
            skill_dict = {}
            for skill in raw_skills:
                if hasattr(skill, "skill_name"):
                    skill_dict[skill.skill_name] = skill.proficiency
                elif isinstance(skill, dict):
                    skill_dict[skill.get("skill_name", "")] = skill.get(
                        "proficiency", "Beginner"
                    )

            # Run taxonomy normalization
            inferred_skills = self.taxonomy.infer_hierarchy(skill_dict)

            # Build normalized skills JSON
            normalized_skills = []
            for skill_name in inferred_skills:
                canonical = self.taxonomy.normalize_skill(skill_name)
                prof = skill_dict.get(skill_name, skill_dict.get(canonical, "Beginner")) if canonical else "Beginner"
                normalized_skills.append({
                    "skill_name": canonical or skill_name,
                    "proficiency": prof if isinstance(prof, str) else "Beginner",
                    "source": "direct" if canonical and canonical in skill_dict else "inferred",
                })

            # Update parsed_data with normalized skills
            parsed_data.skills_json = json.dumps(normalized_skills)
            db.add(parsed_data)

            taxonomy_elapsed = int(
                (datetime.now(timezone.utc) - taxonomy_started).total_seconds() * 1000
            )

            # Record taxonomy trace
            trace = AgentTrace(
                job_post_id=job_post_id,
                resume_id=resume_id,
                agent_name="taxonomy",
                started_at=taxonomy_started,
                completed_at=datetime.now(timezone.utc),
                latency_ms=taxonomy_elapsed,
                status="success",
                input_tokens=0,
                output_tokens=0,
                quality_score=None,
            )
            db.add(trace)

        except Exception as e:
            logger.warning("Taxonomy failed for %s: %s", resume_id, e)
            # Taxonomy failure is non-fatal — continue with raw skills
            trace = AgentTrace(
                job_post_id=job_post_id,
                resume_id=resume_id,
                agent_name="taxonomy",
                started_at=taxonomy_started,
                completed_at=datetime.now(timezone.utc),
                latency_ms=0,
                status="failed",
                input_tokens=0,
                output_tokens=0,
                error_message=str(e)[:500],
            )
            db.add(trace)

        await db.flush()

        # ── Step 3: Scoring ──
        resume.status = "scoring"
        db.add(resume)
        await db.flush()

        # Simple scoring based on quality and skill count
        quality = parser_result.get("parse_quality_score", 0.5)
        skill_count = len(raw_skills)
        hard_reject = parser_result.get("hard_reject", False)

        if hard_reject:
            total_score = max(10, random.randint(15, 35))
            tier = "rejected"
        else:
            # Weighted score: quality (40%) + skill coverage (30%) + experience (30%)
            skill_score = min(skill_count / 10.0, 1.0) * 100
            experience_count = len(
                json.loads(parser_result.get("experience_json", "[]"))
            )
            exp_score = min(experience_count / 5.0, 1.0) * 100
            total_score = round(
                quality * 40 + skill_score * 0.30 + exp_score * 0.30, 1
            )
            total_score = min(max(total_score, 10), 98)

        # Determine tier based on job thresholds
        from models import JobPost
        job = await db.get(JobPost, job_post_id)
        green_thresh = job.green_threshold if job else 80
        yellow_thresh = job.yellow_threshold if job else 60

        if tier != "rejected" if hard_reject else True:
            if total_score >= green_thresh:
                tier = "green"
            elif total_score >= yellow_thresh:
                tier = "yellow"
            else:
                tier = "red"

        ranking = Ranking(
            resume_id=resume_id,
            job_post_id=job_post_id,
            total_score=total_score,
            tier=tier,
            rejection_reason=parser_result.get("rejection_reason"),
        )
        db.add(ranking)
        await db.flush()

        # ── Step 4: Done ──
        resume.status = "done"
        db.add(resume)
        await db.flush()

        logger.info(
            "Pipeline complete | resume_id=%s score=%.1f tier=%s",
            resume_id,
            total_score,
            tier,
        )

    async def _run_with_retry(
        self,
        agent_name: str,
        resume_id: str,
        job_post_id: str,
        db: AsyncSession,
        coroutine_factory,
    ) -> dict:
        """Run an agent coroutine with retry logic and trace recording."""
        last_error = None

        for attempt in range(MAX_RETRIES + 1):
            started = datetime.now(timezone.utc)
            try:
                result = await coroutine_factory()
                elapsed = int(
                    (datetime.now(timezone.utc) - started).total_seconds() * 1000
                )

                # Record success trace
                trace = AgentTrace(
                    job_post_id=job_post_id,
                    resume_id=resume_id,
                    agent_name=agent_name,
                    started_at=started,
                    completed_at=datetime.now(timezone.utc),
                    latency_ms=elapsed,
                    status="success" if attempt == 0 else "retry",
                    input_tokens=0,
                    output_tokens=0,
                    quality_score=result.get("parse_quality_score"),
                )
                db.add(trace)
                await db.flush()
                return result

            except Exception as e:
                elapsed = int(
                    (datetime.now(timezone.utc) - started).total_seconds() * 1000
                )
                last_error = e
                logger.warning(
                    "%s attempt %d/%d failed for %s: %s",
                    agent_name,
                    attempt + 1,
                    MAX_RETRIES + 1,
                    resume_id,
                    e,
                )

                # Record failure trace
                trace = AgentTrace(
                    job_post_id=job_post_id,
                    resume_id=resume_id,
                    agent_name=agent_name,
                    started_at=started,
                    completed_at=datetime.now(timezone.utc),
                    latency_ms=elapsed,
                    status="retry" if attempt < MAX_RETRIES else "failed",
                    input_tokens=0,
                    output_tokens=0,
                    error_message=str(e)[:500],
                )
                db.add(trace)
                await db.flush()

        # All retries exhausted
        raise RuntimeError(
            f"{agent_name} failed after {MAX_RETRIES + 1} attempts: {last_error}"
        )
