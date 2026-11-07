"""
CodeMate AI — Database Declarative Base & Model Utilities
SQLAlchemy 2.0 compatible declarative base with UTC timestamp helpers and UUID generation.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import DateTime, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    """Returns the current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Ensures datetime is timezone-aware UTC (fixes SQLite naive datetime deserialization)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def generate_uuid() -> str:
    """Generates a standard UUID4 hex string."""
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy 2.x models."""
    pass


class TimestampMixin:
    """Mixin adding standard created_at and updated_at UTC timestamps."""
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )
