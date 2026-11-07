"""
CodeMate AI — Session Management Service (Layer 2 Concurrent Session Limits)
Manages rotating refresh tokens, hash verification, concurrent session quotas, and remote termination.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_secure_token,
    hash_token,
)
from app.db.base import utc_now, ensure_utc
from app.models.user import User
from app.models.device import UserDevice
from app.models.session import UserSession
from app.models.subscription import Plan, Subscription
from app.models.security_log import SecurityLog
from app.models.enums import (
    SessionStatus,
    SubscriptionStatus,
    UserRole,
    PlanTier,
    AccountStatus,
    DeviceStatus,
)
from app.schemas.auth import ActiveSessionSummary


class SessionService:
    @classmethod
    async def get_user_plan_session_limit(cls, db: AsyncSession, user_id: str) -> int:
        """Determines the concurrent active session limit based on the user's active plan."""
        # Platform administrators get unlimited concurrent sessions
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalars().first()
        if user and (user.role or "").upper() in (UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value):
            return 999

        sub_query = select(Subscription).where(
            and_(Subscription.user_id == user_id, Subscription.status == SubscriptionStatus.ACTIVE.value)
        ).order_by(Subscription.created_at.desc())
        sub_res = await db.execute(sub_query)
        sub = sub_res.scalars().first()

        plan_id = sub.plan_id if sub else PlanTier.FREE.value
        plan_query = select(Plan).where((Plan.id == plan_id) | (Plan.id == plan_id.upper()) | (Plan.id == plan_id.lower()))
        plan_res = await db.execute(plan_query)
        plan = plan_res.scalars().first()

        return plan.concurrent_session_limit if plan else 1

    @classmethod
    async def create_session(
        cls,
        db: AsyncSession,
        user: User,
        device_id: str,
        ip_hash: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Tuple[UserSession, str, str]:
        """
        Creates a new user session with rotating refresh token and short-lived access token.
        Enforces plan-level concurrent session limit.
        Returns: (session, access_token, raw_refresh_token)
        """
        now = utc_now()

        # Clean expired sessions
        await cls.clean_expired_sessions(db, user.id)

        # Retrieve active sessions
        active_sessions_query = select(UserSession).where(
            and_(
                UserSession.user_id == user.id,
                UserSession.session_status == SessionStatus.ACTIVE.value,
                UserSession.expires_at > now,
            )
        )
        active_sessions_res = await db.execute(active_sessions_query)
        active_sessions = active_sessions_res.scalars().all()

        allowed_limit = await cls.get_user_plan_session_limit(db, user.id)

        # If user is logging in from a device that already has an active session, reuse/rotate that slot
        existing_device_session = next((s for s in active_sessions if s.device_id == device_id), None)

        is_web = (
            device_id in ("web_portal", "admin_web_portal")
            or device_id.startswith("web_")
        )

        # Separate web portal sessions from extension sessions so web dashboard access never blocks extension
        same_scope_sessions = [
            s for s in active_sessions
            if (s.device_id in ("web_portal", "admin_web_portal") or s.device_id.startswith("web_")) == is_web
        ]

        # If at or exceeding allowed limit for this scope, auto-revoke oldest active session
        # This ensures users logging in with correct credentials are never locked out
        if not existing_device_session and len(same_scope_sessions) >= allowed_limit:
            sorted_sessions = sorted(same_scope_sessions, key=lambda s: s.last_seen_at or s.created_at)
            sessions_to_revoke = sorted_sessions[: len(same_scope_sessions) - allowed_limit + 1]
            for old_s in sessions_to_revoke:
                old_s.session_status = SessionStatus.REVOKED.value
                old_s.revoked_at = now

        # If previous session on this device existed, revoke it
        if existing_device_session:
            existing_device_session.session_status = SessionStatus.REVOKED.value
            existing_device_session.revoked_at = now

        # Generate tokens
        raw_refresh_token = generate_secure_token(48)
        refresh_token_hash = hash_token(raw_refresh_token)
        expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        new_session = UserSession(
            user_id=user.id,
            device_id=device_id,
            refresh_token_hash=refresh_token_hash,
            session_status=SessionStatus.ACTIVE.value,
            ip_address_hash=ip_hash,
            user_agent=user_agent[:255] if user_agent else None,
            created_at=now,
            last_seen_at=now,
            expires_at=expires_at,
        )
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)

        # Generate short-lived JWT access token
        access_token = create_access_token(
            data={"sub": user.id, "email": user.email, "session_id": new_session.id, "device_id": device_id}
        )

        return new_session, access_token, raw_refresh_token

    @classmethod
    async def rotate_refresh_token(
        cls,
        db: AsyncSession,
        old_raw_refresh_token: str,
        device_id: Optional[str] = None,
        ip_hash: Optional[str] = None,
    ) -> Tuple[str, str, User]:
        """
        Performs secure refresh token rotation with token reuse detection (Layer 3).
        If an already-revoked refresh token is replayed:
          - Automatically terminates ALL active sessions for that user.
          - Logs TOKEN_REUSE_DETECTED critical alert.
        Returns: (new_access_token, new_raw_refresh_token, user)
        """
        now = utc_now()
        old_hash = hash_token(old_raw_refresh_token)

        query = select(UserSession).where(UserSession.refresh_token_hash == old_hash)
        result = await db.execute(query)
        session = result.scalars().first()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_query = select(User).where(User.id == session.user_id)
        user_res = await db.execute(user_query)
        user = user_res.scalars().first()

        if not user or (user.account_status or "").upper() != AccountStatus.ACTIVE.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is suspended or disabled.",
            )

        # REUSE DETECTION: If session was revoked or expired, revoke ALL active sessions
        sess_expires = ensure_utc(session.expires_at) or now
        if (session.session_status or "").upper() != SessionStatus.ACTIVE.value or sess_expires <= now:
            # Compromise detected! Invalidate all sessions for this user immediately
            revoke_all_q = select(UserSession).where(
                and_(UserSession.user_id == user.id, UserSession.session_status == SessionStatus.ACTIVE.value)
            )
            active_res = await db.execute(revoke_all_q)
            for s in active_res.scalars().all():
                s.session_status = SessionStatus.REVOKED.value
                s.revoked_at = now

            log_entry = SecurityLog(
                user_id=user.id,
                event_type="TOKEN_REUSE_DETECTED",
                severity="CRITICAL",
                details=f"Revoked refresh token was presented again. All sessions invalidated for user {user.email}.",
                ip_hash=ip_hash,
            )
            db.add(log_entry)
            await db.commit()

            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Security alert: Stale or revoked token reuse detected. All sessions terminated. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Check if the device is revoked
        dev_query = select(UserDevice).where(
            and_(UserDevice.user_id == user.id, UserDevice.device_id == session.device_id)
        )
        dev_res = await db.execute(dev_query)
        dev = dev_res.scalars().first()
        if dev and (dev.device_status or "").upper() == DeviceStatus.REVOKED.value:
            session.session_status = SessionStatus.REVOKED.value
            session.revoked_at = now
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This device has been revoked. Re-registration required.",
            )

        # Mark old session rotated (revoked)
        session.session_status = SessionStatus.REVOKED.value
        session.revoked_at = now

        # Create new rotated session
        new_raw_refresh_token = generate_secure_token(48)
        new_hash = hash_token(new_raw_refresh_token)
        new_session = UserSession(
            user_id=user.id,
            device_id=session.device_id,
            refresh_token_hash=new_hash,
            session_status=SessionStatus.ACTIVE.value,
            ip_address_hash=ip_hash,
            user_agent=session.user_agent,
            created_at=now,
            last_seen_at=now,
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
        db.add(new_session)
        await db.commit()
        await db.refresh(new_session)

        # Issue new short-lived access token
        new_access_token = create_access_token(
            data={"sub": user.id, "email": user.email, "session_id": new_session.id, "device_id": session.device_id}
        )

        return new_access_token, new_raw_refresh_token, user

    @classmethod
    async def list_active_sessions(cls, db: AsyncSession, user_id: str, current_session_id: Optional[str] = None):
        """Returns all currently active sessions for the user with device metadata."""
        now = utc_now()
        query = select(UserSession).where(
            and_(
                UserSession.user_id == user_id,
                UserSession.session_status == SessionStatus.ACTIVE.value,
                UserSession.expires_at > now,
            )
        ).order_by(UserSession.last_seen_at.desc())
        result = await db.execute(query)
        sessions = result.scalars().all()

        output = []
        for s in sessions:
            dev_q = select(UserDevice).where(
                and_(UserDevice.user_id == user_id, UserDevice.device_id == s.device_id)
            )
            dev_res = await db.execute(dev_q)
            dev = dev_res.scalars().first()

            output.append({
                "id": s.id,
                "device_id": s.device_id,
                "session_status": s.session_status,
                "created_at": s.created_at,
                "last_seen_at": s.last_seen_at,
                "expires_at": s.expires_at,
                "is_current": s.id == current_session_id,
                "device_name": dev.device_name if dev else "Unknown Device",
                "browser_name": dev.browser_name if dev else "Chrome",
            })
        return output

    @classmethod
    async def terminate_session(cls, db: AsyncSession, user_id: str, session_id: str) -> None:
        """Terminates a specific remote session."""
        query = select(UserSession).where(
            and_(UserSession.user_id == user_id, UserSession.id == session_id)
        )
        result = await db.execute(query)
        session = result.scalars().first()
        if not session:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

        session.session_status = SessionStatus.REVOKED.value
        session.revoked_at = utc_now()
        await db.commit()

    @classmethod
    async def terminate_all_sessions(
        cls, db: AsyncSession, user_id: str, except_session_id: Optional[str] = None
    ) -> int:
        """Terminates all active sessions for the user (except current if specified)."""
        now = utc_now()
        query = select(UserSession).where(
            and_(UserSession.user_id == user_id, UserSession.session_status == SessionStatus.ACTIVE.value)
        )
        if except_session_id:
            query = query.where(UserSession.id != except_session_id)

        result = await db.execute(query)
        sessions = result.scalars().all()
        for s in sessions:
            s.session_status = SessionStatus.REVOKED.value
            s.revoked_at = now

        await db.commit()
        return len(sessions)

    @classmethod
    async def clean_expired_sessions(cls, db: AsyncSession, user_id: str) -> None:
        """Marks expired sessions as expired in the database."""
        now = utc_now()
        query = select(UserSession).where(
            and_(
                UserSession.user_id == user_id,
                UserSession.session_status == SessionStatus.ACTIVE.value,
                UserSession.expires_at <= now,
            )
        )
        result = await db.execute(query)
        for s in result.scalars().all():
            s.session_status = SessionStatus.EXPIRED.value
        await db.commit()
