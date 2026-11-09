"""
CodeMate AI — Phase 8 Feature Flag Endpoints
Runtime feature toggling, percentage rollouts, and administrative modification audits.
"""

import json
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utc_now
from app.db.session import get_db
from app.models.feature_flag import FeatureFlag, FeatureFlagChange
from app.models.user import User
from app.schemas.feature_flag import (
    FeatureFlagCreateRequest,
    FeatureFlagResponse,
    FeatureFlagUpdateRequest,
)
from app.services.entitlement_service import get_current_user
from app.services.rbac_service import (
    AdminPermission,
    AuditService,
    require_admin_permission,
)


router = APIRouter(tags=["Feature Flags"])


@router.get("/feature-flags/evaluate", response_model=Dict[str, bool])
async def evaluate_feature_flags(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluates active feature flags for the calling authenticated user based on role and rollout percentage.
    """
    q = select(FeatureFlag)
    res = await db.execute(q)
    flags = res.scalars().all()

    evaluated = {}
    user_hash = hash(user.id) % 100

    for f in flags:
        if not f.is_enabled:
            evaluated[f.key] = False
            continue

        if f.target_audience == "internal_staff":
            evaluated[f.key] = (user.role or "").upper() == "ADMIN"
        elif f.target_audience == "beta_users":
            evaluated[f.key] = bool(user_hash < f.rollout_percentage)
        else:
            evaluated[f.key] = bool(user_hash < f.rollout_percentage)

    return evaluated


# --- Admin Management ---

@router.get("/admin/feature-flags", response_model=List[FeatureFlagResponse])
async def admin_list_feature_flags(
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_FEATURE_FLAGS)),
    db: AsyncSession = Depends(get_db),
):
    """Admin view of all server-side feature flags."""
    q = select(FeatureFlag).order_by(FeatureFlag.created_at.desc())
    res = await db.execute(q)
    return res.scalars().all()


@router.post("/admin/feature-flags", response_model=FeatureFlagResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_feature_flag(
    payload: FeatureFlagCreateRequest,
    request: Request,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_FEATURE_FLAGS)),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new feature flag. Audited."""
    existing_q = select(FeatureFlag).where(FeatureFlag.key == payload.key)
    existing = (await db.execute(existing_q)).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Feature flag key '{payload.key}' already exists.")

    flag = FeatureFlag(
        key=payload.key,
        name=payload.name,
        description=payload.description,
        is_enabled=payload.is_enabled,
        target_audience=payload.target_audience,
        minimum_plan=payload.minimum_plan,
        rollout_percentage=payload.rollout_percentage,
        created_by_id=admin.id,
    )
    db.add(flag)
    await db.commit()
    await db.refresh(flag)

    await AuditService.log_admin_action(
        db=db,
        admin_user=admin,
        action="FEATURE_FLAG_CREATED",
        resource_type="feature_flag",
        resource_id=flag.id,
        details={"key": flag.key, "is_enabled": flag.is_enabled},
        request=request,
    )

    return flag


@router.put("/admin/feature-flags/{flag_id}", response_model=FeatureFlagResponse)
async def admin_update_feature_flag(
    flag_id: str,
    payload: FeatureFlagUpdateRequest,
    request: Request,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_FEATURE_FLAGS)),
    db: AsyncSession = Depends(get_db),
):
    """Modifies feature flag parameters, toggles state, and records change reason. Audited."""
    q = select(FeatureFlag).where(FeatureFlag.id == flag_id)
    res = await db.execute(q)
    flag = res.scalars().first()
    if not flag:
        raise HTTPException(status_code=404, detail="Feature flag not found.")

    prev_state = {
        "name": flag.name,
        "is_enabled": flag.is_enabled,
        "target_audience": flag.target_audience,
        "rollout_percentage": flag.rollout_percentage,
    }

    if payload.name is not None:
        flag.name = payload.name
    if payload.description is not None:
        flag.description = payload.description
    if payload.is_enabled is not None:
        flag.is_enabled = payload.is_enabled
    if payload.target_audience is not None:
        flag.target_audience = payload.target_audience
    if payload.minimum_plan is not None:
        flag.minimum_plan = payload.minimum_plan
    if payload.rollout_percentage is not None:
        flag.rollout_percentage = payload.rollout_percentage

    new_state = {
        "name": flag.name,
        "is_enabled": flag.is_enabled,
        "target_audience": flag.target_audience,
        "rollout_percentage": flag.rollout_percentage,
    }

    # Record historical change
    change_log = FeatureFlagChange(
        flag_id=flag.id,
        admin_user_id=admin.id,
        previous_state_json=json.dumps(prev_state),
        new_state_json=json.dumps(new_state),
        reason=payload.change_reason,
        created_at=utc_now(),
    )
    db.add(change_log)
    await db.commit()
    await db.refresh(flag)

    await AuditService.log_admin_action(
        db=db,
        admin_user=admin,
        action="FEATURE_FLAG_UPDATED",
        resource_type="feature_flag",
        resource_id=flag.id,
        details={"key": flag.key, "reason": payload.change_reason, "new_state": new_state},
        request=request,
    )

    return flag

