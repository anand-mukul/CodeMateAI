"""
CodeMate AI — Phase 8 Feature Flag Schemas
Contracts for runtime feature toggling, percentage rollouts, and audit trails.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class FeatureFlagCreateRequest(BaseModel):
    key: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9_]+$")
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    is_enabled: bool = Field(default=False)
    target_audience: str = Field(default="all", pattern=r"^(all|beta_users|internal_staff|subscribers_only)$")
    minimum_plan: Optional[str] = Field(default=None, pattern=r"^(pro|premium)$")
    rollout_percentage: int = Field(default=100, ge=0, le=100)


class FeatureFlagUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    is_enabled: Optional[bool] = None
    target_audience: Optional[str] = Field(default=None, pattern=r"^(all|beta_users|internal_staff|subscribers_only)$")
    minimum_plan: Optional[str] = Field(default=None, pattern=r"^(pro|premium)$")
    rollout_percentage: Optional[int] = Field(default=None, ge=0, le=100)
    change_reason: str = Field(..., min_length=5, max_length=255)


class FeatureFlagResponse(BaseModel):
    id: str
    key: str
    name: str
    description: Optional[str]
    is_enabled: bool
    target_audience: str
    minimum_plan: Optional[str]
    rollout_percentage: int
    created_at: datetime
    updated_at: datetime

