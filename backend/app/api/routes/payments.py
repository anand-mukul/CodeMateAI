"""
CodeMate AI — Razorpay Payment Endpoints
Handles order creation, signature verification, webhook intake, and payment audit history.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.schemas.payment import (
    CreateOrderRequest,
    CreateOrderResponse,
    PaymentHistoryItem,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
    WebhookProcessingResult,
)
from app.services.payment_service import PaymentService
from app.services.subscription_service import SubscriptionService
from app.services.entitlement_service import get_current_user

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_payment_order(
    payload: CreateOrderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Creates a server-calculated Razorpay order for the selected plan.
    Client-supplied pricing is strictly disallowed.
    Supports promotional discount coupons.
    """
    return await PaymentService.create_order(
        db, user, payload.plan_id, coupon_code=payload.coupon_code
    )


@router.post("/verify", response_model=VerifyPaymentResponse)
async def verify_payment_signature(
    payload: VerifyPaymentRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Verifies payment signature using server-side Razorpay secret and activates subscription.
    """
    updated_sub = await PaymentService.verify_payment(
        db=db,
        user=user,
        razorpay_order_id=payload.razorpay_order_id,
        razorpay_payment_id=payload.razorpay_payment_id,
        razorpay_signature=payload.razorpay_signature,
        plan_id=payload.plan_id,
    )
    return VerifyPaymentResponse(
        success=True,
        message="Payment verified successfully. Subscription activated.",
        subscription=updated_sub,
    )


@router.post("/webhook", response_model=WebhookProcessingResult)
async def handle_razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_razorpay_signature: Optional[str] = Header(default=None, alias="X-Razorpay-Signature"),
):
    """
    Ingests and processes Razorpay webhooks idempotently with raw HMAC signature verification.
    """
    raw_body = await request.body()
    return await PaymentService.process_webhook(db, raw_body, x_razorpay_signature)


@router.get("/history", response_model=List[PaymentHistoryItem])
async def get_payment_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves payment history for the authenticated user."""
    payments = await PaymentService.list_payments(db, user.id)
    return payments


@router.get("/checkout")
async def serve_razorpay_checkout(
    plan_id: str = Query(..., description="Target Subscription Plan ID"),
    coupon_code: Optional[str] = Query(None, description="Promotional Coupon Code"),
    token: Optional[str] = Query(None, description="User JWT Access Token"),
):
    """Redirects to the Next.js frontend checkout page."""
    params = [f"plan_id={plan_id}"]
    if coupon_code:
        params.append(f"coupon={coupon_code}")
    if token:
        params.append(f"token={token}")
    query_str = "&".join(params)
    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/pricing?{query_str}",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )
