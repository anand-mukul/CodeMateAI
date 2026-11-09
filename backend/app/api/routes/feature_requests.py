"""
CodeMate AI — Phase 8 Feature Request Endpoints
Community feature suggestions, voting deduplication, official responses, and status lifecycles.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.feedback import FeatureRequest, FeatureRequestComment, FeatureRequestVote
from app.models.user import User
from app.schemas.feedback import (
    FeatureRequestAdminStatusUpdate,
    FeatureRequestCommentCreate,
    FeatureRequestCommentResponse,
    FeatureRequestCreateRequest,
    FeatureRequestResponse,
    FeatureRequestUpdateRequest,
)
from app.services.entitlement_service import get_current_user
from app.services.rbac_service import (
    AdminPermission,
    AuditService,
    require_admin_permission,
)


router = APIRouter(prefix="/feature-requests", tags=["Feature Requests"])


@router.post("", response_model=FeatureRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_feature_request(
    payload: FeatureRequestCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submits a new public feature request and casts the author's initial upvote."""
    req = FeatureRequest(
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        category=payload.category,
        status="NEW",
        vote_count=1,
    )
    db.add(req)
    await db.flush()

    # Automatically cast initial vote
    initial_vote = FeatureRequestVote(feature_request_id=req.id, user_id=user.id)
    db.add(initial_vote)
    await db.commit()
    await db.refresh(req)

    return FeatureRequestResponse(
        id=req.id,
        user_id=req.user_id,
        title=req.title,
        description=req.description,
        category=req.category,
        status=req.status,
        vote_count=req.vote_count,
        admin_notes=req.admin_notes,
        has_voted=True,
        created_at=req.created_at,
        updated_at=req.updated_at,
        comments=[],
    )


@router.get("", response_model=List[FeatureRequestResponse])
async def list_feature_requests(
    category: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None),
    sort_by: str = Query(default="votes", pattern=r"^(votes|recent)$"),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists feature requests with voting counts and caller's vote status."""
    q = select(FeatureRequest)
    if category:
        q = q.where(FeatureRequest.category == category)
    if status_filter:
        q = q.where(FeatureRequest.status == status_filter)
    if search:
        q = q.where(FeatureRequest.title.ilike(f"%{search}%") | FeatureRequest.description.ilike(f"%{search}%"))

    if sort_by == "votes":
        q = q.order_by(FeatureRequest.vote_count.desc(), FeatureRequest.created_at.desc())
    else:
        q = q.order_by(FeatureRequest.created_at.desc())

    q = q.limit(limit).offset(offset)
    res = await db.execute(q)
    requests = res.scalars().all()

    # Determine user's votes
    req_ids = [r.id for r in requests]
    user_votes = set()
    if req_ids:
        vote_q = select(FeatureRequestVote.feature_request_id).where(
            FeatureRequestVote.feature_request_id.in_(req_ids),
            FeatureRequestVote.user_id == user.id,
        )
        vote_res = await db.execute(vote_q)
        user_votes = set(vote_res.scalars().all())

    return [
        FeatureRequestResponse(
            id=r.id,
            user_id=r.user_id,
            title=r.title,
            description=r.description,
            category=r.category,
            status=r.status,
            vote_count=r.vote_count,
            admin_notes=r.admin_notes,
            has_voted=r.id in user_votes,
            created_at=r.created_at,
            updated_at=r.updated_at,
            comments=[],
        )
        for r in requests
    ]


