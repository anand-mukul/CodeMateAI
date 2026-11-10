"""
CodeMate AI — DeepSeek AI Provider Implementation
Integrates with DeepSeek API via OpenAI-compatible endpoints.
Reference: https://api-docs.deepseek.com/
"""

import time
from typing import Any, Dict, List, Optional
import httpx
from app.ai.openai_provider import OpenAIProvider
from app.core.config import settings
from app.core.logging import logger


class DeepSeekProvider(OpenAIProvider):
    """
    Official DeepSeek API Provider.
    Primary models:
      - deepseek-flash (DeepSeek-V4.1-Flash, 1M context, high speed & cost efficiency)
      - deepseek-v4-pro (DeepSeek-V4-Pro, 1M context, high reasoning performance)
      - deepseek-chat (legacy alias mapping forward)
    """

    SUPPORTED_MODELS: List[str] = [
        "deepseek-flash",
        "deepseek-v4-pro",
        "deepseek-chat",
    ]

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        raw_key = api_key.strip() if (api_key and isinstance(api_key, str)) else None
        key = raw_key or settings.DEEPSEEK_API_KEY or settings.AI_API_KEY
        model = model_name or settings.DEEPSEEK_MODEL or "deepseek-flash"
        # Standardize base URL without trailing slash or duplicate /v1
        raw_url = base_url or settings.DEEPSEEK_BASE_URL or "https://api.deepseek.com"
        clean_url = raw_url.rstrip("/")
        if clean_url.endswith("/v1"):
            clean_url = clean_url[:-3]

        super().__init__(api_key=key, model_name=model, base_url=clean_url)

    @property
    def provider_name(self) -> str:
        return "deepseek"

    def _get_headers(self) -> Dict[str, str]:
        if not self._has_valid_key():
            raise ValueError(
                "DeepSeek API key is not configured. Please enter your API key in Settings."
            )
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def check_connection(self) -> Dict[str, Any]:
        """
        Probes DeepSeek endpoint via zero-cost /models endpoint or quick probe.
        Verifies API key validity, lists accessible models, and measures latency.
        """
        if not self._has_valid_key():
            return {
                "available": False,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "error": "DeepSeek API key is not configured. Please enter your API key in Settings.",
            }

        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(
                    f"{self._base_url}/models",
                    headers=self._get_headers(),
                )
                latency_ms = round((time.perf_counter() - t0) * 1000, 2)

                if res.status_code == 200:
                    data = res.json().get("data", [])
                    model_ids = [m.get("id") for m in data if isinstance(m, dict)]
                    return {
                        "available": True,
                        "provider": self.provider_name,
                        "model": self.model_name,
                        "is_mock": False,
                        "latency_ms": latency_ms,
                        "available_models": model_ids or self.SUPPORTED_MODELS,
                    }
                elif res.status_code == 401:
                    return {
                        "available": False,
                        "provider": self.provider_name,
                        "model": self.model_name,
                        "is_mock": False,
                        "error": "Invalid DeepSeek API key. Please check your credentials in Settings.",
                    }
                else:
                    return {
                        "available": False,
                        "provider": self.provider_name,
                        "model": self.model_name,
                        "is_mock": False,
                        "error": f"DeepSeek returned HTTP status {res.status_code}.",
                    }
        except httpx.TimeoutException:
            return {
                "available": False,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "error": "Connection to DeepSeek timed out. Please try again.",
            }
        except Exception:
            return {
                "available": False,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "error": "Unable to reach DeepSeek servers. Please check your network connection.",
            }
