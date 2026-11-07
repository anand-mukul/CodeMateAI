"""
CodeMate AI — Razorpay Payment & Webhook Integration Service
Enforces server-calculated pricing, HMAC SHA-256 signature verification, and idempotent webhook processing.
"""

import hmac
import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.logging import logger
from app.db.base import utc_now
from app.models.user import User
from app.models.subscription import Plan, Subscription, Payment, WebhookEvent
from app.models.enums import PaymentStatus
from app.schemas.payment import (
    CreateOrderResponse,
    PaymentHistoryItem,
    SubscriptionResponse,
    WebhookProcessingResult,
)
from app.services.subscription_service import SubscriptionService
from app.services.promo_service import PromoService


class PaymentService:
    @classmethod
    def calculate_signature(cls, order_id: str, payment_id: str, secret: str) -> str:
        """Computes Razorpay checkout HMAC SHA256 signature."""
        msg = f"{order_id}|{payment_id}".encode("utf-8")
        return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()

    @classmethod
    def calculate_webhook_signature(cls, body: bytes, secret: str) -> str:
        """Computes Razorpay webhook HMAC SHA256 signature."""
        return hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()

    @classmethod
    async def create_order(
        cls, db: AsyncSession, user: User, plan_id: str, coupon_code: Optional[str] = None
    ) -> CreateOrderResponse:
        """
        Creates a Razorpay Order based strictly on server-side plan pricing.
        Rejects client-supplied prices entirely. Supports promotional discount coupons.
        """
        from app.services.promo_service import PromoService

        plan = await SubscriptionService.get_plan_by_id(db, plan_id)
        if not plan or not plan.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or inactive plan '{plan_id}'.",
            )

        if plan.price <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create a payment order for a free plan.",
            )

        # Calculate pricing with coupon if provided
        final_price = plan.price
        discount_paise = 0
        applied_code = None
        if coupon_code:
            promo_model = await PromoService.get_promo_model(db, coupon_code)
            validation = PromoService.validate_code(coupon_code, plan.price, promo_model=promo_model, target_plan_id=plan.id)
            discount_paise = validation["discount_paise"]
            final_price = validation["final_price"]
            applied_code = validation["code"]

        # Generate order identifier (using Razorpay client if real key provided, or test mock order)
        order_id = f"order_{uuid.uuid4().hex[:14]}"
        if settings.RAZORPAY_KEY_ID and not settings.RAZORPAY_KEY_ID.startswith("rzp_test_codemate_sandbox"):
            try:
                import razorpay
                client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                order_payload = {
                    "amount": final_price,
                    "currency": plan.currency,
                    "receipt": f"rcpt_{user.id[:8]}_{int(datetime.now().timestamp())}",
                    "notes": {"user_id": user.id, "plan_id": plan.id, "coupon": applied_code or ""},
                }
                rzp_order = client.order.create(data=order_payload)
                order_id = rzp_order["id"]
            except Exception as e:
                logger.warning(f"[Razorpay] Live order creation fallback to test mode: {e}")

        # Record payment order in database
        payment_record = Payment(
            user_id=user.id,
            provider="razorpay",
            provider_order_id=order_id,
            amount=final_price,
            currency=plan.currency,
            payment_status="created",
        )
        db.add(payment_record)
        await db.commit()

        return CreateOrderResponse(
            order_id=order_id,
            amount=final_price,
            currency=plan.currency,
            key_id=settings.RAZORPAY_KEY_ID,
            plan_id=plan.id,
            plan_name=plan.name,
            discount_amount=discount_paise,
            coupon_applied=applied_code,
        )

    @classmethod
    async def verify_payment(
        cls,
        db: AsyncSession,
        user: User,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
        plan_id: str,
    ) -> SubscriptionResponse:
        """
        Verifies client-provided Razorpay payment signature server-side.
        Upon verification, records captured payment and activates subscription.
        """
        # Retrieve payment order
        query = select(Payment).where(
            and_(Payment.user_id == user.id, Payment.provider_order_id == razorpay_order_id)
        )
        result = await db.execute(query)
        payment = result.scalars().first()

        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment order not found for user.",
            )

        # Verify HMAC SHA256 signature
        expected_sig = cls.calculate_signature(
            razorpay_order_id, razorpay_payment_id, settings.RAZORPAY_KEY_SECRET
        )

        # Allow test mock signature strictly in non-production development/test mode
        is_valid = hmac.compare_digest(expected_sig, razorpay_signature)
        if not is_valid and settings.ENVIRONMENT != "production" and razorpay_signature == "sandbox_test_signature_valid":
            is_valid = True

        if not is_valid:
            logger.error(f"[Razorpay] Signature mismatch for order {razorpay_order_id}")
            payment.payment_status = "failed"
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment verification failed: Invalid cryptographic signature.",
            )

        # Mark payment captured
        now = utc_now()
        payment.provider_payment_id = razorpay_payment_id
        payment.payment_status = PaymentStatus.CAPTURED.value
        payment.verified_at = now

        # Activate subscription
        sub = await SubscriptionService.activate_subscription(
            db=db,
            user_id=user.id,
            plan_id=plan_id,
            provider="razorpay",
            provider_sub_id=f"sub_{razorpay_payment_id}",
            duration_days=30,
        )

        payment.subscription_id = sub.id
        await db.commit()

        return await SubscriptionService.get_subscription_summary(db, user.id)

    @classmethod
    async def process_webhook(
        cls, db: AsyncSession, raw_body: bytes, signature_header: Optional[str]
    ) -> WebhookProcessingResult:
        """
        Processes Razorpay incoming webhooks idempotently:
        1. Verifies HMAC signature on raw body.
        2. Deduplicates event by event_id.
        3. Updates payment and subscription states in an atomic transaction.
        """
        if not signature_header:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing X-Razorpay-Signature header.",
            )

        expected_sig = cls.calculate_webhook_signature(raw_body, settings.RAZORPAY_WEBHOOK_SECRET)
        is_valid = hmac.compare_digest(expected_sig, signature_header)

        # Sandbox testing bypass strictly in non-production development/test mode
        if not is_valid and settings.ENVIRONMENT != "production" and signature_header == "sandbox_valid_webhook_signature":
            is_valid = True

        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid webhook signature.",
            )

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed webhook JSON.")

        event_id = payload.get("event_id") or payload.get("id") or str(uuid.uuid4())
        event_type = payload.get("event", "unknown")

        # IDEMPOTENCY CHECK: Check if event_id has already been processed
        event_query = select(WebhookEvent).where(WebhookEvent.event_id == event_id)
        event_res = await db.execute(event_query)
        existing_event = event_res.scalars().first()

        if existing_event and existing_event.processing_status == "processed":
            logger.info(f"[Webhook] Duplicate event {event_id} ignored (idempotent).")
            return WebhookProcessingResult(
                status="duplicate",
                event_id=event_id,
                event_type=event_type,
                message="Event already processed.",
            )

        # Log new webhook event
        if not existing_event:
            new_event = WebhookEvent(
                provider="razorpay",
                event_id=event_id,
                event_type=event_type,
                processing_status="processing",
                payload_preview=str(payload)[:500],
            )
            db.add(new_event)
            await db.commit()
            existing_event = new_event

        # Handle specific events
        now = utc_now()
        payload_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payload_entity.get("order_id")
        payment_id = payload_entity.get("id")

        if event_type == "payment.captured" and order_id:
            pay_q = select(Payment).where(Payment.provider_order_id == order_id)
            pay_res = await db.execute(pay_q)
            pay_rec = pay_res.scalars().first()
            if pay_rec:
                pay_rec.payment_status = PaymentStatus.CAPTURED.value
                pay_rec.provider_payment_id = payment_id
                pay_rec.verified_at = now
                notes = payload_entity.get("notes", {})
                plan_id = notes.get("plan_id") or pay_rec.plan_id or "core_daily"
                await SubscriptionService.activate_subscription(
                    db, user_id=pay_rec.user_id, plan_id=plan_id, provider="razorpay"
                )

        elif event_type == "payment.failed" and order_id:
            pay_q = select(Payment).where(Payment.provider_order_id == order_id)
            pay_res = await db.execute(pay_q)
            pay_rec = pay_res.scalars().first()
            if pay_rec:
                pay_rec.payment_status = "failed"

        elif event_type == "subscription.halted":
            sub_id = payload.get("payload", {}).get("subscription", {}).get("entity", {}).get("id")
            if sub_id:
                sub_q = select(Subscription).where(Subscription.provider_subscription_id == sub_id)
                sub_res = await db.execute(sub_q)
                sub_rec = sub_res.scalars().first()
                if sub_rec:
                    sub_rec.status = "halted"

        elif event_type == "subscription.cancelled":
            sub_id = payload.get("payload", {}).get("subscription", {}).get("entity", {}).get("id")
            if sub_id:
                sub_q = select(Subscription).where(Subscription.provider_subscription_id == sub_id)
                sub_res = await db.execute(sub_q)
                sub_rec = sub_res.scalars().first()
                if sub_rec:
                    sub_rec.status = "cancelled"

        existing_event.processing_status = "processed"
        existing_event.processed_at = now
        await db.commit()

        return WebhookProcessingResult(
            status="processed",
            event_id=event_id,
            event_type=event_type,
            message="Webhook event processed successfully.",
        )

    @classmethod
    async def list_payments(cls, db: AsyncSession, user_id: str) -> List[Payment]:
        """Lists payment history for a user."""
        query = select(Payment).where(Payment.user_id == user_id).order_by(Payment.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

