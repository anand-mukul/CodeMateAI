"""
CodeMate AI — User Model
Represents registered users with Argon2id password hash, email verification, and relationships.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, String, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid
from app.models.enums import AuthProvider, AccountStatus, UserRole

if TYPE_CHECKING:
    from app.models.device import UserDevice
    from app.models.session import UserSession
    from app.models.subscription import Subscription, Payment, UsageRecord, PromoRedemption
    from app.models.security_log import SecurityLog
    from app.models.project import Project


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    auth_provider: Mapped[str] = mapped_column(SQLEnum(AuthProvider, native_enum=False, length=30, values_callable=lambda x: [e.value for e in x]), default=AuthProvider.LOCAL.value, nullable=False)
    google_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Developer")
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    account_status: Mapped[str] = mapped_column(SQLEnum(AccountStatus, native_enum=False, length=30, values_callable=lambda x: [e.value for e in x]), default=AccountStatus.ACTIVE.value, nullable=False)
    role: Mapped[str] = mapped_column(SQLEnum(UserRole, native_enum=False, length=30, values_callable=lambda x: [e.value for e in x]), default=UserRole.USER.value, nullable=False)

    # Email verification & Password recovery token hashes (SHA-256)
    verification_token_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    verification_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reset_token_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    reset_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    devices: Mapped[List["UserDevice"]] = relationship("UserDevice", back_populates="user", cascade="all, delete-orphan")
    sessions: Mapped[List["UserSession"]] = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")
    subscriptions: Mapped[List["Subscription"]] = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    usage_records: Mapped[List["UsageRecord"]] = relationship("UsageRecord", back_populates="user", cascade="all, delete-orphan")
    security_logs: Mapped[List["SecurityLog"]] = relationship("SecurityLog", back_populates="user", cascade="all, delete-orphan")
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    promo_redemptions: Mapped[List["PromoRedemption"]] = relationship("PromoRedemption", back_populates="user", cascade="all, delete-orphan")

