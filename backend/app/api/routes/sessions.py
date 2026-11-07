"""
CodeMate AI — Session Management Endpoints (Layer 2)
Provides active session listing, remote session termination, and global logout.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.auth import SessionResponse
from app.services.session_service import SessionService
from app.services.entitlement_service import get_current_user_and_session

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("", response_model=List[SessionResponse])
async def list_active_sessions(
    user_and_session=Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Lists all active concurrent sessions for the authenticated user."""
    user, session = user_and_session
    sessions = await SessionService.list_active_sessions(db, user.id, current_session_id=session.id)
    return sessions


@router.delete("/{session_id}", status_code=status.HTTP_200_OK)
async def terminate_remote_session(
    session_id: str,
    user_and_session=Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Terminates a specific remote session."""
    user, current_session = user_and_session
    await SessionService.terminate_session(db, user.id, session_id)
    return {"success": True, "message": f"Session {session_id} terminated."}


@router.delete("", status_code=status.HTTP_200_OK)
async def terminate_other_sessions(
    user_and_session=Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Terminates all other active sessions, preserving only the current device session."""
    user, current_session = user_and_session
    count = await SessionService.terminate_all_sessions(db, user.id, except_session_id=current_session.id)
    return {"success": True, "message": f"Terminated {count} other active session(s)."}

