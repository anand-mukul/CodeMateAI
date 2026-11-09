"""
CodeMate AI — Phase 8 Customer Support Endpoints
Customer ticketing with strict segregation between user-visible communications and staff-only internal notes.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.base import utc_now
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.support import SupportAttachment, SupportMessage, SupportTicket
from app.models.user import User
from app.schemas.support import (
    SupportInternalNoteCreateRequest,
    SupportMessageCreateRequest,
    SupportMessageResponse,
    SupportTicketAssignRequest,
    SupportTicketCreateRequest,
    SupportTicketResponse,
    SupportTicketStatusUpdateRequest,
)
from app.services.entitlement_service import get_current_user
from app.services.rbac_service import (
    AdminPermission,
    AuditService,
    require_admin_permission,
)


router = APIRouter(prefix="/support", tags=["Customer Support"])


@router.post("/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_201_CREATED)
async def create_support_ticket(
    payload: SupportTicketCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Creates a new customer support ticket with an initial message."""
    ticket = SupportTicket(
        user_id=user.id,
        subject=payload.subject,
        category=(payload.category or "GENERAL_SUPPORT").upper(),
        priority=(payload.priority or "NORMAL").upper(),
        status="OPEN",
        last_reply_at=utc_now(),
    )
    db.add(ticket)
    await db.flush()

    # Initial message
    user_role = (user.role or "USER").upper()
    initial_msg = SupportMessage(
        ticket_id=ticket.id,
        sender_id=user.id,
        sender_role=user_role,
        message_text=payload.initial_message,
        attachment_path=payload.attachment_path,
        is_internal_note=False,
    )
    db.add(initial_msg)
    await db.commit()
    await db.refresh(ticket)

    return SupportTicketResponse(
        id=ticket.id,
        user_id=ticket.user_id,
        assigned_agent_id=ticket.assigned_agent_id,
        subject=ticket.subject,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        last_reply_at=ticket.last_reply_at,
        resolved_at=ticket.resolved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=[
            SupportMessageResponse(
                id=initial_msg.id,
                ticket_id=ticket.id,
                sender_id=user.id,
                sender_role=user_role,
                message_text=initial_msg.message_text,
                attachment_path=initial_msg.attachment_path,
                is_internal_note=False,
                created_at=initial_msg.created_at,
            )
        ],
    )


