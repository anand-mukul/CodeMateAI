"""
CodeMate AI — Subscription, Plan & Payment Schemas
Pydantic V2 schemas for Plan retrieval, Subscription state, Razorpay Orders, and Webhook verification.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str
    price: int  # in paise
    currency: str
    billing_interval: str
    device_limit: int
    concurrent_session_limit: int
    ai_usage_limit: int
    feature_entitlements: List[str]
    active: bool


class SubscriptionResponse(BaseModel):
    id: Optional[str] = None
    plan_id: str
    plan_name: str
    billing_provider: str
    status: str
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: bool = False
    device_limit: int
    concurrent_session_limit: int
    ai_usage_limit: int
    usage_today: int
    remaining_quota_today: int
    entitlements: List[str]


class CreateOrderRequest(BaseModel):
    plan_id: str = Field(min_length=2, max_length=32)
    coupon_code: Optional[str] = None


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int  # in paise
    currency: str
    key_id: str
    plan_id: str
    plan_name: str
    discount_amount: int = 0
    coupon_applied: Optional[str] = None


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: str


class VerifyPaymentResponse(BaseModel):
    success: bool
    message: str
    subscription: SubscriptionResponse


class PaymentHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    provider: str
    provider_order_id: str
    provider_payment_id: Optional[str] = None
    amount: int
    currency: str
    payment_status: str
    created_at: datetime
    verified_at: Optional[datetime] = None


class WebhookProcessingResult(BaseModel):
    status: str
    event_id: str
    event_type: str
    message: str
