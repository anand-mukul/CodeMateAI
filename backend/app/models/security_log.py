"""
CodeMate AI — Security Audit Log Model (Layer 3 Suspicious Activity Monitoring)
Tracks security-relevant events, token reuse attempts, and account warnings without invasive fingerprinting.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, ForeignKey, String, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, generate_uuid, utc_now
from app.models.enums import SecuritySeverity

if TYPE_CHECKING:
    from app.models.user import User


class SecurityLog(Base):
    __tablename__ = "security_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(SQLEnum(SecuritySeverity, name="security_severity_enum", values_callable=lambda x: [e.value for e in x]), default=SecuritySeverity.INFO.value, nullable=False)
    details: Mapped[str] = mapped_column(String(500), nullable=False)
    ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    user: Mapped[Optional["User"]] = relationship("User", back_populates="security_logs")

