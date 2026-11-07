"""
CodeMate AI — Phase 8 Feedback & Feature Request Models
Provides structured user feedback collection, public feature suggestions, and community voting.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid, utc_now
from app.models.enums import FeedbackStatus, FeatureRequestStatus


class UserFeedback(Base, TimestampMixin):
    __tablename__ = "user_feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # general, bug_report, usability, ai_quality, suggestion
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    satisfaction_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1 to 5
    attachment_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(SQLEnum(FeedbackStatus, name="feedback_status_enum", values_callable=lambda x: [e.value for e in x]), default=FeedbackStatus.NEW.value, nullable=False)  # NEW, REVIEW_IN_PROGRESS, RESOLVED, ARCHIVED
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class FeatureRequest(Base, TimestampMixin):
    __tablename__ = "feature_requests"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # ai_features, editor_integration, project_intelligence, spring_boot, ui_ux, performance, integrations, other
    status: Mapped[str] = mapped_column(SQLEnum(FeatureRequestStatus, name="feature_request_status_enum", values_callable=lambda x: [e.value for e in x]), default=FeatureRequestStatus.NEW.value, nullable=False, index=True)
    vote_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    merged_into_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    votes: Mapped[List["FeatureRequestVote"]] = relationship("FeatureRequestVote", back_populates="feature_request", cascade="all, delete-orphan")
    comments: Mapped[List["FeatureRequestComment"]] = relationship("FeatureRequestComment", back_populates="feature_request", cascade="all, delete-orphan")


class FeatureRequestVote(Base):
    __tablename__ = "feature_request_votes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    feature_request_id: Mapped[str] = mapped_column(String(36), ForeignKey("feature_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    feature_request: Mapped["FeatureRequest"] = relationship("FeatureRequest", back_populates="votes")

    __table_args__ = (
        UniqueConstraint("feature_request_id", "user_id", name="uq_feature_request_user_vote"),
    )


class FeatureRequestComment(Base):
    __tablename__ = "feature_request_comments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    feature_request_id: Mapped[str] = mapped_column(String(36), ForeignKey("feature_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    comment_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_official_response: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    feature_request: Mapped["FeatureRequest"] = relationship("FeatureRequest", back_populates="comments")

