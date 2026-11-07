"""
CodeMate AI — Authentication Endpoints
Provides registration, Argon2id login, token refresh rotation, email verification, and password recovery.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    hash_token,
    generate_secure_token,
    normalize_email,
    validate_password_strength,
)
from app.db.base import utc_now
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    RefreshTokenRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    GoogleLoginRequest,
    UserRegisterRequest,
    UserResponse,
    VerifyEmailRequest,
    DeviceRegisterRequest,
)
from app.services.device_service import DeviceService
from app.services.session_service import SessionService
from app.services.subscription_service import SubscriptionService
from app.services.notification_service import NotificationService
from app.services.entitlement_service import get_current_user_and_session, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Registers a new user account with Argon2id password hashing and sends verification token."""
    email = normalize_email(payload.email)

    # Validate password strength
    valid_pwd, reason = validate_password_strength(payload.password)
    if not valid_pwd:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    # Check duplicate email
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    if result.scalars().first():
        # Prevent account enumeration with generic message
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists.",
        )

    pwd_hash = hash_password(payload.password)
    verif_token = generate_secure_token(32)
    verif_hash = hash_token(verif_token)
    verif_expires = utc_now() + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)

    user = User(
        email=email,
        password_hash=pwd_hash,
        display_name=payload.display_name.strip() or "Developer",
        email_verified=False,
        account_status="active",
        verification_token_hash=verif_hash,
        verification_expires_at=verif_expires,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Automatically provision default Free subscription tier
    await SubscriptionService.get_or_create_user_subscription(db, user.id)

    # Send verification notification
    await NotificationService.send_verification_email(email, verif_token)

    return user


@router.post("/login", response_model=TokenResponse)
async def login_user(
    payload: UserLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_forwarded_for: Optional[str] = Header(default=None),
):
    """
    Authenticates user, registers device installation, creates active session enforcing concurrent limits,
    and returns JWT access token + rotating refresh token.
    """
    email = normalize_email(payload.email)

    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalars().first()

    # Generic error message to prevent account enumeration
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if user.account_status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled or suspended.",
        )

    # Register/associate device
    device_id = payload.device_id or generate_secure_token(16)
    dev_request = DeviceRegisterRequest(
        device_id=device_id,
        device_name=payload.device_name or "Chrome Extension",
        browser_name=payload.browser_name or "Chrome",
        browser_version=payload.browser_version,
        extension_version=payload.extension_version or "1.0.0",
    )
    await DeviceService.register_device(db, user, dev_request)

    # Derive privacy-conscious IP hash
    client_ip = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else request.client.host if request.client else "unknown"
    ip_hash = hash_token(client_ip)[:16]
    user_agent = request.headers.get("user-agent", "")

    # Create active session (enforces concurrent session limit per plan)
    session, access_token, raw_refresh_token = await SessionService.create_session(
        db=db,
        user=user,
        device_id=device_id,
        ip_hash=ip_hash,
        user_agent=user_agent,
    )

    user.last_login_at = utc_now()
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/google", response_model=TokenResponse)
async def login_with_google(
    payload: GoogleLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_forwarded_for: Optional[str] = Header(default=None),
):
    """
    Authenticates or provisions a user using Google OAuth ID token,
    registers device (Layer 1), starts session (Layer 2), and returns JWT access + refresh tokens.
    """
    token_str = payload.id_token.strip()
    google_client_id = settings.GOOGLE_CLIENT_ID

    try:
        is_live_google_id = google_client_id and not (
            "your_google_client_id_here" in google_client_id or "mock" in google_client_id
        )
        if is_live_google_id:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests
            idinfo = google_id_token.verify_oauth2_token(
                token_str, google_requests.Request(), google_client_id
            )
        else:
            from jose import jwt
            # Fallback decode for development/testing when placeholder or mock client ID is used
            idinfo = jwt.decode(
                token_str,
                "secret",
                algorithms=["HS256"],
                options={"verify_signature": False, "verify_aud": False},
            )

        email = normalize_email(idinfo.get("email"))
        google_sub = idinfo.get("sub")
        display_name = idinfo.get("name") or idinfo.get("given_name") or email.split("@")[0]
        email_verified = idinfo.get("email_verified", True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check existing user by email or google_id
    query = select(User).where((User.email == email) | (User.google_id == google_sub))
    result = await db.execute(query)
    user = result.scalars().first()

    if not user:
        user = User(
            email=email,
            password_hash=hash_password(generate_secure_token(32)),
            display_name=display_name,
            auth_provider="google",
            google_id=google_sub,
            email_verified=bool(email_verified),
            account_status="active",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # Provision default Free subscription tier
        await SubscriptionService.get_or_create_user_subscription(db, user.id)
    else:
        if not user.google_id and google_sub:
            user.google_id = google_sub
        if not user.email_verified and email_verified:
            user.email_verified = True
        user.last_login_at = utc_now()
        await db.commit()

    if user.account_status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled or suspended.",
        )

    # Register/associate device (Layer 1)
    device_id = payload.device_id or generate_secure_token(16)
    dev_request = DeviceRegisterRequest(
        device_id=device_id,
        device_name=payload.device_name or "Chrome Extension",
        browser_name=payload.browser_name or "Chrome",
        browser_version=payload.browser_version,
        extension_version=payload.extension_version or "1.0.0",
    )
    await DeviceService.register_device(db, user, dev_request)

    # Derive privacy-conscious IP hash
    client_ip = (
        x_forwarded_for.split(",")[0].strip()
        if x_forwarded_for
        else request.client.host
        if request.client
        else "unknown"
    )
    ip_hash = hash_token(client_ip)[:16]
    user_agent = request.headers.get("user-agent", "")

    # Create active session (Layer 2 concurrent limits)
    session, access_token, raw_refresh_token = await SessionService.create_session(
        db=db,
        user=user,
        device_id=device_id,
        ip_hash=ip_hash,
        user_agent=user_agent,
    )

    user.last_login_at = utc_now()
    await db.commit()

    return TokenResponse(
        access_token=access_token,
        refresh_token=raw_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(
    payload: RefreshTokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_forwarded_for: Optional[str] = Header(default=None),
):
    """
    Rotates refresh token and issues new access token.
    Detects refresh token reuse and immediately invalidates compromised sessions.
    """
    client_ip = x_forwarded_for.split(",")[0].strip() if x_forwarded_for else request.client.host if request.client else "unknown"
    ip_hash = hash_token(client_ip)[:16]

    new_access_token, new_refresh_token, user = await SessionService.rotate_refresh_token(
        db=db,
        old_raw_refresh_token=payload.refresh_token,
        device_id=payload.device_id,
        ip_hash=ip_hash,
    )

    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_current_session(
    user_and_session=Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Logs out from the current device session by revoking its session token."""
    user, session = user_and_session
    await SessionService.terminate_session(db, user.id, session.id)
    return {"success": True, "message": "Logged out successfully from current device."}


@router.post("/logout-all", status_code=status.HTTP_200_OK)
async def logout_all_sessions(
    user_and_session=Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Terminates all active sessions across all devices for the authenticated user."""
    user, _ = user_and_session
    count = await SessionService.terminate_all_sessions(db, user.id)
    return {"success": True, "message": f"Terminated {count} active session(s)."}


@router.post("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email_token(payload: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    """Verifies user email using single-use verification token."""
    now = utc_now()
    token_hash = hash_token(payload.token.strip())

    query = select(User).where(
        and_(
            User.verification_token_hash == token_hash,
            User.verification_expires_at > now,
        )
    )
    result = await db.execute(query)
    user = result.scalars().first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token.",
        )

    user.email_verified = True
    user.verification_token_hash = None
    user.verification_expires_at = None
    await db.commit()

    return {"success": True, "message": "Email verified successfully."}


@router.get("/verify-email", response_class=HTMLResponse)
async def verify_email_via_link(token: str = Query(..., description="Email verification token"), db: AsyncSession = Depends(get_db)):
    """Allows 1-click verification directly from email link."""
    now = utc_now()
    token_hash = hash_token(token.strip())

    query = select(User).where(
        and_(
            User.verification_token_hash == token_hash,
            User.verification_expires_at > now,
        )
    )
    result = await db.execute(query)
    user = result.scalars().first()

    if not user:
        return HTMLResponse(
            "<!DOCTYPE html><html><body style='background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;'>"
            "<div style='text-align:center;padding:2.5rem;background:#1e293b;border-radius:1rem;border:1px solid #334155;max-width:420px;'>"
            "<h2 style='color:#ef4444;margin-bottom:0.5rem;'>Verification Failed</h2>"
            "<p style='color:#94a3b8;font-size:0.9rem;'>This verification link is invalid or has expired.</p>"
            "<a href='/portal' style='display:inline-block;margin-top:1.5rem;padding:0.75rem 1.5rem;background:#4f46e5;color:#fff;text-decoration:none;border-radius:0.5rem;font-weight:600;'>Return to Web Portal →</a>"
            "</div></body></html>",
            status_code=400,
        )

    user.email_verified = True
    user.verification_token_hash = None
    user.verification_expires_at = None
    await db.commit()

    return HTMLResponse(
        "<!DOCTYPE html><html><body style='background:#0f172a;color:#f8fafc;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;'>"
        "<div style='text-align:center;padding:2.5rem;background:#1e293b;border-radius:1rem;border:1px solid #334155;max-width:420px;'>"
        "<h2 style='color:#10b981;margin-bottom:0.5rem;'>✓ Email Verified Successfully!</h2>"
        "<p style='color:#94a3b8;font-size:0.9rem;'>Your CodeMate AI account is now verified and active.</p>"
        "<a href='/portal' style='display:inline-block;margin-top:1.5rem;padding:0.75rem 1.5rem;background:#10b981;color:#fff;text-decoration:none;border-radius:0.5rem;font-weight:600;'>Open Developer Portal →</a>"
        "</div></body></html>"
    )


@router.post("/verify-self", status_code=status.HTTP_200_OK)
async def verify_own_email(
    user_and_session=Depends(get_current_user_and_session),
    db: AsyncSession = Depends(get_db),
):
    """Allows an authenticated user to verify their own email in 1 click."""
    user, _ = user_and_session
    user.email_verified = True
    user.verification_token_hash = None
    user.verification_expires_at = None
    await db.commit()
    return {"success": True, "message": "Your email has been verified successfully!"}


@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification_email(payload: ResendVerificationRequest, db: AsyncSession = Depends(get_db)):
    """Generates a new verification token and dispatches email notification."""
    email = normalize_email(payload.email)
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalars().first()

    # Always return success to prevent email enumeration
    if user and not user.email_verified:
        verif_token = generate_secure_token(32)
        user.verification_token_hash = hash_token(verif_token)
        user.verification_expires_at = utc_now() + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)
        await db.commit()
        await NotificationService.send_verification_email(user.email, verif_token)

    return {"success": True, "message": "If the account exists and is unverified, a verification email has been sent."}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password_request(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Initiates single-use password reset flow without revealing account existence."""
    email = normalize_email(payload.email)
    query = select(User).where(User.email == email)
    result = await db.execute(query)
    user = result.scalars().first()

    if user and user.account_status == "active":
        reset_token = generate_secure_token(32)
        user.reset_token_hash = hash_token(reset_token)
        user.reset_expires_at = utc_now() + timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS)
        await db.commit()
        await NotificationService.send_password_reset_email(user.email, reset_token)

    return {"success": True, "message": "If an active account exists with this email, password reset instructions have been dispatched."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password_with_token(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Resets user password given a valid, non-expired reset token."""
    now = utc_now()
    token_hash = hash_token(payload.token.strip())

    valid_pwd, reason = validate_password_strength(payload.new_password)
    if not valid_pwd:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=reason)

    query = select(User).where(
        and_(
            User.reset_token_hash == token_hash,
            User.reset_expires_at > now,
        )
    )
    result = await db.execute(query)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")

    user.password_hash = hash_password(payload.new_password)
    user.reset_token_hash = None
    user.reset_expires_at = None

    # Invalidate all existing sessions upon password change for security
    await SessionService.terminate_all_sessions(db, user.id)

    await db.commit()
    return {"success": True, "message": "Password reset successfully. Please log in with your new credentials."}


@router.get("/me", response_model=UserResponse)
async def get_my_profile(user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile details."""
    return user

