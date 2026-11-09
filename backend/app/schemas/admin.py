"""
CodeMate AI — Phase 8 Admin Schemas
Contracts for user administration, role assignment, subscription inspection, payments, refunds, revenue, and audit logs.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AdminUserSummaryDTO(BaseModel):
    id: str
    email: str
    display_name: str
    role: str
    account_status: str
    email_verified: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None
    plan_id: Optional[str] = "free"
    plan_name: Optional[str] = "Free"
    device_count: int = 0
    active_session_count: int = 0


class AdminUserSuspendRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class AdminUserRoleUpdateRequest(BaseModel):
    role: str = Field(..., pattern=r"^(user|admin|USER|ADMIN)$")
    reason: str = Field(..., min_length=3, max_length=500)


class AdminAddUserNoteRequest(BaseModel):
    note: str = Field(..., min_length=1, max_length=1000)


class AdminGrantEntitlementRequest(BaseModel):
    feature: str = Field(..., min_length=2, max_length=100)
    duration_days: int = Field(default=30, ge=1, le=365)
    reason: str = Field(..., min_length=3, max_length=500)


class AdminAuditLogDTO(BaseModel):
    id: str
    admin_user_id: Optional[str]
    target_user_id: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    details_json: Optional[str]
    ip_address: Optional[str]
    created_at: datetime


class AdminSystemHealthResponse(BaseModel):
    status: str
    timestamp: datetime
    database: Dict[str, Any]
    ai_providers: Dict[str, Any]
    redis: Optional[Dict[str, Any]] = None
    active_sessions_count: int
    unresolved_tickets_count: int
    pending_feedback_count: int


class AdminAIProviderInfo(BaseModel):
    id: str
    name: str
    models: List[str]
    default_model: str
    configured: bool
    status: str


class AdminAIProviderStatusResponse(BaseModel):
    active_provider: str
    active_model: str
    available_providers: List[AdminAIProviderInfo]


class AdminUpdateAIProviderRequest(BaseModel):
    provider: str = Field(..., pattern=r"^(deepseek|gemini|openrouter|openai|anthropic|xai)$")
    model: Optional[str] = Field(None, max_length=100)


class AdminTestAIProviderRequest(BaseModel):
    provider: str = Field(..., pattern=r"^(deepseek|gemini|openrouter|openai|anthropic|xai)$")
    model: Optional[str] = Field(None, max_length=100)


class AdminPaymentSummaryDTO(BaseModel):
    id: str
    user_id: str
    user_email: str
    plan_id: Optional[str]
    plan_name: Optional[str]
    amount_paise: int
    amount_rupees: float
    currency: str
    payment_status: str
    provider: str
    provider_order_id: str
    provider_payment_id: Optional[str]
    coupon_code: Optional[str]
    discount_amount_paise: int
    created_at: datetime
    verified_at: Optional[datetime]


class AdminRefundRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)
    amount_paise: Optional[int] = Field(None, description="Optional partial refund amount in paise")


class AdminSubscriptionSummaryDTO(BaseModel):
    id: str
    user_id: str
    user_email: str
    plan_id: str
    plan_name: str
    status: str
    billing_provider: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    created_at: datetime


class AdminRevenueAnalyticsResponse(BaseModel):
    gross_collected_rupees: float
    total_refunds_rupees: float
    net_revenue_rupees: float
    gross_collected_usd: float
    net_revenue_usd: float
    total_paying_customers: int
    active_paid_subscriptions: int
    payment_success_rate: float
    estimated_mrr_rupees: float
    estimated_arr_rupees: float
    revenue_by_plan: List[Dict[str, Any]]
    daily_revenue_timeline: List[Dict[str, Any]]


class AdminAIDetailedCostResponse(BaseModel):
    total_tokens_consumed: int
    estimated_total_cost_usd: float
    estimated_total_cost_inr: float
    active_primary_provider: str
    active_primary_model: str
    cost_by_model: List[Dict[str, Any]]
    cost_by_feature: List[Dict[str, Any]]
    daily_cost_timeline: List[Dict[str, Any]]


class AdminBackgroundJobDTO(BaseModel):
    id: str
    name: str
    schedule: str
    status: str
    last_run_at: Optional[datetime]
    next_run_at: Optional[datetime]
    duration_ms: Optional[float]
    details: Optional[Dict[str, Any]] = None


class AdminSettingsDTO(BaseModel):
    maintenance_mode: bool = False
    announcement_banner: Optional[str] = None
    daily_ai_request_global_cap: int = 100000
    allow_new_registrations: bool = True
    updated_at: datetime


class AdminFeatureFlagDTO(BaseModel):
    id: str
    key: str
    name: str
    description: Optional[str] = None
    is_enabled: bool
    target_audience: str
    minimum_plan: Optional[str] = None
    rollout_percentage: int
    created_at: datetime
    updated_at: datetime


class AdminFeatureFlagUpdateRequest(BaseModel):
    is_enabled: Optional[bool] = None
    rollout_percentage: Optional[int] = Field(None, ge=0, le=100)
    target_audience: Optional[str] = None
    description: Optional[str] = None

