"""
CodeMate AI — Phase 8 Feedback & Feature Request Schemas
Contracts for submitting feedback, proposing features, and community voting.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# --- User Feedback ---
class UserFeedbackCreateRequest(BaseModel):
    category: str = Field(..., pattern=r"^(general|bug_report|usability|ai_quality|suggestion)$")
    title: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)
    satisfaction_score: Optional[int] = Field(default=None, ge=1, le=5)
    attachment_path: Optional[str] = Field(default=None, max_length=500)


class UserFeedbackResponse(BaseModel):
    id: str
    user_id: str
    category: str
    title: str
    description: str
    satisfaction_score: Optional[int]
    attachment_path: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime


# --- Feature Requests ---
class FeatureRequestCreateRequest(BaseModel):
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=15, max_length=5000)
    category: str = Field(..., pattern=r"^(ai_features|editor_integration|project_intelligence|spring_boot|ui_ux|performance|integrations|other)$")


class FeatureRequestUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=5, max_length=200)
    description: Optional[str] = Field(default=None, min_length=15, max_length=5000)
    category: Optional[str] = Field(default=None, pattern=r"^(ai_features|editor_integration|project_intelligence|spring_boot|ui_ux|performance|integrations|other)$")


class FeatureRequestAdminStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(NEW|UNDER_REVIEW|PLANNED|IN_PROGRESS|COMPLETED|DECLINED|DUPLICATE|ON_HOLD)$")
    admin_notes: Optional[str] = Field(default=None, max_length=2000)
    merged_into_id: Optional[str] = None


class FeatureRequestCommentCreate(BaseModel):
    comment_text: str = Field(..., min_length=2, max_length=2000)


class FeatureRequestCommentResponse(BaseModel):
    id: str
    user_id: str
    comment_text: str
    is_official_response: bool
    created_at: datetime


class FeatureRequestResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: str
    category: str
    status: str
    vote_count: int
    admin_notes: Optional[str]
    has_voted: bool = False
    created_at: datetime
    updated_at: datetime
    comments: List[FeatureRequestCommentResponse] = []

