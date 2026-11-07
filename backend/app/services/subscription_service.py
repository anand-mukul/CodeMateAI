"""
CodeMate AI — Subscription Service (Layer 4 Server-Side Verification)
Handles plan lookups, active subscription lifecycle, plan switches, and subscription expiration.
"""

import json
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.db.base import utc_now, ensure_utc
from app.models.user import User
from app.models.subscription import Plan, Subscription, UsageRecord
from app.schemas.payment import PlanResponse, SubscriptionResponse


class SubscriptionService:
    @classmethod
    async def get_all_active_plans(cls, db: AsyncSession) -> List[Plan]:
        """Returns all publicly available subscription tiers."""
        query = select(Plan).where(Plan.active == True).order_by(Plan.price.asc())
        result = await db.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def get_plan_by_id(cls, db: AsyncSession, plan_id: str) -> Optional[Plan]:
        """Retrieves a specific plan by identifier."""
        query = select(Plan).where(Plan.id == plan_id)
        result = await db.execute(query)
        return result.scalars().first()

    @classmethod
    async def get_active_subscription(cls, db: AsyncSession, user_id: str) -> Optional[Subscription]:
        """Returns the active Subscription model for the given user, initializing Free tier if none exists."""
        sub, _ = await cls.get_or_create_user_subscription(db, user_id)
        return sub

    @classmethod
    async def get_or_create_user_subscription(
        cls, db: AsyncSession, user_id: str
    ) -> Tuple[Subscription, Plan]:
        """
        Retrieves the user's active subscription.
        - If subscription period ended, transitions it to expired and initializes a Free subscription.
        - If no subscription exists, creates a default lifetime/free subscription.
        """
        now = utc_now()

        # Query latest subscription
        query = (
            select(Subscription)
            .where(Subscription.user_id == user_id)
            .order_by(Subscription.created_at.desc())
        )
        result = await db.execute(query)
        sub = result.scalars().first()

        if sub and sub.status == "active":
            # Check period expiration for paid plans
            period_end = ensure_utc(sub.current_period_end)
            if sub.plan_id != "free" and period_end and period_end <= now:
                sub.status = "expired"
                await db.commit()
                await db.refresh(sub)
                # Expired: proceed to create/return fallback Free plan
                sub = None

        if not sub or sub.status != "active":
            # Provision free subscription
            free_plan = await cls.get_plan_by_id(db, "free")
            if not free_plan:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Default Free plan is not seeded in database.",
                )

            # 10 years duration for free tier
            period_end = now + timedelta(days=3650)
            sub = Subscription(
                user_id=user_id,
                plan_id="free",
                billing_provider="system",
                status="active",
                current_period_start=now,
                current_period_end=period_end,
                cancel_at_period_end=False,
            )
            db.add(sub)
            await db.commit()
            await db.refresh(sub)

        # Load associated plan
        plan = await cls.get_plan_by_id(db, sub.plan_id)
        if not plan:
            plan = await cls.get_plan_by_id(db, "free")

        return sub, plan

    @classmethod
    async def activate_subscription(
        cls,
        db: AsyncSession,
        user_id: str,
        plan_id: str,
        provider: str = "razorpay",
        provider_sub_id: Optional[str] = None,
        duration_days: int = 30,
    ) -> Subscription:
        """
        Activates or upgrades a user to a target paid plan.
        """
        now = utc_now()
        plan = await cls.get_plan_by_id(db, plan_id)
        if not plan or not plan.active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid or inactive plan '{plan_id}'.")

        # Determine duration: 1 day for daily plans, 7 days for weekly plans, else duration_days
        if plan.billing_interval == "day":
            calc_days = 1
        elif plan.billing_interval == "week":
            calc_days = 7
        else:
            calc_days = duration_days

        # Deactivate previous active subscriptions while preserving unexpired renewal time
        old_subs_q = select(Subscription).where(
            and_(Subscription.user_id == user_id, Subscription.status == "active")
        )
        old_subs_res = await db.execute(old_subs_q)
        active_same = None
        for s in old_subs_res.scalars().all():
            if s.plan_id == plan_id and ensure_utc(s.current_period_end) and ensure_utc(s.current_period_end) > now:
                active_same = s
            s.status = "upgraded" if s.plan_id != plan_id else "renewed"

        base_time = ensure_utc(active_same.current_period_end) if active_same else now
        period_end = base_time + timedelta(days=calc_days)
        new_sub = Subscription(
            user_id=user_id,
            plan_id=plan_id,
            billing_provider=provider,
            provider_subscription_id=provider_sub_id,
            status="active",
            current_period_start=now,
            current_period_end=period_end,
            cancel_at_period_end=False,
        )
        db.add(new_sub)
        await db.commit()
        await db.refresh(new_sub)
        return new_sub

    @classmethod
    async def cancel_subscription(cls, db: AsyncSession, user_id: str) -> Subscription:
        """Sets an active subscription to cancel at period end."""
        sub, plan = await cls.get_or_create_user_subscription(db, user_id)
        if sub.plan_id == "free":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot cancel Free tier.")

        sub.cancel_at_period_end = True
        await db.commit()
        await db.refresh(sub)
        return sub

    @classmethod
    async def get_usage_today(cls, db: AsyncSession, user_id: str) -> int:
        """Counts all AI requests consumed by user today (UTC date)."""
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        query = select(UsageRecord).where(
            and_(UsageRecord.user_id == user_id, UsageRecord.date == today_str)
        )
        result = await db.execute(query)
        records = result.scalars().all()
        return sum(r.request_count for r in records)

    @classmethod
    async def get_subscription_summary(cls, db: AsyncSession, user_id: str) -> SubscriptionResponse:
        """Builds a rich, sanitized subscription and entitlement summary for the user."""
        sub, plan = await cls.get_or_create_user_subscription(db, user_id)
        entitlements = json.loads(plan.feature_entitlements) if plan.feature_entitlements else []
        usage_today = await cls.get_usage_today(db, user_id)
        remaining = max(0, plan.ai_usage_limit - usage_today)

        return SubscriptionResponse(
            id=sub.id,
            plan_id=plan.id,
            plan_name=plan.name,
            billing_provider=sub.billing_provider,
            status=sub.status,
            current_period_start=sub.current_period_start,
            current_period_end=sub.current_period_end,
            cancel_at_period_end=sub.cancel_at_period_end,
            device_limit=plan.device_limit,
            concurrent_session_limit=plan.concurrent_session_limit,
            ai_usage_limit=plan.ai_usage_limit,
            usage_today=usage_today,
            remaining_quota_today=remaining,
            entitlements=entitlements,
        )
