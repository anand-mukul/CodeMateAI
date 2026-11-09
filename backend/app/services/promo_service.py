"""
CodeMate AI — Promotional Codes & Access Grant Service
Production database-backed promo code validation, redemption abuse protection,
and full administrative CRUD coupon governance.
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy import select, and_, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utc_now, ensure_utc
from app.models.user import User
from app.models.subscription import Plan, Subscription, PromoCode, PromoRedemption
from app.models.admin import AdminAuditLog
from app.models.enums import SubscriptionStatus, PlanTier
from app.schemas.promo import (
    AdminPromoCodeCreateRequest,
    AdminPromoCodeUpdateRequest,
    AdminRecentRedemptionDTO,
)
from app.services.subscription_service import SubscriptionService


class PromoService:
    """
    Database-backed promo code governance.
    All coupons are strictly managed by administrators via database models and UI.
    Prevents duplicate redemptions per user and tracks real-time redemption metrics.
    """

    @classmethod
    async def get_promo_model(cls, db: AsyncSession, code: str) -> Optional[PromoCode]:
        """Queries the database for a promo code (active or inactive)."""
        clean = (code or "").strip().upper()
        q = select(PromoCode).where(PromoCode.code == clean)
        res = await db.execute(q)
        return res.scalars().first()

    @classmethod
    def validate_code(
        cls,
        code: str,
        plan_price_paise: int,
        promo_model: Optional[PromoCode] = None,
        target_plan_id: Optional[str] = None,
    ) -> dict:
        clean = (code or "").strip().upper()

        if not promo_model:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid or inactive promo code '{code}'.",
            )

        if not promo_model.active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Promo code '{clean}' is currently inactive or paused.",
            )

        # Check target plan restriction
        if promo_model.target_plan_id and target_plan_id and promo_model.target_plan_id != target_plan_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Promo code '{clean}' is only valid for the '{promo_model.target_plan_id}' pass.",
            )

        # Check max redemptions
        if promo_model.max_redemptions and promo_model.times_redeemed >= promo_model.max_redemptions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Promo code '{clean}' has reached its maximum redemption limit.",
            )

        # Check expiration
        now = utc_now()
        exp = ensure_utc(promo_model.expires_at)
        if exp and exp <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Promo code '{clean}' expired on {exp.strftime('%Y-%m-%d')}.",
            )

        discount_percent = promo_model.discount_percent
        is_free = promo_model.is_free
        free_duration_days = promo_model.free_duration_days
        description = promo_model.description

        discount_paise = int(plan_price_paise * (discount_percent / 100.0))
        final_price = max(0, plan_price_paise - discount_paise)

        return {
            "valid": True,
            "code": clean,
            "discount_percent": discount_percent,
            "original_price": plan_price_paise,
            "discount_paise": discount_paise,
            "final_price": final_price,
            "is_free": is_free,
            "free_duration_days": free_duration_days,
            "description": description,
        }

    @classmethod
    async def redeem_promo(
        cls,
        db: AsyncSession,
        user: User,
        code: str,
        plan_id: str = PlanTier.PLAN_AUTOPILOT_PASS.value,
    ) -> dict:
        """
        Redeems a 100% free promotional pass.
        Bypasses Razorpay completely, saving payment gateway transaction fees,
        and directly provisions the subscription with single-redemption tracking.
        """
        clean = (code or "").strip().upper()

        # Fetch plan (case-resilient, handles aliases)
        norm_plan_id = plan_id.upper() if plan_id else PlanTier.PLAN_AUTOPILOT_PASS.value
        plan_query = select(Plan).where(or_(Plan.id == norm_plan_id, Plan.id == plan_id))
        plan_res = await db.execute(plan_query)
        plan = plan_res.scalars().first()
        if not plan:
            plan_query = select(Plan).where(Plan.id == PlanTier.PLAN_AUTOPILOT_PASS.value)
            plan_res = await db.execute(plan_query)
            plan = plan_res.scalars().first()

        # Query PromoCode from database
        promo_model = await cls.get_promo_model(db, clean)
        validation = cls.validate_code(clean, plan.price, promo_model, target_plan_id=plan.id)

        if not validation["is_free"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Promo code '{clean}' provides a {validation['discount_percent']}% discount. Please use Razorpay checkout to apply this code.",
            )

        # Enforce single redemption per user
        if promo_model:
            redemption_q = select(PromoRedemption).where(
                and_(PromoRedemption.promo_code_id == promo_model.id, PromoRedemption.user_id == user.id)
            )
            existing_redemption = (await db.execute(redemption_q)).scalars().first()
            if existing_redemption:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"You have already redeemed promo code '{clean}'. Each account is limited to 1 redemption per promo.",
                )

        duration_days = validation["free_duration_days"]
        now = utc_now()

        # Check existing subscription
        sub, _ = await SubscriptionService.get_or_create_user_subscription(db, user.id)

        # Extend from remaining period or start fresh
        start_time = now
        current_end = ensure_utc(sub.current_period_end)
        if current_end and current_end > now and sub.plan_id == plan.id:
            end_time = current_end + timedelta(days=duration_days)
        else:
            end_time = now + timedelta(days=duration_days)

        sub.plan_id = plan.id
        sub.status = SubscriptionStatus.ACTIVE.value
        sub.billing_provider = "promo_code"
        sub.current_period_start = start_time
        sub.current_period_end = end_time
        sub.cancel_at_period_end = False
        sub.updated_at = now

        # Record redemption
        if promo_model:
            promo_model.times_redeemed += 1
            redemption = PromoRedemption(
                promo_code_id=promo_model.id,
                user_id=user.id,
                redeemed_at=now,
                discount_applied_paise=validation["discount_paise"],
                final_price_paise=0,
            )
            db.add(redemption)

        # Add audit record
        audit = AdminAuditLog(
            admin_user_id=user.id,
            target_user_id=user.id,
            action="PROMO_CODE_REDEEMED",
            resource_type="subscription",
            resource_id=sub.id,
            details_json=f"User redeemed promo code '{validation['code']}' ({validation['description']}) for {duration_days} day(s) of '{plan.name}'.",
        )
        db.add(audit)
        await db.commit()

        summary = await SubscriptionService.get_subscription_summary(db, user.id)
        return {
            "success": True,
            "message": f"🎉 Promo code applied! You have been granted {duration_days} day(s) of '{plan.name}' access for free.",
            "plan_name": plan.name,
            "duration_days": duration_days,
            "subscription": summary,
        }

    @classmethod
    async def grant_admin_subscription(
        cls,
        db: AsyncSession,
        admin_user: User,
        target_email: str,
        plan_id: str,
        duration_days: int,
        reason: str,
    ) -> dict:
        """
        Grants free promotional access directly to a specific user/account.
        Ideal for influencers, campus ambassadors, hackathon organizers, and VIP testers.
        """
        user_q = select(User).where(User.email == target_email.strip().lower())
        user_res = await db.execute(user_q)
        target_user = user_res.scalars().first()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"User with email '{target_email}' does not exist.",
            )

        plan_q = select(Plan).where(Plan.id == plan_id)
        plan_res = await db.execute(plan_q)
        plan = plan_res.scalars().first()
        if not plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Plan '{plan_id}' does not exist.",
            )

        now = utc_now()
        sub, _ = await SubscriptionService.get_or_create_user_subscription(db, target_user.id)

        current_end = ensure_utc(sub.current_period_end)
        if current_end and current_end > now and sub.plan_id == plan.id:
            end_time = current_end + timedelta(days=duration_days)
        else:
            end_time = now + timedelta(days=duration_days)

        sub.plan_id = plan.id
        sub.status = SubscriptionStatus.ACTIVE.value
        sub.billing_provider = "admin_promotional_grant"
        sub.current_period_start = now
        sub.current_period_end = end_time
        sub.cancel_at_period_end = False
        sub.updated_at = now

        audit = AdminAuditLog(
            admin_user_id=admin_user.id,
            target_user_id=target_user.id,
            action="ADMIN_SUBSCRIPTION_GRANTED",
            resource_type="subscription",
            resource_id=sub.id,
            details_json=f"Admin '{admin_user.email}' granted {duration_days} day(s) of '{plan.name}' to '{target_user.email}'. Reason: {reason}",
        )
        db.add(audit)
        await db.commit()

        summary = await SubscriptionService.get_subscription_summary(db, target_user.id)
        return {
            "success": True,
            "message": f"Successfully granted {duration_days} day(s) of '{plan.name}' to {target_user.email}.",
            "target_email": target_user.email,
            "plan_name": plan.name,
            "duration_days": duration_days,
            "expires_at": end_time.isoformat(),
            "subscription": summary,
        }

    # =========================================================================
    # Administrative CRUD Operations for Promo Codes
    # =========================================================================

    @classmethod
    async def list_coupons(
        cls,
        db: AsyncSession,
        search: Optional[str] = None,
        active_only: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[PromoCode]:
        """Lists all promo codes with optional search and active filtering."""
        q = select(PromoCode).order_by(PromoCode.created_at.desc())

        if search:
            s = f"%{search.strip().upper()}%"
            q = q.where(or_(PromoCode.code.ilike(s), PromoCode.description.ilike(s)))

        if active_only is not None:
            q = q.where(PromoCode.active == active_only)

        q = q.limit(limit).offset(offset)
        res = await db.execute(q)
        return list(res.scalars().all())

    @classmethod
    async def create_coupon(
        cls,
        db: AsyncSession,
        admin_user: User,
        data: AdminPromoCodeCreateRequest,
    ) -> PromoCode:
        """Creates a new promo code with audit logging."""
        clean_code = data.code.strip().upper()

        # Check uniqueness
        existing = await cls.get_promo_model(db, clean_code)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Promo code '{clean_code}' already exists.",
            )

        # Validate target plan if specified
        if data.target_plan_id:
            plan = (await db.execute(select(Plan).where(Plan.id == data.target_plan_id))).scalars().first()
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Target plan '{data.target_plan_id}' does not exist.",
                )

        # If is_free is True, ensure discount_percent is 100
        discount_percent = 100 if data.is_free else data.discount_percent

        promo = PromoCode(
            code=clean_code,
            description=data.description.strip(),
            discount_percent=discount_percent,
            is_free=data.is_free,
            free_duration_days=data.free_duration_days if data.is_free else 1,
            target_plan_id=data.target_plan_id,
            max_redemptions=data.max_redemptions,
            times_redeemed=0,
            expires_at=data.expires_at,
            active=data.active,
        )
        db.add(promo)
        await db.flush()

        audit = AdminAuditLog(
            admin_user_id=admin_user.id,
            action="CREATE_PROMO_CODE",
            resource_type="promo_code",
            resource_id=promo.id,
            details_json=f"Admin '{admin_user.email}' created promo code '{promo.code}' ({promo.discount_percent}% off, free={promo.is_free}).",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(promo)
        return promo

    @classmethod
    async def update_coupon(
        cls,
        db: AsyncSession,
        admin_user: User,
        coupon_id: str,
        data: AdminPromoCodeUpdateRequest,
    ) -> PromoCode:
        """Updates an existing promo code."""
        q = select(PromoCode).where(PromoCode.id == coupon_id)
        promo = (await db.execute(q)).scalars().first()
        if not promo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Promo code with ID '{coupon_id}' not found.",
            )

        if data.description is not None:
            promo.description = data.description.strip()
        if data.discount_percent is not None:
            promo.discount_percent = data.discount_percent
        if data.is_free is not None:
            promo.is_free = data.is_free
            if promo.is_free:
                promo.discount_percent = 100
        if data.free_duration_days is not None:
            promo.free_duration_days = data.free_duration_days
        if data.target_plan_id is not None:
            promo.target_plan_id = data.target_plan_id if data.target_plan_id != "" else None
        if data.max_redemptions is not None:
            promo.max_redemptions = data.max_redemptions
        if data.expires_at is not None:
            promo.expires_at = data.expires_at
        if data.active is not None:
            promo.active = data.active

        audit = AdminAuditLog(
            admin_user_id=admin_user.id,
            action="UPDATE_PROMO_CODE",
            resource_type="promo_code",
            resource_id=promo.id,
            details_json=f"Admin '{admin_user.email}' updated promo code '{promo.code}' (active={promo.active}, disc={promo.discount_percent}%).",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(promo)
        return promo

    @classmethod
    async def toggle_coupon_active(
        cls,
        db: AsyncSession,
        admin_user: User,
        coupon_id: str,
    ) -> PromoCode:
        """Toggles a coupon between active and inactive states."""
        q = select(PromoCode).where(PromoCode.id == coupon_id)
        promo = (await db.execute(q)).scalars().first()
        if not promo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Promo code with ID '{coupon_id}' not found.",
            )

        promo.active = not promo.active
        audit = AdminAuditLog(
            admin_user_id=admin_user.id,
            action="TOGGLE_PROMO_CODE",
            resource_type="promo_code",
            resource_id=promo.id,
            details_json=f"Admin '{admin_user.email}' toggled promo code '{promo.code}' to active={promo.active}.",
        )
        db.add(audit)
        await db.commit()
        await db.refresh(promo)
        return promo

    @classmethod
    async def delete_coupon(
        cls,
        db: AsyncSession,
        admin_user: User,
        coupon_id: str,
    ) -> bool:
        """Deletes a promo code and its redemption audit trail."""
        q = select(PromoCode).where(PromoCode.id == coupon_id)
        promo = (await db.execute(q)).scalars().first()
        if not promo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Promo code with ID '{coupon_id}' not found.",
            )

        code_name = promo.code
        await db.delete(promo)

        audit = AdminAuditLog(
            admin_user_id=admin_user.id,
            action="DELETE_PROMO_CODE",
            resource_type="promo_code",
            resource_id=coupon_id,
            details_json=f"Admin '{admin_user.email}' deleted promo code '{code_name}'.",
        )
        db.add(audit)
        await db.commit()
        return True

    @classmethod
    async def get_coupon_metrics(cls, db: AsyncSession) -> dict:
        """Computes aggregate analytics and recent redemption log."""
        total_coupons = (await db.execute(select(func.count(PromoCode.id)))).scalar_one() or 0
        active_coupons = (await db.execute(select(func.count(PromoCode.id)).where(PromoCode.active == True))).scalar_one() or 0
        total_redemptions = (await db.execute(select(func.count(PromoRedemption.id)))).scalar_one() or 0

        # Recent 15 redemptions
        recents_q = (
            select(
                PromoRedemption.id,
                PromoCode.code,
                User.email,
                PromoRedemption.redeemed_at,
                PromoRedemption.discount_applied_paise,
                PromoRedemption.final_price_paise,
            )
            .join(PromoCode, PromoRedemption.promo_code_id == PromoCode.id)
            .join(User, PromoRedemption.user_id == User.id)
            .order_by(PromoRedemption.redeemed_at.desc())
            .limit(15)
        )
        res = await db.execute(recents_q)
        recent_rows = res.all()

        recent_dtos = [
            AdminRecentRedemptionDTO(
                id=row[0],
                code=row[1],
                user_email=row[2],
                redeemed_at=row[3],
                discount_applied_paise=row[4],
                final_price_paise=row[5],
            )
            for row in recent_rows
        ]

        return {
            "total_coupons": total_coupons,
            "active_coupons": active_coupons,
            "total_redemptions": total_redemptions,
            "recent_redemptions": recent_dtos,
        }
