"""
CodeMate AI — Subscription & Entitlement Endpoints (Layer 4)
Exposes plan details, active subscription status, daily quota usage, and cancellation.
"""

import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.payment import PlanResponse, SubscriptionResponse
from app.schemas.promo import (
    ValidatePromoRequest,
    ValidatePromoResponse,
    RedeemPromoRequest,
    RedeemPromoResponse,
)
from app.services.subscription_service import SubscriptionService
from app.services.promo_service import PromoService
from app.services.entitlement_service import get_current_user

router = APIRouter(prefix="/subscription", tags=["Subscription"])


@router.get("/plans", response_model=List[PlanResponse])
async def list_available_plans(db: AsyncSession = Depends(get_db)):
    """Retrieves all publicly available subscription tiers."""
    plans = await SubscriptionService.get_all_active_plans(db)
    output = []
    for p in plans:
        output.append(
            PlanResponse(
                id=p.id,
                name=p.name,
                description=p.description,
                price=p.price,
                currency=p.currency,
                billing_interval=p.billing_interval,
                device_limit=p.device_limit,
                concurrent_session_limit=p.concurrent_session_limit,
                ai_usage_limit=p.ai_usage_limit,
                feature_entitlements=json.loads(p.feature_entitlements) if p.feature_entitlements else [],
                active=p.active,
            )
        )
    return output


@router.get("/me", response_model=SubscriptionResponse)
async def get_my_subscription(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the user's active plan, subscription validity, daily AI quota consumption,
    and granted feature entitlements.
    """
    return await SubscriptionService.get_subscription_summary(db, user.id)


@router.post("/cancel", response_model=SubscriptionResponse)
async def cancel_subscription_at_period_end(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancels the current paid subscription at the conclusion of the active billing period."""
    await SubscriptionService.cancel_subscription(db, user.id)
    return await SubscriptionService.get_subscription_summary(db, user.id)


@router.post("/validate-promo", response_model=ValidatePromoResponse)
async def validate_promo_code(
    payload: ValidatePromoRequest,
    db: AsyncSession = Depends(get_db),
):
    """Validates coupon codes and calculates percentage and rupee discounts."""
    plan = await SubscriptionService.get_plan_by_id(db, payload.plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail=f"Plan '{payload.plan_id}' not found.")

    promo_model = await PromoService.get_promo_model(db, payload.code)
    res = PromoService.validate_code(payload.code, plan.price, promo_model=promo_model, target_plan_id=plan.id)
    return ValidatePromoResponse(
        valid=res["valid"],
        code=res["code"],
        discount_percent=res["discount_percent"],
        original_price=res["original_price"],
        discount_paise=res["discount_paise"],
        final_price=res["final_price"],
        is_free=res["is_free"],
        free_duration_days=res.get("free_duration_days", 1),
        description=res.get("description", ""),
        message=f"{res['description']} applied successfully!",
    )


@router.post("/redeem-promo", response_model=RedeemPromoResponse)
async def redeem_promo_code(
    payload: RedeemPromoRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Redeems 100% free promotional passes (e.g. CAMPUS100, FREEPASS, AMBASSADOR).
    Bypasses Razorpay checkout completely and directly activates the subscription.
    """
    plan_id = payload.plan_id or "autopilot_daily"
    res = await PromoService.redeem_promo(db, user, payload.code, plan_id)
    return RedeemPromoResponse(
        success=res["success"],
        message=res["message"],
        plan_name=res["plan_name"],
        duration_days=res["duration_days"],
        subscription=res["subscription"],
    )

