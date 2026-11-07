"""
CodeMate AI — Phase 8 Customer Support Schemas
Contracts for support ticket lifecycles, messages, and staff internal notes.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class SupportMessageResponse(BaseModel):
    id: str
    ticket_id: str
    sender_id: str
    sender_role: str
    message_text: str
    attachment_path: Optional[str]
    is_internal_note: bool
    created_at: datetime


class SupportMessageCreateRequest(BaseModel):
    message_text: str = Field(..., min_length=2, max_length=5000)
    attachment_path: Optional[str] = Field(default=None, max_length=500)


class SupportInternalNoteCreateRequest(BaseModel):
    message_text: str = Field(..., min_length=2, max_length=5000)


class SupportTicketCreateRequest(BaseModel):
    subject: str = Field(..., min_length=5, max_length=200)
    category: str = Field(..., pattern=r"^(account_access|billing_payment|ai_functionality|editor_integration|project_intelligence|bug_report|general_support)$")
    priority: str = Field(default="NORMAL", pattern=r"^(LOW|NORMAL|HIGH|URGENT)$")
    initial_message: str = Field(..., min_length=10, max_length=5000)
    attachment_path: Optional[str] = Field(default=None, max_length=500)


class SupportTicketStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern=r"^(OPEN|IN_PROGRESS|WAITING_FOR_USER|WAITING_FOR_SUPPORT|RESOLVED|CLOSED)$")
    resolution_notes: Optional[str] = Field(default=None, max_length=2000)


class SupportTicketAssignRequest(BaseModel):
    assigned_agent_id: str


class SupportTicketResponse(BaseModel):
    id: str
    user_id: str
    assigned_agent_id: Optional[str]
    subject: str
    category: str
    priority: str
    status: str
    last_reply_at: datetime
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    messages: List[SupportMessageResponse] = []

