"""
CodeMate AI — Anthropic (Claude) AI Provider Implementation
Integrates with Anthropic Messages API.
Reference: https://platform.claude.com/docs/en/home
"""

from typing import Any, Dict, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel
from app.ai.provider import AIProvider
from app.ai.parsers.response_parser import parse_structured_response
from app.core.config import settings
from app.core.logging import logger

T = TypeVar("T", bound=BaseModel)


class AnthropicProvider(AIProvider):
    """
    Anthropic Claude API implementation using Messages API.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self._api_key = api_key or settings.ANTHROPIC_API_KEY
        self._model_name = model_name or settings.ANTHROPIC_MODEL or "claude-3-5-sonnet-20241022"
        self._base_url = (
            base_url
            or settings.ANTHROPIC_BASE_URL
            or "https://api.anthropic.com/v1"
        ).rstrip("/")

    @property
    def provider_name(self) -> str:
        return "anthropic"

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
                "Anthropic API key is not configured. Please add your key in Settings > Bring Your Own Key."
            )
        return {
            "x-api-key": self._api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        headers = self._get_headers()
        payload = {
            "model": self._model_name,
            "max_tokens": settings.AI_MAX_OUTPUT_TOKENS,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system_prompt:
            payload["system"] = system_prompt

        url = f"{self._base_url}/messages"

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
            except httpx.TimeoutException as exc:
                raise TimeoutError(f"Claude request timed out after {settings.AI_TIMEOUT_SECONDS}s") from exc
            except httpx.RequestError as exc:
                raise ConnectionError(f"Claude connection failure: {str(exc)}") from exc

        if response.status_code == 429:
            raise RuntimeError("Claude rate limit exceeded (HTTP 429).")

        if response.status_code != 200:
            logger.error(f"Claude error {response.status_code}: {response.text}")
            raise RuntimeError(f"Claude API responded with HTTP {response.status_code}")

        data = response.json()
        try:
            return data["content"][0]["text"]
        except (KeyError, IndexError) as exc:
            raise ValueError(f"Malformed Claude response structure: {data}") from exc

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
    ) -> T:
        schema_instruction = (
            f"You MUST respond ONLY with a valid, pure JSON object strictly conforming to this schema:\n"
            f"{response_schema.model_json_schema()}\n"
            f"Do not include markdown codeblocks or any commentary outside the JSON object."
        )
        full_system = f"{system_prompt}\n\n{schema_instruction}" if system_prompt else schema_instruction

        raw_text = await self.generate_text(prompt, system_prompt=full_system)
        return parse_structured_response(raw_text, response_schema)

    async def check_connection(self) -> Dict[str, Any]:
        if not self._has_valid_key():
            return {
                "available": False,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "error": "Anthropic Claude API key is not configured. Add your key in Settings > Bring Your Own Key.",
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

