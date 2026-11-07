"""
CodeMate AI — Phase 8 Analytics Endpoints
Ingests client product usage events and manages user analytics opt-out preferences.
"""

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import utc_now
from app.db.session import get_db
from app.models.analytics import AnalyticsPreference
from app.models.user import User
from app.services.analytics.event_collector import EventCollector
from app.services.analytics.event_schema import (
    AnalyticsBatchRequest,
    AnalyticsPreferenceDTO,
)
from app.services.entitlement_service import get_current_user


router = APIRouter(prefix="/analytics", tags=["Product Analytics"])


@router.post("/events", status_code=status.HTTP_202_ACCEPTED)
async def ingest_analytics_events(
    payload: AnalyticsBatchRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ingests an allowlisted batch of product analytics events from the extension client.
    Rejects server-only metrics, forged billing, and PII. Respects opt-out.
    """
    ingested_count = await EventCollector.record_client_events(
        db=db,
        user_id=user.id,
        events=payload.events,
    )
    return {
        "status": "accepted",
        "submitted": len(payload.events),
        "ingested": ingested_count,
    }


@router.get("/preferences", response_model=AnalyticsPreferenceDTO)
async def get_analytics_preference(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the user's current analytics opt-out setting.
    """
    q = select(AnalyticsPreference).where(AnalyticsPreference.user_id == user.id)
    res = await db.execute(q)
    pref = res.scalar_one_or_none()
    return AnalyticsPreferenceDTO(opt_out=pref.opt_out if pref else False)


@router.put("/preferences", response_model=AnalyticsPreferenceDTO)
async def update_analytics_preference(
    payload: AnalyticsPreferenceDTO,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Updates the user's analytics opt-out preference.
    """
    q = select(AnalyticsPreference).where(AnalyticsPreference.user_id == user.id)
    res = await db.execute(q)
    pref = res.scalar_one_or_none()

    if not pref:
        pref = AnalyticsPreference(user_id=user.id, opt_out=payload.opt_out, updated_at=utc_now())
        db.add(pref)
    else:
        pref.opt_out = payload.opt_out
        pref.updated_at = utc_now()

    await db.commit()
    return AnalyticsPreferenceDTO(opt_out=pref.opt_out)

