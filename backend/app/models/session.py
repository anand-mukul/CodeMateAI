"""
CodeMate AI — User Session Model (Layer 2 Concurrent Session Limits)
Tracks active user sessions with refresh token hash, expiry, and remote termination.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, generate_uuid, utc_now

if TYPE_CHECKING:
    from app.models.user import User


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    refresh_token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    session_status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active, expired, revoked

    ip_address_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="sessions")

