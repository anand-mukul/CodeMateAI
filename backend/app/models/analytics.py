"""
CodeMate AI — Phase 8 Analytics Models
Privacy-preserving event logging, daily rollups, and user telemetry preferences.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, generate_uuid, utc_now


class AnalyticsEvent(Base):
    __tablename__ = "analytics_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    event_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    feature_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    failure_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    token_usage: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    model_identifier: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    plan_identifier: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    application_version: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    request_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)


class AnalyticsDailyAggregate(Base):
    __tablename__ = "analytics_daily_aggregates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    event_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    feature_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    total_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    success_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    failure_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_duration_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("date", "event_name", "feature_name", name="uq_analytics_daily_agg"),
    )


class AnalyticsPreference(Base):
    __tablename__ = "analytics_preferences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    opt_out: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

