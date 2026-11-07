"""
CodeMate AI — Phase 8 Analytics Event Aggregator & Rollup Worker
Rolls up granular events into daily aggregates for high-speed dashboard analytics.
"""

from datetime import datetime, timezone
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.models.analytics import AnalyticsDailyAggregate, AnalyticsEvent


class EventAggregator:
    @classmethod
    async def aggregate_daily_metrics(cls, db: AsyncSession, target_date: str) -> int:
        """
        Aggregates events for a specific calendar date (YYYY-MM-DD).
        Calculates totals, success rates, token usage, and durations grouped by (event_name, feature_name).
        """
        start_dt = datetime.strptime(target_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_dt = start_dt.replace(hour=23, minute=59, second=59)

        # Query metrics grouped by event_name and feature_name
        q = (
            select(
                AnalyticsEvent.event_name,
                AnalyticsEvent.feature_name,
                func.count(AnalyticsEvent.id).label("total_count"),
                func.sum(case((AnalyticsEvent.success == True, 1), else_=0)).label("success_count"),
                func.sum(case((AnalyticsEvent.success == False, 1), else_=0)).label("failure_count"),
                func.coalesce(func.sum(AnalyticsEvent.duration_ms), 0).label("total_duration_ms"),
                func.coalesce(func.sum(AnalyticsEvent.token_usage), 0).label("total_tokens"),
            )
            .where(AnalyticsEvent.created_at >= start_dt, AnalyticsEvent.created_at <= end_dt)
            .group_by(AnalyticsEvent.event_name, AnalyticsEvent.feature_name)
        )

        res = await db.execute(q)
        rows = res.all()

        saved_count = 0
        for row in rows:
            event_name = row.event_name
            feature_name = row.feature_name

            # Check if record already exists in daily aggregates
            existing_q = select(AnalyticsDailyAggregate).where(
                AnalyticsDailyAggregate.date == target_date,
                AnalyticsDailyAggregate.event_name == event_name,
                AnalyticsDailyAggregate.feature_name == feature_name,
            )
            existing_res = await db.execute(existing_q)
            agg = existing_res.scalar_one_or_none()

            if not agg:
                agg = AnalyticsDailyAggregate(
                    date=target_date,
                    event_name=event_name,
                    feature_name=feature_name,
                )
                db.add(agg)

            agg.total_count = int(row.total_count or 0)
            agg.success_count = int(row.success_count or 0)
            agg.failure_count = int(row.failure_count or 0)
            agg.total_duration_ms = int(row.total_duration_ms or 0)
            agg.total_tokens = int(row.total_tokens or 0)
            saved_count += 1

        await db.commit()
        logger.info(f"Aggregated {saved_count} metrics for date {target_date}.")
        return saved_count
