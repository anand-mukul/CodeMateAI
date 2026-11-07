"""
CodeMate AI — Solution Error Diagnostic & Patching Endpoint
POST /api/solution/fix
"""

from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.schemas.solution import SolutionFixRequest, SolutionFixResponse
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

router = APIRouter(prefix="/solution", tags=["Error Diagnostics & Patching"])


@router.post(
    "/fix",
    response_model=SolutionFixResponse,
    dependencies=[
        Depends(verify_request_size),
        Depends(require_feature_entitlement("fix")),
        Depends(enforce_daily_quota("fix")),
        Depends(verify_byok_entitlement),
    ],
)
async def fix_solution(
    request: Request,
    body: SolutionFixRequest,
    provider: AIProvider = Depends(get_authorized_provider),
):
    """
    Diagnoses compiler errors, runtime exceptions, or wrong answer bugs in student code
    and proposes a minimally invasive, correct patch without executing untrusted code.
    """
    client_ip = request.client.host if request.client else "unknown"
    check_rate_limit(client_ip)

    try:
        diagnosed_fix = await SolutionGeneratorService.diagnose_and_fix_solution(body, provider=provider)
        return diagnosed_fix
    except TimeoutError as err:
        logger.error(f"Solution diagnostic timed out: {err}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Error diagnostic request timed out. Please try again.",
        )
    except ConnectionError as err:
        logger.error(f"Connection failure during diagnostic: {err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service unreachable.",
        )
    except Exception as err:
        logger.error(f"Failed to diagnose and fix solution: {err}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Diagnostic error: {str(err)}",
        )

