"""
CodeMate AI — Phase 8 Admin Dashboard & System Governance Endpoints
Provides RBAC-guarded administrative controls, user management, audit trails, and system observability.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.provider_manager import ProviderManager
from app.db.base import utc_now
from app.db.session import get_db
from app.models.admin import AdminAuditLog
from app.models.device import UserDevice
from app.models.feedback import UserFeedback
from app.models.session import UserSession
from app.models.subscription import Plan, Subscription
from app.models.support import SupportTicket
from app.models.user import User
from app.models.enums import (
    SubscriptionStatus,
    SessionStatus,
    FeedbackStatus,
    TicketStatus,
    UserRole,
    AccountStatus,
    PlanTier,
)
from app.schemas.admin import (
    AdminAuditLogDTO,
    AdminSystemHealthResponse,
    AdminUserRoleUpdateRequest,
    AdminUserSummaryDTO,
    AdminUserSuspendRequest,
)
from app.schemas.promo import (
    AdminGrantSubscriptionRequest,
    AdminPromoCodeCreateRequest,
    AdminPromoCodeUpdateRequest,
    AdminPromoCodeDTO,
    AdminPromoMetricsResponse,
)
from app.services.promo_service import PromoService
from app.services.analytics.analytics_queries import AnalyticsQueries
from app.services.rbac_service import (
    AdminPermission,
    AdminRole,
    AuditService,
    require_admin_permission,
    require_admin_role,
)


router = APIRouter(prefix="/admin", tags=["Admin Governance"])


# --- Admin Analytics ---

@router.get("/analytics/overview")
async def get_admin_analytics_overview(
    admin: User = Depends(require_admin_permission(AdminPermission.VIEW_ANALYTICS)),
    db: AsyncSession = Depends(get_db),
):
    """Provides high-level SaaS adoption, user counts, and AI consumption metrics."""
    return await AnalyticsQueries.get_overview(db)


@router.get("/analytics/features")
async def get_admin_feature_adoption(
    days: int = Query(default=30, ge=1, le=365),
    admin: User = Depends(require_admin_permission(AdminPermission.VIEW_ANALYTICS)),
    db: AsyncSession = Depends(get_db),
):
    """Returns adoption rates and average latencies across all registered features."""
    return await AnalyticsQueries.get_feature_adoption(db, days=days)


@router.get("/analytics/ai")
async def get_admin_ai_performance(
    days: int = Query(default=7, ge=1, le=90),
    admin: User = Depends(require_admin_permission(AdminPermission.VIEW_ANALYTICS)),
    db: AsyncSession = Depends(get_db),
):
    """Returns AI latency percentiles (P50, P95), error breakdowns, and token distributions."""
    return await AnalyticsQueries.get_ai_performance(db, days=days)


@router.get("/analytics/projects")
async def get_admin_project_metrics(
    admin: User = Depends(require_admin_permission(AdminPermission.VIEW_ANALYTICS)),
    db: AsyncSession = Depends(get_db),
):
    """Measures multi-file project indexing, patch generations, and rollback frequencies."""
    return await AnalyticsQueries.get_project_intelligence_metrics(db)


# --- User Management ---

@router.get("/users", response_model=List[AdminUserSummaryDTO])
async def list_admin_users(
    search: Optional[str] = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    admin: User = Depends(require_admin_permission(AdminPermission.VIEW_USERS)),
    db: AsyncSession = Depends(get_db),
):
    """Lists registered users with roles, subscription tiers, and session counts."""
    query = select(User).order_by(User.created_at.desc())
    if search:
        query = query.where(User.email.ilike(f"%{search}%") | User.display_name.ilike(f"%{search}%"))

    query = query.limit(limit).offset(offset)
    res = await db.execute(query)
    users = res.scalars().all()

    summaries = []
    for u in users:
        # Fetch active sub
        sub_q = select(Subscription, Plan).join(Plan, Subscription.plan_id == Plan.id).where(
            Subscription.user_id == u.id,
            Subscription.status == SubscriptionStatus.ACTIVE.value
        )
        sub_res = await db.execute(sub_q)
        sub_row = sub_res.first()

        plan_id = sub_row[0].plan_id if sub_row else PlanTier.FREE.value
        plan_name = sub_row[1].name if sub_row else "Free Tier"

        # Count devices
        dev_count = (await db.execute(select(func.count(UserDevice.id)).where(UserDevice.user_id == u.id))).scalar_one() or 0
        # Count sessions
        sess_count = (await db.execute(
            select(func.count(UserSession.id)).where(
                UserSession.user_id == u.id,
                UserSession.session_status == SessionStatus.ACTIVE.value
            )
        )).scalar_one() or 0

        summaries.append(
            AdminUserSummaryDTO(
                id=u.id,
                email=u.email,
                display_name=u.display_name,
                role=u.role or UserRole.USER.value,
                account_status=u.account_status,
                email_verified=u.email_verified,
                created_at=u.created_at,
                last_login_at=u.last_login_at,
                plan_id=plan_id,
                plan_name=plan_name,
                device_count=dev_count,
                active_session_count=sess_count,
            )
        )
    return summaries


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    payload: AdminUserSuspendRequest,
    request: Request,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
):
    """Suspends a user account and terminates all active sessions. Audited."""
    target_q = select(User).where(User.id == user_id)
    target = (await db.execute(target_q)).scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found.")

    if target.role in (UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value) and admin.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Only Super Admins can suspend other administrative accounts.")

    target.account_status = AccountStatus.SUSPENDED.value

    # Terminate all active sessions
    await db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id)
        .values(session_status=SessionStatus.REVOKED.value)
    )
    await db.commit()

    await AuditService.log_admin_action(
        db=db,
        admin_user=admin,
        action="USER_SUSPENDED",
        resource_type="user",
        resource_id=user_id,
        target_user_id=user_id,
        details={"reason": payload.reason, "email": target.email},
        request=request,
    )

    return {"status": "success", "message": f"User '{target.email}' suspended.", "account_status": AccountStatus.SUSPENDED.value}


@router.post("/users/{user_id}/reactivate")
async def reactivate_user(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
):
    """Reactivates a suspended user account. Audited."""
    target_q = select(User).where(User.id == user_id)
    target = (await db.execute(target_q)).scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found.")

    target.account_status = AccountStatus.ACTIVE.value
    await db.commit()

    await AuditService.log_admin_action(
        db=db,
        admin_user=admin,
        action="USER_REACTIVATED",
        resource_type="user",
        resource_id=user_id,
        target_user_id=user_id,
        details={"email": target.email},
        request=request,
    )

    return {"status": "success", "message": f"User '{target.email}' reactivated.", "account_status": AccountStatus.ACTIVE.value}


@router.post("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    payload: AdminUserRoleUpdateRequest,
    request: Request,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_ADMIN_ROLES)),
    db: AsyncSession = Depends(get_db),
):
    """Assigns an administrative role. Restricted to Super Admins. Audited."""
    target_q = select(User).where(User.id == user_id)
    target = (await db.execute(target_q)).scalars().first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found.")

    prev_role = target.role
    target.role = payload.role
    await db.commit()

    await AuditService.log_admin_action(
        db=db,
        admin_user=admin,
        action="USER_ROLE_UPDATED",
        resource_type="user",
        resource_id=user_id,
        target_user_id=user_id,
        details={"previous_role": prev_role, "new_role": payload.role, "reason": payload.reason},
        request=request,
    )

    return {"status": "success", "user_id": user_id, "previous_role": prev_role, "new_role": payload.role}


@router.post("/users/{user_id}/revoke-sessions")
async def revoke_user_sessions(
    user_id: str,
    request: Request,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
):
    """Forcefully terminates all active sessions for a user. Audited."""
    res = await db.execute(
        update(UserSession)
        .where(UserSession.user_id == user_id, UserSession.session_status == SessionStatus.ACTIVE.value)
        .values(session_status=SessionStatus.REVOKED.value)
    )
    revoked_count = res.rowcount or 0
    await db.commit()

    await AuditService.log_admin_action(
        db=db,
        admin_user=admin,
        action="USER_SESSIONS_REVOKED",
        resource_type="user",
        resource_id=user_id,
        target_user_id=user_id,
        details={"revoked_count": revoked_count},
        request=request,
    )

    return {"status": "success", "revoked_sessions_count": revoked_count}


# --- Audit Logs ---

@router.get("/audit-logs", response_model=List[AdminAuditLogDTO])
async def list_admin_audit_logs(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    admin: User = Depends(require_admin_permission(AdminPermission.VIEW_AUDIT_LOGS)),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves immutable administrative audit history."""
    q = select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()


