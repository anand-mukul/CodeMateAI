"""
CodeMate AI — Problem Explanation Endpoint
"""

from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.schemas.problem import ProblemRequest
from app.schemas.analysis import ProblemExplanation
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

router = APIRouter(prefix="/problem", tags=["Problem Explanation"])


@router.post(
    "/explain",
    response_model=ProblemExplanation,
    dependencies=[
        Depends(verify_request_size),
        Depends(require_verified_email),
        Depends(require_feature_entitlement("explain")),
        Depends(enforce_daily_quota("explain")),
        Depends(verify_byok_entitlement),
    ],
)
async def explain_problem(
    request: Request,
    problem: ProblemRequest,
    provider: AIProvider = Depends(get_authorized_provider),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Produces a simple, student-friendly explanation of the problem with step-by-step example walkthroughs.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)

    try:
        explanation = await ProblemAnalyzerService.explain_problem(problem, provider=provider)
        await EventCollector.record_server_event(
            db=db,
            event_name="code_explained",
            user_id=user.id,
            feature_name="explain",
            model_identifier=getattr(provider, "model_name", None),
        )
        return explanation
    except TimeoutError as err:
        logger.error(f"Explanation timed out for '{problem.title}': {err}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI explanation timed out. The model took too long to respond.",
        )
    except ConnectionError as err:
        logger.error(f"Connection failure explaining problem '{problem.title}': {err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is unreachable. Please verify backend provider network access.",
        )
    except Exception as err:
        logger.error(f"Unexpected error explaining problem '{problem.title}': {err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to explain problem: {str(err)}",
        )

