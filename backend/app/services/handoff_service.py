"""
CodeMate AI — Single-Use Authentication Handoff Service
Enables short-lived, single-use, server-validated handoff codes between
the Chrome Extension and the Web Portal without exposing long-lived access or refresh tokens in URLs.
"""

import time
import asyncio
from typing import Any, Dict, Optional, Tuple
from fastapi import HTTPException, status

from app.core.security import generate_secure_token, hash_token
from app.core.logging import logger

_handoff_store: Dict[str, Dict[str, Any]] = {}
_store_lock = asyncio.Lock()


class HandoffService:
    """
    Manages short-lived (60-second), single-use cryptographic handoff codes
    for secure cross-context authentication handoff.
    """

    @classmethod
    async def create_handoff_code(cls, user_id: str, ttl_seconds: int = 60) -> Tuple[str, int]:
        """
        Generates a single-use cryptographically random handoff code.
        Only the SHA-256 hash is persisted in memory to prevent credential leakage.
        """
        raw_code = f"cm_ho_{generate_secure_token(32)}"
        code_hash = hash_token(raw_code)
        now = time.time()

        async with _store_lock:
            # Purge expired entries to prevent memory growth
            expired_keys = [k for k, v in _handoff_store.items() if v["expires_at"] < now]
            for k in expired_keys:
                _handoff_store.pop(k, None)

            _handoff_store[code_hash] = {
                "user_id": user_id,
                "created_at": now,
                "expires_at": now + ttl_seconds,
                "consumed": False,
            }

        logger.info(f"[HandoffService] Issued single-use handoff code for user {user_id} (TTL: {ttl_seconds}s)")
        return raw_code, ttl_seconds

    @classmethod
    async def consume_handoff_code(cls, raw_code: str) -> str:
        """
        Consumes a handoff code, validating expiration and single-use status.
        Immediately marks as consumed to prevent replay attacks.
        Returns user_id on success, or raises HTTPException on error.
        """
        if not raw_code or not isinstance(raw_code, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid handoff code format.",
            )

        code_hash = hash_token(raw_code.strip())
        now = time.time()

        async with _store_lock:
            entry = _handoff_store.get(code_hash)
            if not entry:
                logger.warning("[HandoffService] Rejection: Unknown handoff code.")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired handoff code.",
                )

            if entry["consumed"]:
                logger.warning(f"[HandoffService] Replay detected! Code already consumed for user {entry['user_id']}.")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Handoff code has already been consumed.",
                )

            if now > entry["expires_at"]:
                _handoff_store.pop(code_hash, None)
                logger.warning(f"[HandoffService] Rejection: Expired handoff code for user {entry['user_id']}.")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Handoff code has expired.",
                )

            # Atomic consumption
            entry["consumed"] = True

        logger.info(f"[HandoffService] Successfully consumed handoff code for user {entry['user_id']}.")
        return entry["user_id"]

