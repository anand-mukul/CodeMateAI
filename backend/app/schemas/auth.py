"""
CodeMate AI — Authentication, Device & Session Schemas
Pydantic V2 models for authentication, token exchange, device registration, and session control.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(default="Developer", min_length=1, max_length=100)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_id: Optional[str] = Field(default=None, max_length=64)
    device_name: Optional[str] = Field(default="Chrome Extension", max_length=100)
    browser_name: Optional[str] = Field(default="Chrome", max_length=50)
    browser_version: Optional[str] = Field(default=None, max_length=50)
    extension_version: Optional[str] = Field(default="1.0.0", max_length=50)


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(..., description="Google OAuth 2.0 ID Token or credential")
    device_id: Optional[str] = Field(default=None, max_length=64)
    device_name: Optional[str] = Field(default="Chrome Extension", max_length=100)
    browser_name: Optional[str] = Field(default="Chrome", max_length=50)
    browser_version: Optional[str] = Field(default=None, max_length=50)
    extension_version: Optional[str] = Field(default="1.0.0", max_length=50)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    display_name: str
    role: str = "user"
    auth_provider: str = "local"
    email_verified: bool
    account_status: str
    created_at: datetime
    last_login_at: Optional[datetime] = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # in seconds
    user: UserResponse


class RefreshTokenRequest(BaseModel):
    refresh_token: str
    device_id: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_id: str
    device_name: str
    browser_name: str
    browser_version: Optional[str] = None
    extension_version: Optional[str] = None
    device_status: str
    created_at: datetime
    last_seen_at: datetime


class DeviceRegisterRequest(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    device_name: str = Field(default="Chrome Extension", max_length=100)
    browser_name: str = Field(default="Chrome", max_length=50)
    browser_version: Optional[str] = None
    extension_version: Optional[str] = None


class DeviceUpdateRequest(BaseModel):
    device_name: str = Field(min_length=1, max_length=100)


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    device_id: str
    session_status: str
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
    is_current: bool = False
    device_name: Optional[str] = None
    browser_name: Optional[str] = None


class ActiveSessionSummary(BaseModel):
    id: str
    device_id: str
    last_seen_at: datetime
    device_name: str
    browser_name: str


class SessionLimitReachedResponse(BaseModel):
    detail: str = "Active session limit reached for your subscription plan."
    code: str = "SESSION_LIMIT_REACHED"
    allowed_limit: int
    active_sessions: List[ActiveSessionSummary]


class DeviceLimitReachedResponse(BaseModel):
    detail: str = "Registered device limit reached for your subscription plan."
    code: str = "DEVICE_LIMIT_REACHED"
    allowed_limit: int
    registered_devices: List[DeviceResponse]
