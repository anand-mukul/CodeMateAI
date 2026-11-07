"""
CodeMate AI — Phase 8 Customer Support Models
Multi-role ticketing with strict isolation between user-facing messages and internal staff notes.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid, utc_now


class SupportTicket(Base, TimestampMixin):
    __tablename__ = "support_tickets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    assigned_agent_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # account_access, billing_payment, ai_functionality, editor_integration, project_intelligence, bug_report, general_support
    priority: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)  # LOW, NORMAL, HIGH, URGENT
    status: Mapped[str] = mapped_column(String(30), default="OPEN", nullable=False, index=True)  # OPEN, IN_PROGRESS, WAITING_FOR_USER, WAITING_FOR_SUPPORT, RESOLVED, CLOSED
    last_reply_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    messages: Mapped[List["SupportMessage"]] = relationship("SupportMessage", back_populates="ticket", cascade="all, delete-orphan")
    attachments: Mapped[List["SupportAttachment"]] = relationship("SupportAttachment", back_populates="ticket", cascade="all, delete-orphan")


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    ticket_id: Mapped[str] = mapped_column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sender_role: Mapped[str] = mapped_column(String(30), nullable=False)  # user, support_agent, admin
    message_text: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_internal_note: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)  # MUST NEVER be exposed to users
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    ticket: Mapped["SupportTicket"] = relationship("SupportTicket", back_populates="messages")


class SupportAttachment(Base):
    __tablename__ = "support_attachments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    ticket_id: Mapped[str] = mapped_column(String(36), ForeignKey("support_tickets.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    uploaded_by_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    ticket: Mapped["SupportTicket"] = relationship("SupportTicket", back_populates="attachments")

