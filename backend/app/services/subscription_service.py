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
from app.models.enums import BillingInterval, SubscriptionStatus, PlanTier, UserRole
from app.schemas.payment import PlanResponse, SubscriptionResponse


class SubscriptionService:
    @classmethod
    async def get_all_active_plans(cls, db: AsyncSession) -> List[Plan]:
        """Returns all publicly available subscription tiers."""
        query = select(Plan).where(Plan.active == True).order_by(Plan.price.asc())
        result = await db.execute(query)
        return list(result.scalars().all())

    @classmethod
    def _create_admin_plan(cls) -> Plan:
        all_features = [
            "analyze", "explain", "generate", "optimize", "fix",
            "autopilot", "one_click_insert", "byok", "project_intelligence", "admin"
        ]
        return Plan(
            id="ENTERPRISE_ADMIN",
            name="Enterprise Super Admin",
            description="Unlimited platform administration & full AI engine access",
            price=0,
            currency="INR",
            billing_interval="unlimited",
            device_limit=999,
            concurrent_session_limit=999,
            ai_usage_limit=999999,
            feature_entitlements=json.dumps(all_features),
            active=True,
        )

    @classmethod
    async def get_plan_by_id(cls, db: AsyncSession, plan_id: str) -> Optional[Plan]:
        """Retrieves a canonical plan by identifier (FREE, PLAN_CORE_PASS, PLAN_AUTOPILOT_PASS)."""
        if plan_id == "ENTERPRISE_ADMIN":
            return cls._create_admin_plan()

        clean_id = (plan_id or "").strip()
        query = select(Plan).where((Plan.id == clean_id) | (Plan.id == clean_id.upper()))
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
        - Platform administrators (ADMIN) automatically receive an Enterprise Admin plan.
        - If subscription period ended, transitions it to expired and initializes a Free subscription.
        - If no subscription exists, creates a default lifetime/free subscription.
        """
        now = utc_now()

        # Check if user is a platform administrator (ADMIN)
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalars().first()
        if user and (user.role or "").upper() == UserRole.ADMIN.value:
            admin_plan = cls._create_admin_plan()
            admin_sub = Subscription(
                id="admin_enterprise_sub",
                user_id=user_id,
                plan_id=admin_plan.id,
                billing_provider="internal",
                status=SubscriptionStatus.ACTIVE.value,
                current_period_start=now,
                current_period_end=now + timedelta(days=36500),
                cancel_at_period_end=False,
            )
            return admin_sub, admin_plan

        # Query latest subscription
        query = (
            select(Subscription)
            .where(Subscription.user_id == user_id)
            .order_by(Subscription.created_at.desc())
        )
        result = await db.execute(query)
        sub = result.scalars().first()

        if sub and (sub.status or "").upper() == SubscriptionStatus.ACTIVE.value:
            # Check period expiration for paid plans
            period_end = ensure_utc(sub.current_period_end)
            if (sub.plan_id or "").upper() not in ("FREE", "FREE_TIER") and period_end and period_end <= now:
                sub.status = SubscriptionStatus.EXPIRED.value
                await db.commit()
                await db.refresh(sub)
                # Expired: proceed to create/return fallback Free plan
                sub = None

        if not sub or (sub.status or "").upper() != SubscriptionStatus.ACTIVE.value:
            # Provision free subscription
            free_plan = await cls.get_plan_by_id(db, PlanTier.FREE.value)
            if not free_plan:
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
                plan_id=free_plan.id,
                billing_provider="system",
                status=SubscriptionStatus.ACTIVE.value,
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
            plan = await cls.get_plan_by_id(db, PlanTier.FREE.value) or await cls.get_plan_by_id(db, "free")

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
        interval = (plan.billing_interval or "").upper()
        if interval in ("DAY", "DAILY"):
            calc_days = 1
        elif interval in ("WEEK", "WEEKLY"):
            calc_days = 7
        else:
            calc_days = duration_days

        # Deactivate previous active subscriptions while preserving unexpired renewal time
        old_subs_q = select(Subscription).where(
            and_(Subscription.user_id == user_id, Subscription.status == SubscriptionStatus.ACTIVE.value)
        )
        old_subs_res = await db.execute(old_subs_q)
        active_same = None
        for s in old_subs_res.scalars().all():
            if s.plan_id == plan_id and ensure_utc(s.current_period_end) and ensure_utc(s.current_period_end) > now:
                active_same = s
            s.status = SubscriptionStatus.EXPIRED.value

        base_time = ensure_utc(active_same.current_period_end) if active_same else now
        period_end = base_time + timedelta(days=calc_days)
        new_sub = Subscription(
            user_id=user_id,
            plan_id=plan.id,
            billing_provider=provider,
            provider_subscription_id=provider_sub_id,
            status=SubscriptionStatus.ACTIVE.value,
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
        if (sub.plan_id or "").upper() in ("FREE", "FREE_TIER"):
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

        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalars().first()
        if user and (user.role or "").upper() == UserRole.ADMIN.value:
            return SubscriptionResponse(
                id=sub.id,
                plan_id=PlanTier.PLAN_AUTOPILOT_PASS.value,
                plan_name="Admin AutoPilot Pass",
                billing_provider="internal",
                status=SubscriptionStatus.ACTIVE.value,
                current_period_start=sub.current_period_start,
                current_period_end=sub.current_period_end,
                cancel_at_period_end=False,
                device_limit=999,
                concurrent_session_limit=999,
                ai_usage_limit=999999,
                usage_today=usage_today,
                remaining_quota_today=999999,
                entitlements=[
                    "analyze",
                    "explain",
                    "generate",
                    "optimize",
                    "fix",
                    "one_click_insert",
                    "byok",
                    "fast_model",
                    "autopilot",
                ],
            )

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