@router.get("/{request_id}", response_model=FeatureRequestResponse)
async def get_feature_request_details(
    request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves full details and comments for a feature request."""
    q = select(FeatureRequest).options(selectinload(FeatureRequest.comments)).where(FeatureRequest.id == request_id)
    res = await db.execute(q)
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Feature request not found.")

    # Check caller vote
    vote_q = select(FeatureRequestVote).where(
        FeatureRequestVote.feature_request_id == request_id,
        FeatureRequestVote.user_id == user.id,
    )
    has_voted = bool((await db.execute(vote_q)).scalars().first())

    comments_dto = [
        FeatureRequestCommentResponse(
            id=c.id,
            user_id=c.user_id,
            comment_text=c.comment_text,
            is_official_response=c.is_official_response,
            created_at=c.created_at,
        )
        for c in req.comments
    ]

    return FeatureRequestResponse(
        id=req.id,
        user_id=req.user_id,
        title=req.title,
        description=req.description,
        category=req.category,
        status=req.status,
        vote_count=req.vote_count,
        admin_notes=req.admin_notes,
        has_voted=has_voted,
        created_at=req.created_at,
        updated_at=req.updated_at,
        comments=comments_dto,
    )


@router.post("/{request_id}/vote")
async def vote_feature_request(
    request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Casts an upvote for a feature request. Duplicate votes are prevented."""
    req_q = select(FeatureRequest).where(FeatureRequest.id == request_id)
    req = (await db.execute(req_q)).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Feature request not found.")

    vote_q = select(FeatureRequestVote).where(
        FeatureRequestVote.feature_request_id == request_id,
        FeatureRequestVote.user_id == user.id,
    )
    existing_vote = (await db.execute(vote_q)).scalars().first()
    if existing_vote:
        raise HTTPException(status_code=400, detail="You have already voted for this feature request.")

    new_vote = FeatureRequestVote(feature_request_id=request_id, user_id=user.id)
    db.add(new_vote)
    req.vote_count += 1
    await db.commit()

    return {"status": "success", "vote_count": req.vote_count, "has_voted": True}


@router.delete("/{request_id}/vote")
async def unvote_feature_request(
    request_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Removes a previously cast upvote."""
    req_q = select(FeatureRequest).where(FeatureRequest.id == request_id)
    req = (await db.execute(req_q)).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Feature request not found.")

    vote_q = select(FeatureRequestVote).where(
        FeatureRequestVote.feature_request_id == request_id,
        FeatureRequestVote.user_id == user.id,
    )
    existing_vote = (await db.execute(vote_q)).scalars().first()
    if not existing_vote:
        raise HTTPException(status_code=400, detail="You have not voted for this feature request.")

    await db.delete(existing_vote)
    req.vote_count = max(req.vote_count - 1, 0)
    await db.commit()

    return {"status": "success", "vote_count": req.vote_count, "has_voted": False}


@router.post("/{request_id}/comments", response_model=FeatureRequestCommentResponse)
async def add_feature_request_comment(
    request_id: str,
    payload: FeatureRequestCommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Adds a public comment or official response to a feature request."""
    req_q = select(FeatureRequest).where(FeatureRequest.id == request_id)
    req = (await db.execute(req_q)).scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Feature request not found.")

    is_official = (user.role or "").upper() == "ADMIN"
    comment = FeatureRequestComment(
        feature_request_id=request_id,
        user_id=user.id,
        comment_text=payload.comment_text,
        is_official_response=is_official,
    )
    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return FeatureRequestCommentResponse(
        id=comment.id,
        user_id=comment.user_id,
        comment_text=comment.comment_text,
        is_official_response=comment.is_official_response,
        created_at=comment.created_at,
    )


@router.put("/admin/{request_id}/status", response_model=FeatureRequestResponse)
async def admin_update_feature_request_status(
    request_id: str,
    payload: FeatureRequestAdminStatusUpdate,
    request: Request,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_FEATURE_REQUESTS)),
    db: AsyncSession = Depends(get_db),
):
    """Admin status transition, duplicate merging, and notes update. Audited."""
    q = select(FeatureRequest).where(FeatureRequest.id == request_id)
    res = await db.execute(q)
    req = res.scalars().first()
    if not req:
        raise HTTPException(status_code=404, detail="Feature request not found.")

    prev_status = req.status
    req.status = payload.status
    if payload.admin_notes is not None:
        req.admin_notes = payload.admin_notes
    if payload.merged_into_id:
        req.merged_into_id = payload.merged_into_id

    await db.commit()
    await db.refresh(req)

    await AuditService.log_admin_action(
        db=db,
        admin_user=admin,
        action="FEATURE_REQUEST_STATUS_UPDATED",
        resource_type="feature_request",
        resource_id=request_id,
        details={"previous_status": prev_status, "new_status": payload.status},
        request=request,
    )

    return FeatureRequestResponse(
        id=req.id,
        user_id=req.user_id,
        title=req.title,
        description=req.description,
        category=req.category,
        status=req.status,
        vote_count=req.vote_count,
        admin_notes=req.admin_notes,
        has_voted=False,
        created_at=req.created_at,
        updated_at=req.updated_at,
        comments=[],
    )