@router.get("/tickets", response_model=List[SupportTicketResponse])
async def list_my_tickets(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists support tickets opened by the authenticated user."""
    q = (
        select(SupportTicket)
        .where(SupportTicket.user_id == user.id)
        .order_by(SupportTicket.last_reply_at.desc())
    )
    res = await db.execute(q)
    tickets = res.scalars().all()

    return [
        SupportTicketResponse(
            id=t.id,
            user_id=t.user_id,
            assigned_agent_id=t.assigned_agent_id,
            subject=t.subject,
            category=t.category,
            priority=t.priority,
            status=t.status,
            last_reply_at=t.last_reply_at,
            resolved_at=t.resolved_at,
            created_at=t.created_at,
            updated_at=t.updated_at,
            messages=[],
        )
        for t in tickets
    ]


@router.get("/tickets/{ticket_id}", response_model=SupportTicketResponse)
async def get_ticket_details(
    ticket_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves ticket details and message thread.
    CRITICAL SECURITY INVARIANT: If caller is an ordinary user, internal notes are strictly filtered out.
    """
    q = (
        select(SupportTicket)
        .options(selectinload(SupportTicket.messages))
        .where(SupportTicket.id == ticket_id)
    )
    res = await db.execute(q)
    ticket = res.scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found.")

    is_staff = (user.role or "").upper() == UserRole.ADMIN.value
    if not is_staff and ticket.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to access this support ticket.")

    # Filter messages: ordinary users NEVER see internal notes
    visible_messages = [
        SupportMessageResponse(
            id=m.id,
            ticket_id=m.ticket_id,
            sender_id=m.sender_id,
            sender_role=m.sender_role,
            message_text=m.message_text,
            attachment_path=m.attachment_path,
            is_internal_note=m.is_internal_note,
            created_at=m.created_at,
        )
        for m in ticket.messages
        if is_staff or not m.is_internal_note
    ]

    return SupportTicketResponse(
        id=ticket.id,
        user_id=ticket.user_id,
        assigned_agent_id=ticket.assigned_agent_id,
        subject=ticket.subject,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        last_reply_at=ticket.last_reply_at,
        resolved_at=ticket.resolved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=visible_messages,
    )


@router.post("/tickets/{ticket_id}/messages", response_model=SupportMessageResponse)
async def reply_to_ticket(
    ticket_id: str,
    payload: SupportMessageCreateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Appends a customer or support agent reply to an existing ticket."""
    ticket_q = select(SupportTicket).where(SupportTicket.id == ticket_id)
    ticket = (await db.execute(ticket_q)).scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found.")

    is_staff = (user.role or "").upper() == UserRole.ADMIN.value
    if not is_staff and ticket.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized to reply to this ticket.")

    sender_role = UserRole.ADMIN.value if is_staff else UserRole.USER.value
    msg = SupportMessage(
        ticket_id=ticket.id,
        sender_id=user.id,
        sender_role=sender_role,
        message_text=payload.message_text,
        attachment_path=payload.attachment_path,
        is_internal_note=False,
    )
    db.add(msg)

    # Transition status: if user replies, mark WAITING_FOR_SUPPORT; if staff replies, mark WAITING_FOR_USER
    ticket.last_reply_at = utc_now()
    if is_staff:
        ticket.status = "WAITING_FOR_USER"
    else:
        ticket.status = "WAITING_FOR_SUPPORT"

    await db.commit()
    await db.refresh(msg)

    return SupportMessageResponse(
        id=msg.id,
        ticket_id=msg.ticket_id,
        sender_id=msg.sender_id,
        sender_role=msg.sender_role,
        message_text=msg.message_text,
        attachment_path=msg.attachment_path,
        is_internal_note=False,
        created_at=msg.created_at,
    )


# --- Administrative / Staff Endpoints ---

@router.get("/admin/tickets", response_model=List[SupportTicketResponse])
async def admin_list_tickets(
    status_filter: Optional[str] = Query(default=None),
    priority_filter: Optional[str] = Query(default=None),
    category_filter: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_SUPPORT_TICKETS)),
    db: AsyncSession = Depends(get_db),
):
    """Admin/Agent view of support ticket queues."""
    q = select(SupportTicket)
    if status_filter:
        q = q.where(SupportTicket.status == status_filter)
    if priority_filter:
        q = q.where(SupportTicket.priority == priority_filter)
    if category_filter:
        q = q.where(SupportTicket.category == category_filter)

    q = q.order_by(SupportTicket.last_reply_at.desc()).limit(limit).offset(offset)
    res = await db.execute(q)
    tickets = res.scalars().all()

    return [
        SupportTicketResponse(
            id=t.id,
            user_id=t.user_id,
            assigned_agent_id=t.assigned_agent_id,
            subject=t.subject,
            category=t.category,
            priority=t.priority,
            status=t.status,
            last_reply_at=t.last_reply_at,
            resolved_at=t.resolved_at,
            created_at=t.created_at,
            updated_at=t.updated_at,
            messages=[],
        )
        for t in tickets
    ]


@router.post("/admin/tickets/{ticket_id}/internal-notes", response_model=SupportMessageResponse)
async def post_internal_note(
    ticket_id: str,
    payload: SupportInternalNoteCreateRequest,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_SUPPORT_TICKETS)),
    db: AsyncSession = Depends(get_db),
):
    """Posts a staff-only internal note on a support ticket. Inaccessible to ordinary users."""
    ticket_q = select(SupportTicket).where(SupportTicket.id == ticket_id)
    ticket = (await db.execute(ticket_q)).scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found.")

    note = SupportMessage(
        ticket_id=ticket.id,
        sender_id=admin.id,
        sender_role=(admin.role or UserRole.ADMIN.value).upper(),
        message_text=payload.message_text,
        is_internal_note=True,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)

    return SupportMessageResponse(
        id=note.id,
        ticket_id=note.ticket_id,
        sender_id=note.sender_id,
        sender_role=note.sender_role,
        message_text=note.message_text,
        attachment_path=None,
        is_internal_note=True,
        created_at=note.created_at,
    )


@router.put("/admin/tickets/{ticket_id}/status", response_model=SupportTicketResponse)
async def update_ticket_status(
    ticket_id: str,
    payload: SupportTicketStatusUpdateRequest,
    request: Request,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_SUPPORT_TICKETS)),
    db: AsyncSession = Depends(get_db),
):
    """Staff updates ticket status and records resolution timestamp. Audited."""
    ticket_q = select(SupportTicket).where(SupportTicket.id == ticket_id)
    ticket = (await db.execute(ticket_q)).scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found.")

    prev_status = ticket.status
    ticket.status = payload.status
    if payload.status in ("RESOLVED", "CLOSED"):
        ticket.resolved_at = utc_now()

    await db.commit()
    await db.refresh(ticket)

    await AuditService.log_admin_action(
        db=db,
        admin_user=admin,
        action="SUPPORT_TICKET_STATUS_UPDATED",
        resource_type="support_ticket",
        resource_id=ticket_id,
        target_user_id=ticket.user_id,
        details={"previous_status": prev_status, "new_status": payload.status},
        request=request,
    )

    return SupportTicketResponse(
        id=ticket.id,
        user_id=ticket.user_id,
        assigned_agent_id=ticket.assigned_agent_id,
        subject=ticket.subject,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        last_reply_at=ticket.last_reply_at,
        resolved_at=ticket.resolved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=[],
    )


@router.post("/admin/tickets/{ticket_id}/assign", response_model=SupportTicketResponse)
async def assign_ticket_agent(
    ticket_id: str,
    payload: SupportTicketAssignRequest,
    request: Request,
    admin: User = Depends(require_admin_permission(AdminPermission.MANAGE_SUPPORT_TICKETS)),
    db: AsyncSession = Depends(get_db),
):
    """Assigns a support ticket to a designated support agent. Audited."""
    ticket_q = select(SupportTicket).where(SupportTicket.id == ticket_id)
    ticket = (await db.execute(ticket_q)).scalars().first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Support ticket not found.")

    ticket.assigned_agent_id = payload.assigned_agent_id
    ticket.status = "IN_PROGRESS"
    await db.commit()
    await db.refresh(ticket)

    await AuditService.log_admin_action(
        db=db,
        admin_user=admin,
        action="SUPPORT_TICKET_ASSIGNED",
        resource_type="support_ticket",
        resource_id=ticket_id,
        target_user_id=ticket.user_id,
        details={"assigned_agent_id": payload.assigned_agent_id},
        request=request,
    )

    return SupportTicketResponse(
        id=ticket.id,
        user_id=ticket.user_id,
        assigned_agent_id=ticket.assigned_agent_id,
        subject=ticket.subject,
        category=ticket.category,
        priority=ticket.priority,
        status=ticket.status,
        last_reply_at=ticket.last_reply_at,
        resolved_at=ticket.resolved_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        messages=[],
    )

