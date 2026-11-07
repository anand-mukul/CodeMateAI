"""
CodeMate AI — OpenRouter AI Provider Implementation
Integrates with OpenRouter API for multi-model routing, open-weight models, and free-tier access.
Reference: https://openrouter.ai/docs/quickstart
"""

from typing import Any, Dict, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel
from app.ai.provider import AIProvider
from app.ai.parsers.response_parser import parse_structured_response
from app.core.config import settings
from app.core.logging import logger

T = TypeVar("T", bound=BaseModel)


class OpenRouterProvider(AIProvider):
    """
    OpenRouter API provider supporting open-weight models (Llama 3, Qwen, Mistral)
    and cross-provider model routing.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self._api_key = api_key or settings.OPENROUTER_API_KEY or settings.AI_API_KEY
        self._model_name = model_name or settings.OPENROUTER_MODEL or "openrouter/free"
        self._base_url = (
            base_url
            or settings.OPENROUTER_BASE_URL
            or "https://openrouter.ai/api/v1"
        ).rstrip("/")

    @property
    def provider_name(self) -> str:
        return "openrouter"

    @property
    def model_name(self) -> str:
        return self._model_name

    def _has_valid_key(self) -> bool:
        if not self._api_key:
            return False
        clean = self._api_key.strip().lower()
        return not (clean.startswith("your_") or "placeholder" in clean or "here" in clean)

    def _get_headers(self) -> Dict[str, str]:
        if not self._has_valid_key():
            raise ValueError(
                "OpenRouter API key is not configured. Please add your personal key in Settings > Bring Your Own Key."
            )
        return {
            "Authorization": f"Bearer {self._api_key}",
            "HTTP-Referer": "https://codemateai.com",
            "X-Title": "CodeMate AI",
            "Content-Type": "application/json",
        }

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        headers = self._get_headers()
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self._model_name,
            "messages": messages,
            "temperature": settings.AI_TEMPERATURE,
            "max_tokens": settings.AI_MAX_OUTPUT_TOKENS,
        }

        url = f"{self._base_url}/chat/completions"

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
            except httpx.TimeoutException as exc:
                raise TimeoutError(f"OpenRouter request timed out after {settings.AI_TIMEOUT_SECONDS}s") from exc
            except httpx.RequestError as exc:
                raise ConnectionError(f"OpenRouter connection failure: {str(exc)}") from exc

        if response.status_code == 429:
            raise RuntimeError("OpenRouter rate limit exceeded (HTTP 429).")

        if response.status_code != 200:
            logger.error(f"OpenRouter error {response.status_code}: {response.text}")
            raise RuntimeError(f"OpenRouter API responded with HTTP {response.status_code}")

        data = response.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise ValueError(f"Malformed OpenRouter response structure: {data}") from exc

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
    ) -> T:
        headers = self._get_headers()
        schema_instruction = (
            f"You MUST respond ONLY with a valid, pure JSON object strictly matching this schema:\n"
            f"{response_schema.model_json_schema()}\n"
            f"Do not include any surrounding markdown fences or explanation."
        )
        full_system = f"{system_prompt}\n\n{schema_instruction}" if system_prompt else schema_instruction

        messages = [
            {"role": "system", "content": full_system},
            {"role": "user", "content": prompt},
        ]

        payload = {
            "model": self._model_name,
            "messages": messages,
            "temperature": settings.AI_TEMPERATURE,
            "max_tokens": settings.AI_MAX_OUTPUT_TOKENS,
            "response_format": {"type": "json_object"},
        }

        url = f"{self._base_url}/chat/completions"

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
            except httpx.TimeoutException as exc:
                raise TimeoutError(f"OpenRouter request timed out after {settings.AI_TIMEOUT_SECONDS}s") from exc
            except httpx.RequestError as exc:
                raise ConnectionError(f"OpenRouter connection failure: {str(exc)}") from exc

        if response.status_code == 429:
            raise RuntimeError("OpenRouter rate limit exceeded. Please wait a moment.")

        if response.status_code != 200:
            raise RuntimeError(f"OpenRouter API error (HTTP {response.status_code}): {response.text}")

        data = response.json()
        try:
            raw_text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise ValueError(f"Failed to extract structured response from OpenRouter: {exc}") from exc

        return parse_structured_response(raw_text, response_schema)

    async def check_connection(self) -> Dict[str, Any]:
        if not self._has_valid_key():
            return {
                "available": False,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "error": "OpenRouter API key is not configured. Add your key in Settings > Bring Your Own Key.",
            }

        try:
            test_resp = await self.generate_text("Reply with 'OK'", system_prompt="Reply with exactly 'OK'")
            return {
                "available": True,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "sample_response": test_resp[:20].strip(),
            }
        except Exception as e:
            return {
                "available": False,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "error": str(e),
            }

