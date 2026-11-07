"""
CodeMate AI — Code Optimization Endpoint
"""

from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.schemas.solution import OptimizationRequest, OptimizationResponse
from app.services.solution_generator import SolutionGeneratorService
from app.services.entitlement_service import (
    require_feature_entitlement,
    enforce_daily_quota,
    verify_byok_entitlement,
    get_authorized_provider,
)
from app.ai.provider import AIProvider
from app.ai.provider_manager import ProviderManager
from app.core.security import check_rate_limit, verify_request_size
from app.core.logging import logger

router = APIRouter(prefix="/solution", tags=["Code Optimization"])


@router.post(
    "/optimize",
    response_model=OptimizationResponse,
    dependencies=[
        Depends(verify_request_size),
        Depends(require_feature_entitlement("optimize")),
        Depends(enforce_daily_quota("optimize")),
        Depends(verify_byok_entitlement),
    ],
)
async def optimize_solution(
    request: Request,
    body: OptimizationRequest,
    provider: AIProvider = Depends(get_authorized_provider),
):
    """
    Refactors and optimizes a student's existing code to reduce time/space complexity
    and eliminate I/O or allocation bottlenecks.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)

    try:
        optimized = await SolutionGeneratorService.optimize_solution(body, provider=provider)
        return optimized
    except TimeoutError as err:
        logger.error(f"Optimization timed out: {err}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Code optimization timed out.",
        )
    except ConnectionError as err:
        logger.error(f"Connection failure during optimization: {err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service unreachable.",
        )
    except Exception as err:
        logger.error(f"Failed to optimize code: {err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code optimization error: {str(err)}",
        )

