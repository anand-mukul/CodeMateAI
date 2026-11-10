"""
CodeMate AI — Health & System Diagnostics Endpoints
"""

import time
from fastapi import APIRouter, Request
from app.schemas.common import HealthResponse, AIStatusResponse
from app.ai.provider_manager import ProviderManager
from app.core.config import settings
from app.db.session import check_db_health

router = APIRouter(tags=["Health & Status"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Returns general backend health and runtime metadata.
    """
    return HealthResponse(
        status="healthy",
        service=settings.SERVICE_NAME,
        version=settings.SERVICE_VERSION,
        timestamp=time.time(),
    )


@router.get("/ready")
async def readiness_check():
    """
    Readiness probe for container orchestrators (Kubernetes / Docker) and reverse proxies.
    Verifies that the database pool, provider subsystem, and core services are responsive.
    """
    try:
        db_health = await check_db_health()
        provider = ProviderManager.get_provider()
        conn = await provider.check_connection()
        from app.services.upstash_service import UpstashRedisService
        redis_health = await UpstashRedisService.check_connection()
        is_ready = conn.get("available", False) and db_health.get("status") == "healthy"
        return {
            "status": "ready" if is_ready else "degraded",
            "environment": settings.ENVIRONMENT,
            "database": db_health,
            "provider": provider.provider_name,
            "model": provider.model_name,
            "redis": redis_health,
            "timestamp": time.time(),
        }
    except Exception as exc:
        logger.warning(f"Readiness probe encountered error: {exc}")
        return {
            "status": "unhealthy",
            "environment": settings.ENVIRONMENT,
            "error": "Service dependencies are unavailable or degraded.",
            "timestamp": time.time(),
        }


@router.get("/ai/status", response_model=AIStatusResponse)
async def ai_status(request: Request):
    """
    Checks the status and connectivity of the configured AI provider.
    Supports optional provider override query or header (e.g. ?provider=mock).
    Never exposes API keys or internal secrets.
    """
    provider_override = request.query_params.get("provider") or request.headers.get("x-codemate-provider")
    model_override = request.query_params.get("model") or request.headers.get("x-codemate-model")
    api_key_override = request.headers.get("x-codemate-api-key")
    provider = ProviderManager.get_provider(
        override=provider_override,
        model_override=model_override,
        api_key_override=api_key_override,
    )
    status_info = await provider.check_connection()

    return AIStatusResponse(
        provider=provider.provider_name,
        model=provider.model_name,
        available=status_info.get("available", False),
        is_mock=(provider.provider_name == "mock"),
        details={k: v for k, v in status_info.items() if k not in ["api_key", "secret"]},
    )


@router.get("/ai/catalog")
async def ai_catalog():
    """
    Returns available AI providers, supported model profiles, and capabilities.
    """
    return {
        "providers": {
            "gemini": {
                "name": "Google Gemini",
                "enabled": True,
                "badge": "Available",
                "models": ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"],
            },
            "openai": {
                "name": "OpenAI",
                "enabled": True,
                "badge": "Available",
                "models": ["gpt-4o-mini", "gpt-4o", "o3-mini"],
            },
            "openrouter": {
                "name": "OpenRouter",
                "enabled": True,
                "badge": "Available",
                "models": [
                    "meta-llama/llama-3.3-70b-instruct:free",
                    "qwen/qwen-2.5-coder-32b-instruct:free",
                    "mistralai/mistral-7b-instruct:free",
                ],
            },
            "anthropic": {
                "name": "Claude",
                "enabled": False,
                "badge": "Coming Soon",
                "models": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
            },
            "deepseek": {
                "name": "DeepSeek",
                "enabled": False,
                "badge": "Coming Soon",
                "models": ["deepseek-chat", "deepseek-reasoner"],
            },
            "xai": {
                "name": "Grok",
                "enabled": False,
                "badge": "Coming Soon",
                "models": ["grok-2"],
            },
        }
    }

