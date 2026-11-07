"""
CodeMate AI — Phase 8 Analytics Query Engine
Provides aggregated, performant analytics queries for the internal admin dashboard.
"""

from datetime import timedelta
from typing import Any, Dict, List
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utc_now
from app.models.analytics import AnalyticsDailyAggregate, AnalyticsEvent
from app.models.project import Project, ProjectPatch
from app.models.subscription import Plan, Subscription
from app.models.enums import SubscriptionStatus
from app.models.user import User


class AnalyticsQueries:
    # Configurable estimated cost per 1k tokens (blended average for Flash/Mini models: $0.00015 per 1k)
    ESTIMATED_COST_PER_1K_TOKENS_USD = 0.00015

    @classmethod
    async def get_overview(cls, db: AsyncSession) -> Dict[str, Any]:
        """Provides high-level SaaS health overview."""
        now = utc_now()
        day_ago = now - timedelta(days=1)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # 1. Total registered users
        total_users_q = select(func.count(User.id))
        total_users = (await db.execute(total_users_q)).scalar_one() or 0

        # 2. Active users (DAU, WAU, MAU) based on analytics activity or last_login
        dau_q = select(func.count(func.distinct(AnalyticsEvent.user_id))).where(AnalyticsEvent.created_at >= day_ago)
        dau = (await db.execute(dau_q)).scalar_one() or 0

        wau_q = select(func.count(func.distinct(AnalyticsEvent.user_id))).where(AnalyticsEvent.created_at >= week_ago)
        wau = (await db.execute(wau_q)).scalar_one() or 0

        mau_q = select(func.count(func.distinct(AnalyticsEvent.user_id))).where(AnalyticsEvent.created_at >= month_ago)
        mau = (await db.execute(mau_q)).scalar_one() or 0

        # 3. Plan Distribution
        free_q = select(func.count(Subscription.id)).where(Subscription.plan_id.in_(["FREE", "free"]), Subscription.status == SubscriptionStatus.ACTIVE.value)
        free_count = (await db.execute(free_q)).scalar_one() or 0

        pro_q = select(func.count(Subscription.id)).where(Subscription.plan_id.in_(["PLAN_CORE_PASS", "core_daily"]), Subscription.status == SubscriptionStatus.ACTIVE.value)
        pro_count = (await db.execute(pro_q)).scalar_one() or 0

        prem_q = select(func.count(Subscription.id)).where(Subscription.plan_id.in_(["PLAN_AUTOPILOT_PASS", "autopilot_weekly"]), Subscription.status == SubscriptionStatus.ACTIVE.value)
        prem_count = (await db.execute(prem_q)).scalar_one() or 0

        # 4. Total AI Requests & Tokens
        ai_events_q = select(
            func.count(AnalyticsEvent.id).label("total_reqs"),
            func.sum(case((AnalyticsEvent.success == True, 1), else_=0)).label("success_reqs"),
            func.coalesce(func.sum(AnalyticsEvent.token_usage), 0).label("total_tokens"),
        ).where(AnalyticsEvent.event_name.in_(["code_generated", "code_explained", "code_analyzed", "code_optimized", "code_debugged", "ai_request_completed"]))
        ai_res = (await db.execute(ai_events_q)).first()

        total_reqs = ai_res.total_reqs or 0
        success_reqs = ai_res.success_reqs or 0
        total_tokens = ai_res.total_tokens or 0
        success_rate = round((success_reqs / total_reqs * 100), 2) if total_reqs > 0 else 100.0

        estimated_cost = round((total_tokens / 1000.0) * cls.ESTIMATED_COST_PER_1K_TOKENS_USD, 4)

        return {
            "total_users": total_users,
            "active_users_daily": max(dau, 1 if total_users > 0 else 0),
            "active_users_weekly": max(wau, 1 if total_users > 0 else 0),
            "active_users_monthly": max(mau, 1 if total_users > 0 else 0),
            "free_users": free_count if free_count > 0 else max(total_users - pro_count - prem_count, 0),
            "pro_users": pro_count,
            "premium_users": prem_count,
            "total_ai_requests": total_reqs,
            "overall_success_rate": success_rate,
            "total_tokens_consumed": total_tokens,
            "estimated_cost_usd": estimated_cost,
        }

    @classmethod
    async def get_feature_adoption(cls, db: AsyncSession, days: int = 30) -> List[Dict[str, Any]]:
        """Returns adoption and usage breakdown per feature."""
        cutoff = utc_now() - timedelta(days=days)
        q = (
            select(
                AnalyticsEvent.feature_name,
                func.count(AnalyticsEvent.id).label("usage_count"),
                func.count(func.distinct(AnalyticsEvent.user_id)).label("unique_users"),
                func.avg(AnalyticsEvent.duration_ms).label("avg_latency_ms"),
            )
            .where(AnalyticsEvent.created_at >= cutoff, AnalyticsEvent.feature_name.isnot(None))
            .group_by(AnalyticsEvent.feature_name)
            .order_by(func.count(AnalyticsEvent.id).desc())
        )
        res = await db.execute(q)
        return [
            {
                "feature_name": row.feature_name,
                "usage_count": row.usage_count,
                "unique_users": row.unique_users,
                "avg_latency_ms": round(float(row.avg_latency_ms or 0), 1),
            }
            for row in res.all()
        ]

    @classmethod
    async def get_ai_performance(cls, db: AsyncSession, days: int = 7) -> Dict[str, Any]:
        """Calculates AI latency percentiles, error categories, and model distributions."""
        cutoff = utc_now() - timedelta(days=days)

        # Failure categories
        failures_q = (
            select(
                AnalyticsEvent.failure_category,
                func.count(AnalyticsEvent.id).label("count"),
            )
            .where(AnalyticsEvent.created_at >= cutoff, AnalyticsEvent.success == False)
            .group_by(AnalyticsEvent.failure_category)
        )
        failures_res = await db.execute(failures_q)
        failure_breakdown = {row.failure_category or "UNKNOWN": row.count for row in failures_res.all()}

        # Model distribution
        models_q = (
            select(
                AnalyticsEvent.model_identifier,
                func.count(AnalyticsEvent.id).label("count"),
                func.coalesce(func.sum(AnalyticsEvent.token_usage), 0).label("tokens"),
            )
            .where(AnalyticsEvent.created_at >= cutoff, AnalyticsEvent.model_identifier.isnot(None))
            .group_by(AnalyticsEvent.model_identifier)
        )
        models_res = await db.execute(models_q)
        model_distribution = [
            {"model": row.model_identifier, "requests": row.count, "tokens": row.tokens}
            for row in models_res.all()
        ]

        # Latency statistics
        durations_q = (
            select(AnalyticsEvent.duration_ms)
            .where(AnalyticsEvent.created_at >= cutoff, AnalyticsEvent.duration_ms.isnot(None))
            .order_by(AnalyticsEvent.duration_ms.asc())
        )
        durations = (await db.execute(durations_q)).scalars().all()

        p50 = 0
        p95 = 0
        avg_lat = 0
        if durations:
            n = len(durations)
            avg_lat = round(sum(durations) / n, 1)
            p50 = durations[int(n * 0.50)]
            p95 = durations[min(int(n * 0.95), n - 1)]

        return {
            "total_measured_requests": len(durations),
            "average_latency_ms": avg_lat,
            "p50_latency_ms": p50,
            "p95_latency_ms": p95,
            "failure_categories": failure_breakdown,
            "model_distribution": model_distribution,
        }

    @classmethod
    async def get_project_intelligence_metrics(cls, db: AsyncSession) -> Dict[str, Any]:
        """Measures project indexing volume and patch outcomes."""
        total_projects = (await db.execute(select(func.count(Project.id)))).scalar_one() or 0
        total_patches = (await db.execute(select(func.count(ProjectPatch.id)))).scalar_one() or 0
        applied_patches = (await db.execute(select(func.count(ProjectPatch.id)).where(ProjectPatch.status == "applied"))).scalar_one() or 0
        rolled_back = (await db.execute(select(func.count(ProjectPatch.id)).where(ProjectPatch.status == "rolled_back"))).scalar_one() or 0

        return {
            "total_imported_projects": total_projects,
            "total_patches_generated": total_patches,
            "applied_patches": applied_patches,
            "rolled_back_patches": rolled_back,
            "application_success_rate": round((applied_patches / total_patches * 100), 2) if total_patches > 0 else 100.0,
        }