# --- Operational Observability ---

@router.get("/system/health", response_model=AdminSystemHealthResponse)
async def get_admin_system_health(
    admin: User = Depends(require_admin_permission(AdminPermission.VIEW_ANALYTICS)),
    db: AsyncSession = Depends(get_db),
):
    """Provides internal system status across database, AI providers, and support queues."""
    # Database Probe
    db_ok = True
    db_latency_ms = 0
    try:
        t0 = utc_now()
        await db.execute(select(1))
        t1 = utc_now()
        db_latency_ms = round((t1 - t0).total_seconds() * 1000, 2)
    except Exception:
        db_ok = False

    # AI Provider Probe
    provider = ProviderManager.get_provider()
    provider_status = await provider.check_connection()

    # Active queues
    active_sessions = (await db.execute(
        select(func.count(UserSession.id)).where(UserSession.session_status == SessionStatus.ACTIVE.value)
    )).scalar_one() or 0
    unresolved_tickets = (await db.execute(
        select(func.count(SupportTicket.id)).where(SupportTicket.status == TicketStatus.OPEN.value)
    )).scalar_one() or 0
    pending_feedback = (await db.execute(
        select(func.count(UserFeedback.id)).where(UserFeedback.status == FeedbackStatus.NEW.value)
    )).scalar_one() or 0

    return AdminSystemHealthResponse(
        status="healthy" if db_ok and provider_status.get("available") else "degraded",
        timestamp=utc_now(),
        database={"connected": db_ok, "ping_ms": db_latency_ms},
        ai_providers=provider_status,
        active_sessions_count=active_sessions,
        unresolved_tickets_count=unresolved_tickets,
        pending_feedback_count=pending_feedback,
    )


