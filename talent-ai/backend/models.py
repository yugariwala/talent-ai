"""
ORM models for Talent AI
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from database import Base


def _uuid():
    return str(uuid.uuid4())


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=_uuid)
    title = Column(String, nullable=False)
    status = Column(String, default="intake")          # intake | processing | results
    criteria = Column(Text, default="{}")              # JSON string
    activity_log = Column(Text, default="[]")          # JSON string
    resume_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
