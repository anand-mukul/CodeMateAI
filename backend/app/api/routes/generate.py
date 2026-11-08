"""
CodeMate AI — Solution Generation Endpoint
"""

import time
from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.schemas.problem import ProblemRequest
from app.schemas.solution import SolutionResponse
from app.services.solution_generator import SolutionGeneratorService
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

router = APIRouter(prefix="/solution", tags=["Solution Generation"])


@router.post(
    "/generate",
    response_model=SolutionResponse,
    dependencies=[
        Depends(verify_request_size),
        Depends(require_verified_email),
        Depends(require_feature_entitlement("generate")),
        Depends(enforce_daily_quota("generate")),
        Depends(verify_byok_entitlement),
    ],
)
async def generate_solution(
    request: Request,
    problem: ProblemRequest,
    provider: AIProvider = Depends(get_authorized_provider),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generates a complete, ready-to-run competitive programming solution in the requested language
    with algorithm explanation and time/space complexity analysis.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)

    t0 = time.perf_counter()
    try:
        solution = await SolutionGeneratorService.generate_solution(problem, provider=provider)
        duration_ms = int((time.perf_counter() - t0) * 1000)
        await EventCollector.record_server_event(
            db=db,
            event_name="code_generated",
            user_id=user.id,
            feature_name="generate",
            duration_ms=duration_ms,
            model_identifier=getattr(provider, "model_name", None),
        )
        return solution
    except TimeoutError as err:
        duration_ms = int((time.perf_counter() - t0) * 1000)
        await EventCollector.record_server_event(
            db=db,
            event_name="code_generated",
            user_id=user.id,
            feature_name="generate",
            duration_ms=duration_ms,
            success=False,
            failure_category="TIMEOUT",
            model_identifier=getattr(provider, "model_name", None),
        )
        logger.error(f"Solution generation timed out for '{problem.title}': {err}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Solution generation timed out. The model took too long to respond.",
        )
    except ConnectionError as err:
        duration_ms = int((time.perf_counter() - t0) * 1000)
        await EventCollector.record_server_event(
            db=db,
            event_name="code_generated",
            user_id=user.id,
            feature_name="generate",
            duration_ms=duration_ms,
            success=False,
            failure_category="CONNECTION_ERROR",
            model_identifier=getattr(provider, "model_name", None),
        )
        logger.error(f"Connection failure generating solution for '{problem.title}': {err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is currently unreachable. Check your network or provider status.",
        )
    except Exception as err:
        duration_ms = int((time.perf_counter() - t0) * 1000)
        await EventCollector.record_server_event(
            db=db,
            event_name="code_generated",
            user_id=user.id,
            feature_name="generate",
            duration_ms=duration_ms,
            success=False,
            failure_category="SERVER_ERROR",
            model_identifier=getattr(provider, "model_name", None),
        )
        logger.error(f"Failed to generate solution for '{problem.title}': {err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Solution generation error: {str(err)}",
        )

