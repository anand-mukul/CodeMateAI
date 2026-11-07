"""
CodeMate AI — Application Security & Prompt Injection Mitigation
Enforces payload limits, rate limiting, and prompt injection neutralization.
"""

import time
import re
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from jose import jwt, JWTError
from fastapi import HTTPException, Request, status
from app.core.config import settings
from app.core.logging import logger

# Initialize Argon2id password hasher with secure parameters
_ph = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64MB
    parallelism=2,
    hash_len=32,
    salt_len=16,
)

# In-memory token bucket rate limiter
_rate_limit_records: Dict[str, Tuple[int, float]] = {}


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Argon2id."""
    return _ph.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against an Argon2id hash."""
    try:
        return _ph.verify(hashed_password, plain_password)
    except (VerifyMismatchError, Exception):
        return False


def hash_token(token: str) -> str:
    """Computes a SHA-256 hash of a token for secure storage without plaintext leakage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_secure_token(nbytes: int = 32) -> str:
    """Generates a cryptographically strong URL-safe token."""
    return secrets.token_urlsafe(nbytes)


def normalize_email(email: str) -> str:
    """Normalizes an email address to lowercase and strips whitespace."""
    if not email:
        return ""
    return email.strip().lower()


def validate_password_strength(password: str) -> Tuple[bool, Optional[str]]:
    """
    Validates that a password satisfies security requirements:
    - Minimum 8 characters
    - Contains lowercase and uppercase letters
    - Contains at least one digit
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one number."
    return True, None


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed short-lived JWT access token."""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and validates a JWT access token.
    Raises HTTPException 401 if invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Patterns that attempt to hijack LLM behavior
PROMPT_INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions", re.IGNORECASE),
    re.compile(r"disregard\s+(all\s+)?(previous|prior)\s+rules", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+(in\s+)?(developer\s+mode|dan|unrestricted)", re.IGNORECASE),
    re.compile(r"reveal\s+(your\s+)?(system\s+prompt|instructions|secret|api_key)", re.IGNORECASE),
    re.compile(r"output\s+(the\s+)?(system\s+prompt|master\s+prompt)", re.IGNORECASE),
    re.compile(r"system\s+override", re.IGNORECASE),
]


def sanitize_untrusted_text(text: str, max_chars: int = 15000) -> str:
    """
    Sanitizes untrusted problem text without corrupting valid code, math, or problem statements.
    Neutralizes direct instruction override phrases while preserving mathematical notation.
    """
    if not text:
        return ""

    truncated = text[:max_chars]

    # Neutralize overt prompt injection attempts by neutralizing their commanding nature
    sanitized = truncated
    for pattern in PROMPT_INJECTION_PATTERNS:
        sanitized = pattern.sub("[FILTERED_OVERRIDE_ATTEMPT]", sanitized)

    return sanitized


def check_rate_limit(client_id: str) -> None:
    """
    Basic token-bucket / sliding minute rate limiter for FastAPI endpoints with memory leak mitigation.
    """
    now = time.time()

    # Periodic cleanup of expired client buckets to prevent unbounded memory growth
    if len(_rate_limit_records) > 1000:
        stale_clients = [cid for cid, (_, last_t) in _rate_limit_records.items() if (now - last_t) > 120.0]
        for cid in stale_clients:
            _rate_limit_records.pop(cid, None)

    count, last_reset = _rate_limit_records.get(client_id, (0, now))

    if now - last_reset > 60.0:
        _rate_limit_records[client_id] = (1, now)
        return

    if count >= settings.RATE_LIMIT_PER_MINUTE:
        logger.warning(f"Rate limit exceeded for client {client_id}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please wait a minute before making more requests.",
        )

    _rate_limit_records[client_id] = (count + 1, last_reset)


async def verify_request_size(request: Request) -> None:
    """
    Verifies that incoming Content-Length does not exceed MAX_REQUEST_SIZE_BYTES.
    """
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            length = int(content_length)
            if length > settings.MAX_REQUEST_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Request size {length} bytes exceeds maximum allowed limit of {settings.MAX_REQUEST_SIZE_BYTES} bytes.",
                )
        except ValueError:
            pass

