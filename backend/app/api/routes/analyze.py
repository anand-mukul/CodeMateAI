"""
CodeMate AI — Problem Analysis Endpoint
"""

from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.schemas.problem import ProblemRequest
from app.schemas.analysis import ProblemAnalysis
from app.services.problem_analyzer import ProblemAnalyzerService
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.user import User
from app.services.analytics.event_collector import EventCollector
from app.services.entitlement_service import (
    get_current_user,
    require_feature_entitlement,
    enforce_daily_quota,
    verify_byok_entitlement,
    get_authorized_provider,
    require_verified_email,
)
from app.ai.provider import AIProvider
from app.ai.provider_manager import ProviderManager
from app.core.security import check_rate_limit, verify_request_size
from app.core.logging import logger

router = APIRouter(prefix="/problem", tags=["Problem Analysis"])


@router.post(
    "/analyze",
    response_model=ProblemAnalysis,
    dependencies=[
        Depends(verify_request_size),
        Depends(require_verified_email),
        Depends(require_feature_entitlement("analyze")),
        Depends(enforce_daily_quota("analyze")),
        Depends(verify_byok_entitlement),
    ],
)
async def analyze_problem(
    request: Request,
    problem: ProblemRequest,
    provider: AIProvider = Depends(get_authorized_provider),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyzes a programming problem, derives constraints feasibility,
    evaluates algorithmic trade-offs, and recommends optimal data structures.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)

    try:
        analysis = await ProblemAnalyzerService.analyze_problem(problem, provider=provider)
        await EventCollector.record_server_event(
            db=db,
            event_name="code_analyzed",
            user_id=user.id,
            feature_name="analyze",
            model_identifier=getattr(provider, "model_name", None),
        )
        return analysis
    except TimeoutError as err:
        logger.error(f"Analysis timed out for '{problem.title}': {err}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI analysis timed out. The model took too long to respond.",
        )
    except ConnectionError as err:
        logger.error(f"Connection failure during analysis for '{problem.title}': {err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is currently unreachable. Please check backend network connectivity.",
        )
    except Exception as err:
        logger.error(f"Unexpected error analyzing problem '{problem.title}': {err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze problem: {str(err)}",
        )

