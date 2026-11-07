"""
CodeMate AI — Phase 8 Admin Schemas
Contracts for user administration, role assignment, subscription inspection, and audit logs.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AdminUserSummaryDTO(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    account_status: str
    email_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    plan_id: Optional[str] = "free"
    plan_name: Optional[str] = "Free"
    device_count: int = 0
    active_session_count: int = 0


class AdminUserSuspendRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=500)


class AdminUserRoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern=r"^(user|analyst|support_agent|admin|super_admin)$")
    reason: str = Field(..., min_length=5, max_length=500)


class AdminAuditLogDTO(BaseModel):
    id: str
    admin_user_id: Optional[str]
    target_user_id: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details_json: Optional[str]
    ip_address: Optional[str]
    created_at: datetime


class AdminSystemHealthResponse(BaseModel):
    status: str
    timestamp: datetime
    database: Dict[str, Any]
    ai_providers: Dict[str, Any]
    active_sessions_count: int
    unresolved_tickets_count: int
    pending_feedback_count: int

