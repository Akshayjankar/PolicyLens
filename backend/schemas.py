"""Pydantic schemas for PolicyLens request/response models."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    site_url: str
    policy_url: Optional[str] = None
    policy_text: Optional[str] = None


class RiskBadge(BaseModel):
    category: str = "General"
    verdict: str = "PARTIAL"
    severity: str = "yellow"
    plain_english: str = ""


class DangerousClause(BaseModel):
    original: str = ""
    plain_english: str = ""


class NegotiationScore(BaseModel):
    score: int = 50
    opt_out_data_selling: bool = False
    download_your_data: bool = False
    full_account_deletion: bool = False
    summary: str = ""


class AnalyzeResponse(BaseModel):
    site_url: str
    policy_url: str
    overall_score: int = 50
    grade: str = "C"
    risk_badges: List[RiskBadge] = []
    dangerous_clauses: List[DangerousClause] = []
    negotiation_score: NegotiationScore = NegotiationScore()
    policy_changed: bool = False
    previous_analysis_date: Optional[datetime] = None
    diff_html: Optional[str] = None
    snapshot_id: Optional[int] = None
    # New fields surfaced by updated LLM prompt
    policy_last_updated: Optional[str] = None
    retention_period: Optional[str] = None
    tracking_cookies: Optional[str] = None
    source: Optional[str] = None


class SnapshotSummary(BaseModel):
    id: int
    site_url: str
    policy_url: str
    overall_score: int
    analyzed_at: datetime

    class Config:
        from_attributes = True
