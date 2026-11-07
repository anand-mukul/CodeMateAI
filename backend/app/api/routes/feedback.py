"""
CodeMate AI — Phase 8 User Feedback Endpoints
Enables users to submit ratings, bug reports, and suggestions, and staff to review them.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.feedback import UserFeedback
from app.models.user import User
from app.schemas.feedback import UserFeedbackCreateRequest, UserFeedbackResponse
from app.services.entitlement_service import get_current_user
from app.services.rbac_service import AdminPermission, require_admin_permission


router = APIRouter(prefix="/feedback", tags=["User Feedback"])


class FeedbackAdminStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None


@router.post("", response_model=UserFeedbackResponse, status_code=status.HTTP_201_CREATED)
async def submit_user_feedback(
    payload: UserFeedbackCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submits user feedback, rating, or bug report."""
    feedback = UserFeedback(
        user_id=user.id,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        satisfaction_score=payload.satisfaction_score,
        attachment_path=payload.attachment_path,
        status="new",
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


@router.get("", response_model=List[UserFeedbackResponse])
async def list_my_feedback(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists feedback submitted by the authenticated user."""
    q = select(UserFeedback).where(UserFeedback.user_id == user.id).order_by(UserFeedback.created_at.desc())
    res = await db.execute(q)
    return res.scalars().all()


@router.get("/admin", response_model=List[UserFeedbackResponse])
async def admin_list_feedback(
    status_filter: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    admin: User = Depends(require_admin_permission(AdminPermission.VIEW_USERS)),
    db: AsyncSession = Depends(get_db),
):
    """Admin view of all submitted user feedback."""
    q = select(UserFeedback).order_by(UserFeedback.created_at.desc())
    if status_filter:
        q = q.where(UserFeedback.status == status_filter)
    q = q.limit(limit).offset(offset)
    res = await db.execute(q)
    return res.scalars().all()


@router.put("/admin/{feedback_id}", response_model=UserFeedbackResponse)
async def admin_update_feedback(
    feedback_id: str,
    payload: FeedbackAdminStatusUpdate,
    admin: User = Depends(require_admin_permission(AdminPermission.VIEW_USERS)),
    db: AsyncSession = Depends(get_db),
):
    """Admin update feedback status and internal review notes."""
    q = select(UserFeedback).where(UserFeedback.id == feedback_id)
    res = await db.execute(q)
    feedback = res.scalars().first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback entry not found.")

    feedback.status = payload.status
    if payload.admin_notes is not None:
        feedback.admin_notes = payload.admin_notes

    await db.commit()
    await db.refresh(feedback)
    return feedback

