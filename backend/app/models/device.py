"""
CodeMate AI — User Device Model (Layer 1 Device Registration)
Tracks registered browser installations via secure random installation IDs.
"""

from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, generate_uuid, utc_now
from app.models.enums import DeviceStatus

if TYPE_CHECKING:
    from app.models.user import User


class UserDevice(Base):
    __tablename__ = "user_devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # Client installation UUID
    device_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Chrome Extension")
    browser_name: Mapped[str] = mapped_column(String(50), nullable=False, default="Chrome")
    browser_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    extension_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    device_status: Mapped[str] = mapped_column(SQLEnum(DeviceStatus, native_enum=False, length=20, values_callable=lambda x: [e.value for e in x]), default=DeviceStatus.ACTIVE.value, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="devices")

    __table_args__ = (
        UniqueConstraint("user_id", "device_id", name="uq_user_device"),
    )

