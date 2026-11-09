"""
CodeMate AI — Promotional Codes & Access Grant Schemas
Provides validation, redemption, and admin governance schemas for coupon management.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.payment import SubscriptionResponse


class ValidatePromoRequest(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    plan_id: str = Field(min_length=2, max_length=32)


class ValidatePromoResponse(BaseModel):
    valid: bool
    code: str
    discount_percent: int
    original_price: int  # paise
    discount_paise: int  # paise
    final_price: int     # paise
    is_free: bool
    free_duration_days: int = 1
    description: str = ""
    message: str


class RedeemPromoRequest(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    plan_id: Optional[str] = "PLAN_AUTOPILOT_PASS"


class RedeemPromoResponse(BaseModel):
    success: bool
    message: str
    plan_name: str
    duration_days: int
    subscription: Optional[SubscriptionResponse] = None


class AdminGrantSubscriptionRequest(BaseModel):
    target_email: str
    plan_id: str = "PLAN_AUTOPILOT_PASS"
    duration_days: int = Field(default=30, ge=1, le=365)
    reason: str = Field(default="Promotional Ambassador Grant", max_length=255)


class AdminPromoCodeCreateRequest(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    description: str = Field(min_length=2, max_length=255)
    discount_percent: int = Field(default=0, ge=0, le=100)
    is_free: bool = Field(default=False)
    free_duration_days: int = Field(default=1, ge=1, le=365)
    target_plan_id: Optional[str] = Field(default=None)
    max_redemptions: Optional[int] = Field(default=None, ge=1)
    expires_at: Optional[datetime] = Field(default=None)
    active: bool = Field(default=True)


class AdminPromoCodeUpdateRequest(BaseModel):
    description: Optional[str] = Field(default=None, max_length=255)
    discount_percent: Optional[int] = Field(default=None, ge=0, le=100)
    is_free: Optional[bool] = None
    free_duration_days: Optional[int] = Field(default=None, ge=1, le=365)
    target_plan_id: Optional[str] = None
    max_redemptions: Optional[int] = Field(default=None, ge=1)
    expires_at: Optional[datetime] = None
    active: Optional[bool] = None


class AdminPromoCodeDTO(BaseModel):
    id: str
    code: str
    description: str
    discount_percent: int
    is_free: bool
    free_duration_days: int
    target_plan_id: Optional[str] = None
    max_redemptions: Optional[int] = None
    times_redeemed: int
    expires_at: Optional[datetime] = None
    active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminRecentRedemptionDTO(BaseModel):
    id: str
    code: str
    user_email: str
    redeemed_at: datetime
    discount_applied_paise: int
    final_price_paise: int


class AdminPromoMetricsResponse(BaseModel):
    total_coupons: int
    active_coupons: int
    total_redemptions: int
    recent_redemptions: List[AdminRecentRedemptionDTO]
