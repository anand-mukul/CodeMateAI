"""
CodeMate AI — Phase 8 Analytics Retention & Data Pruning Service
Enforces data minimization by purging granular events older than 90 days.
"""

from datetime import timedelta
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.db.base import utc_now
from app.models.analytics import AnalyticsEvent


class AnalyticsRetentionService:
    RETENTION_DAYS = 90

    @classmethod
    async def purge_expired_events(cls, db: AsyncSession, retention_days: int = RETENTION_DAYS) -> int:
        """
        Deletes raw analytics events created earlier than retention_days ago.
        Preserves daily rollups in analytics_daily_aggregates.
        """
        cutoff_date = utc_now() - timedelta(days=retention_days)
        stmt = delete(AnalyticsEvent).where(AnalyticsEvent.created_at < cutoff_date)
        res = await db.execute(stmt)
        await db.commit()

        deleted_count = res.rowcount or 0
        logger.info(f"Purged {deleted_count} expired analytics events older than {retention_days} days.")
        return deleted_count

