"""
CodeMate AI — Phase 8 Feature Flag Models
Provides dynamic server-controlled rollouts, target gating, and administrative change tracking.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, generate_uuid, utc_now


class FeatureFlag(Base, TimestampMixin):
    __tablename__ = "feature_flags"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    target_audience: Mapped[str] = mapped_column(String(50), default="all", nullable=False)  # all, beta_users, internal_staff, subscribers_only
    minimum_plan: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # pro, premium
    rollout_percentage: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    created_by_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)


class FeatureFlagChange(Base):
    __tablename__ = "feature_flag_changes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    flag_id: Mapped[str] = mapped_column(String(36), ForeignKey("feature_flags.id", ondelete="CASCADE"), nullable=False, index=True)
    admin_user_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    previous_state_json: Mapped[str] = mapped_column(Text, nullable=False)
    new_state_json: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

