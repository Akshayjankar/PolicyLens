"""SQLAlchemy ORM models for PolicyLens."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.types import JSON
from database import Base


class PolicySnapshot(Base):
    """Stores every analyzed privacy policy snapshot."""

    __tablename__ = "policy_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    site_url = Column(String(500), nullable=False, index=True)
    policy_url = Column(String(500), nullable=False)
    policy_text = Column(Text, nullable=False)
    analysis = Column(JSON, nullable=False)   # SQLAlchemy JSON works with SQLite
    overall_score = Column(Integer, nullable=False)
    analyzed_at = Column(DateTime, default=datetime.utcnow)
