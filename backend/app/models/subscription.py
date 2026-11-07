"""
CodeMate AI — Subscription, Plan, Payment, and Entitlement Models
Defines subscription tiers, payment records, webhook tracking, and feature quotas.
"""

from datetime import datetime
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, generate_uuid, utc_now

if TYPE_CHECKING:
    from app.models.user import User


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)  # 'free', 'pro', 'premium'
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # In paise (e.g. 49900 = ₹499)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    billing_interval: Mapped[str] = mapped_column(String(20), nullable=False, default="month")
    device_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    concurrent_session_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    ai_usage_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=10)  # Daily request limit
    feature_entitlements: Mapped[str] = mapped_column(Text, nullable=False, default="[]")  # JSON serialized list
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    subscriptions: Mapped[List["Subscription"]] = relationship("Subscription", back_populates="plan")


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[str] = mapped_column(String(32), ForeignKey("plans.id"), nullable=False)
    billing_provider: Mapped[str] = mapped_column(String(30), nullable=False, default="razorpay")
    provider_subscription_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="active")  # active, past_due, cancelled, halted, expired
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="subscriptions")
    plan: Mapped["Plan"] = relationship("Plan", back_populates="subscriptions")
    payments: Mapped[List["Payment"]] = relationship("Payment", back_populates="subscription")

    __table_args__ = (
        Index("ix_subscriptions_user_status", "user_id", "status"),
        Index("ix_subscriptions_period_end", "current_period_end"),
    )


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    provider: Mapped[str] = mapped_column(String(30), nullable=False, default="razorpay")
    provider_order_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    provider_payment_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    payment_status: Mapped[str] = mapped_column(String(30), nullable=False, default="created")  # created, authorized, captured, failed, refunded
    coupon_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    discount_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="payments")
    subscription: Mapped[Optional["Subscription"]] = relationship("Subscription", back_populates="payments")

    __table_args__ = (
        Index("ix_payments_user_status", "user_id", "payment_status"),
        Index("ix_payments_created_at", "created_at"),
    )


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    provider: Mapped[str] = mapped_column(String(30), nullable=False, default="razorpay")
    event_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    processing_status: Mapped[str] = mapped_column(String(30), nullable=False, default="received")  # received, processed, failed, ignored
    payload_preview: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    feature_name: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False)  # YYYY-MM-DD
    request_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    last_request_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="usage_records")

    __table_args__ = (
        UniqueConstraint("user_id", "feature_name", "date", name="uq_user_feature_date"),
        Index("ix_usage_records_user_date", "user_id", "date"),
    )


class PromoCode(Base, TimestampMixin):
    __tablename__ = "promo_codes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    discount_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_free: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    free_duration_days: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    target_plan_id: Mapped[Optional[str]] = mapped_column(String(32), ForeignKey("plans.id"), nullable=True)
    max_redemptions: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    times_redeemed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)

    redemptions: Mapped[List["PromoRedemption"]] = relationship("PromoRedemption", back_populates="promo_code", cascade="all, delete-orphan")


class PromoRedemption(Base):
    __tablename__ = "promo_redemptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    promo_code_id: Mapped[str] = mapped_column(String(36), ForeignKey("promo_codes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    redeemed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    discount_applied_paise: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    final_price_paise: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    promo_code: Mapped["PromoCode"] = relationship("PromoCode", back_populates="redemptions")
    user: Mapped["User"] = relationship("User", back_populates="promo_redemptions")

    __table_args__ = (
        UniqueConstraint("promo_code_id", "user_id", name="uq_promo_user_redemption"),
        Index("ix_promo_redemptions_user", "user_id"),
    )