@router.post("/subscriptions/grant")
async def grant_user_subscription(
    payload: AdminGrantSubscriptionRequest,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_USERS)),
    db: AsyncSession = Depends(get_db),
):
    """
    Grants free promotional access directly to a specific user account.
    Designed for campus ambassador giveaways, hackathon winner passes, and influencer trials.
    """
    return await PromoService.grant_admin_subscription(
        db=db,
        admin_user=admin,
        target_email=payload.target_email,
        plan_id=payload.plan_id,
        duration_days=payload.duration_days,
        reason=payload.reason,
    )


# --- Coupon & Promotional Code Governance ---

@router.get("/coupons", response_model=List[AdminPromoCodeDTO])
async def list_admin_coupons(
    search: Optional[str] = Query(default=None, max_length=50),
    active_only: Optional[bool] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_SUBSCRIPTIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Lists all promotional coupon codes with usage counts, discount rates, and status."""
    return await PromoService.list_coupons(
        db=db,
        search=search,
        active_only=active_only,
        limit=limit,
        offset=offset,
    )


@router.get("/coupons/metrics", response_model=AdminPromoMetricsResponse)
async def get_admin_coupon_metrics(
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_SUBSCRIPTIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Returns aggregate coupon metrics including total count, active count, and recent redemption log."""
    return await PromoService.get_coupon_metrics(db=db)


@router.post("/coupons", response_model=AdminPromoCodeDTO, status_code=status.HTTP_201_CREATED)
async def create_admin_coupon(
    payload: AdminPromoCodeCreateRequest,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_SUBSCRIPTIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new promotional discount or 100% free pass coupon."""
    return await PromoService.create_coupon(
        db=db,
        admin_user=admin,
        data=payload,
    )


@router.put("/coupons/{coupon_id}", response_model=AdminPromoCodeDTO)
async def update_admin_coupon(
    coupon_id: str,
    payload: AdminPromoCodeUpdateRequest,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_SUBSCRIPTIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Updates an existing coupon's terms, discounts, caps, or expiration date."""
    return await PromoService.update_coupon(
        db=db,
        admin_user=admin,
        coupon_id=coupon_id,
        data=payload,
    )


@router.post("/coupons/{coupon_id}/toggle", response_model=AdminPromoCodeDTO)
async def toggle_admin_coupon_status(
    coupon_id: str,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_SUBSCRIPTIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Toggles a coupon between active and paused states instantly."""
    return await PromoService.toggle_coupon_active(
        db=db,
        admin_user=admin,
        coupon_id=coupon_id,
    )


@router.delete("/coupons/{coupon_id}")
async def delete_admin_coupon(
    coupon_id: str,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_SUBSCRIPTIONS)),
    db: AsyncSession = Depends(get_db),
):
    """Permanently deletes a promotional coupon."""
    success = await PromoService.delete_coupon(
        db=db,
        admin_user=admin,
        coupon_id=coupon_id,
    )
    return {"success": success, "message": "Coupon deleted successfully."}

