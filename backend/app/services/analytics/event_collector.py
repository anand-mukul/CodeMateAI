"""
CodeMate AI — Phase 8 Analytics Event Collector
Asynchronously records validated client and server telemetry events respecting opt-out rules.
"""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.db.base import utc_now, ensure_utc
from app.models.analytics import AnalyticsEvent, AnalyticsPreference
from app.services.analytics.event_schema import AnalyticsEventDTO
from app.services.analytics.event_validator import EventValidator


class EventCollector:
    @classmethod
    async def is_user_opted_out(cls, db: AsyncSession, user_id: Optional[str]) -> bool:
        """Checks if the user has opted out of optional product analytics."""
        if not user_id:
            return False
        q = select(AnalyticsPreference.opt_out).where(AnalyticsPreference.user_id == user_id)
        res = await db.execute(q)
        opt_out = res.scalar_one_or_none()
        return bool(opt_out)

    @classmethod
    async def record_client_events(
        cls,
        db: AsyncSession,
        user_id: Optional[str],
        events: List[AnalyticsEventDTO],
    ) -> int:
        """
        Validates, filters, and records a batch of client telemetry events.
        Respects user opt-out preferences. Returns the count of ingested events.
        """
        if not events:
            return 0

        # Check opt-out
        if user_id and await cls.is_user_opted_out(db, user_id):
            logger.debug(f"User '{user_id}' has opted out of analytics. Discarding {len(events)} events.")
            return 0

        records_to_add = []
        now = utc_now()

        for ev in events:
            is_valid, reason = EventValidator.validate_client_event(ev)
            if not is_valid:
                logger.warning(f"Rejected invalid analytics event: {reason}")
                continue

            record = AnalyticsEvent(
                event_name=ev.event_name,
                user_id=user_id,
                session_id=ev.session_id,
                feature_name=ev.feature_name,
                duration_ms=ev.duration_ms,
                success=ev.success,
                failure_category=ev.failure_category,
                token_usage=ev.token_usage,
                model_identifier=ev.model_identifier,
                plan_identifier=ev.plan_identifier,
                application_version=ev.application_version,
                request_id=ev.request_id,
                created_at=ensure_utc(ev.timestamp) or now,
            )
            records_to_add.append(record)

        if records_to_add:
            db.add_all(records_to_add)
            await db.commit()

        return len(records_to_add)

    @classmethod
    async def record_server_event(
        cls,
        db: AsyncSession,
        event_name: str,
        user_id: Optional[str] = None,
        feature_name: Optional[str] = None,
        duration_ms: Optional[int] = None,
        success: bool = True,
        failure_category: Optional[str] = None,
        token_usage: Optional[int] = None,
        model_identifier: Optional[str] = None,
        plan_identifier: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> Optional[AnalyticsEvent]:
        """
        Direct server-side event recording (trusted source).
        Respects opt-out for general telemetry; non-critical events are skipped if user opted out.
        """
        # Critical security / billing events bypass opt-out for legal / billing audit
        critical_events = {
            "subscription_started",
            "subscription_renewed",
            "subscription_cancelled",
            "payment_success",
            "payment_failed",
            "user_registered",
            "user_login_success",
            "user_login_failed",
        }

        if event_name not in critical_events and user_id:
            if await cls.is_user_opted_out(db, user_id):
                return None

        record = AnalyticsEvent(
            event_name=event_name,
            user_id=user_id,
            feature_name=feature_name,
            duration_ms=duration_ms,
            success=success,
            failure_category=failure_category,
            token_usage=token_usage,
            model_identifier=model_identifier,
            plan_identifier=plan_identifier,
            request_id=request_id,
            created_at=utc_now(),
        )
        db.add(record)
        await db.commit()
        return record

