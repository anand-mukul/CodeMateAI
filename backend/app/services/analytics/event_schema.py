"""
CodeMate AI — Phase 8 Analytics Schemas & Ingestion Contracts
Defines strictly validated, allowlisted telemetry event contracts.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class AnalyticsEventDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")

    event_name: str = Field(..., max_length=100, pattern=r"^[a-z0-9_]+$")
    timestamp: Optional[datetime] = Field(default=None)
    session_id: Optional[str] = Field(default=None, max_length=64)
    feature_name: Optional[str] = Field(default=None, max_length=100)
    duration_ms: Optional[int] = Field(default=None, ge=0, le=600000)
    success: bool = Field(default=True)
    failure_category: Optional[str] = Field(default=None, max_length=50)
    token_usage: Optional[int] = Field(default=None, ge=0, le=1000000)
    model_identifier: Optional[str] = Field(default=None, max_length=100)
    plan_identifier: Optional[str] = Field(default=None, max_length=50)
    application_version: Optional[str] = Field(default=None, max_length=30)
    request_id: Optional[str] = Field(default=None, max_length=100)


class AnalyticsBatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    events: List[AnalyticsEventDTO] = Field(..., min_length=1, max_length=50)


class AnalyticsPreferenceDTO(BaseModel):
    opt_out: bool = Field(..., description="True if user has opted out of optional product analytics")


class AnalyticsOverviewResponse(BaseModel):
    total_users: int
    active_users_daily: int
    active_users_weekly: int
    active_users_monthly: int
    free_users: int
    pro_users: int
    premium_users: int
    total_ai_requests: int
    overall_success_rate: float
    total_tokens_consumed: int
    estimated_cost_usd: float

