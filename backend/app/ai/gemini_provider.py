"""
CodeMate AI — Google Gemini AI Provider Implementation
Integrates with Google Gemini models via Google GenAI SDK (google-genai) and fallback REST API.
Reference: https://ai.google.dev/gemini-api/docs/get-started
"""

from typing import Any, Dict, Optional, Set, Type, TypeVar
import asyncio
import re
import time
import httpx
from pydantic import BaseModel
from app.ai.provider import AIProvider
from app.ai.parsers.response_parser import parse_structured_response, ResponseParsingError
from app.core.config import settings
from app.core.logging import logger

try:
    from google import genai
    from google.genai import types
    HAS_GOOGLE_GENAI = True
except ImportError:
    HAS_GOOGLE_GENAI = False

T = TypeVar("T", bound=BaseModel)


class GeminiProvider(AIProvider):
    """
    Google Gemini API implementation using the official Google GenAI SDK (google-genai)
    with async support (client.aio), intelligent model caching, and graceful fallback.
    """

    # Class-level state to track permanently deprecated (404) and rate-limited (429) models
    _permanently_unavailable: Set[str] = {
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
    }
    _model_cooldowns: Dict[str, float] = {}

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self._api_key = api_key or settings.GEMINI_API_KEY or settings.AI_API_KEY
        self._model_name = model_name or settings.GEMINI_MODEL or settings.AI_MODEL or "gemini-3.5-flash"
        self._fallback_models = [
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.6-flash",
            "gemini-3.1-flash-lite",
            "gemini-3.8-flash",
        ]
        self._base_url = (
            base_url
            or settings.AI_BASE_URL
            or "https://generativelanguage.googleapis.com/v1beta"
        )
        self._genai_client = None
        if HAS_GOOGLE_GENAI and self._api_key:
            try:
                self._genai_client = genai.Client(api_key=self._api_key)
            except Exception as e:
                logger.warning(f"Could not initialize Google GenAI Client: {e}")

    @classmethod
    def _record_model_failure(cls, model: str, exc: Exception) -> None:
        err_str = str(exc)
        # Check for 404 / permanently defunct models
        if (
            "404" in err_str
            or "NOT_FOUND" in err_str
            or "no longer available" in err_str
            or "not found" in err_str
        ):
            cls._permanently_unavailable.add(model)
            logger.info(f"GeminiProvider: Model '{model}' marked permanently unavailable (404/deprecated).")
            return

        # Check for 429 / quota exceeded / resource exhausted
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "Quota exceeded" in err_str:
            cooldown = 300.0  # Default 5 minutes
            match = re.search(r"retryDelay':\s*'(\d+)s'", err_str)
            if match:
                parsed_delay = float(match.group(1))
                cooldown = max(60.0, min(parsed_delay, 1800.0))
            elif "per day" in err_str.lower() or "free_tier" in err_str.lower():
                cooldown = 1800.0  # 30-minute cooldown for daily quota limits
            cls._model_cooldowns[model] = time.time() + cooldown
            logger.info(f"GeminiProvider: Model '{model}' put on cooldown for {cooldown:.0f}s due to quota exhaustion/rate limiting.")

    @classmethod
    def _record_model_success(cls, model: str) -> None:
        if model in cls._model_cooldowns:
            del cls._model_cooldowns[model]

    def _get_candidate_models(self) -> list[str]:
        now = time.time()
        raw_candidates = [self._model_name]
        for m in self._fallback_models:
            if m not in raw_candidates:
                raw_candidates.append(m)

        # Exclude permanently unavailable models (404s/deprecated)
        candidates = [m for m in raw_candidates if m not in self._permanently_unavailable]

        # Filter out models currently in cooldown (e.g. 429 quota exhaustion)
        ready = [m for m in candidates if self._model_cooldowns.get(m, 0.0) <= now]

        return ready if ready else candidates

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def model_name(self) -> str:
        return self._model_name

    def _get_endpoint(self, model_name: Optional[str] = None) -> str:
        if not self._api_key:
            raise ValueError(
                "Gemini API key is missing. Please set AI_API_KEY in backend/.env to use Gemini."
            )
        target = model_name or (self._get_candidate_models()[0] if self._get_candidate_models() else self._model_name)
        return f"{self._base_url}/models/{target}:generateContent?key={self._api_key}"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        if self._genai_client:
            for candidate in self._get_candidate_models():
                try:
                    config = types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=settings.AI_TEMPERATURE,
                        max_output_tokens=settings.AI_MAX_OUTPUT_TOKENS,
                    )
                    response = await self._genai_client.aio.models.generate_content(
                        model=candidate,
                        contents=prompt,
                        config=config,
                    )
                    if response.text:
                        self._record_model_success(candidate)
                        return response.text
                except Exception as e:
                    self._record_model_failure(candidate, e)
                    logger.warning(f"google-genai generate_content with '{candidate}' failed: {e}. Trying fallback...")

        endpoint = self._get_endpoint()

        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"System Directive:\n{system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will strictly follow these instructions."}]})

        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": settings.AI_TEMPERATURE,
                "maxOutputTokens": settings.AI_MAX_OUTPUT_TOKENS,
            },
        }

        async with httpx.AsyncClient(timeout=settings.AI_TIMEOUT_SECONDS) as client:
            try:
                response = await client.post(endpoint, json=payload)
            except httpx.TimeoutException as exc:
                logger.error(f"Gemini API request timed out after {settings.AI_TIMEOUT_SECONDS}s: {exc}")
                raise TimeoutError(f"Gemini API request timed out after {settings.AI_TIMEOUT_SECONDS} seconds.") from exc
            except httpx.RequestError as exc:
                logger.error(f"Network error connecting to Gemini API: {exc}")
                raise ConnectionError(f"Failed to communicate with Gemini API: {str(exc)}") from exc

        if response.status_code == 429:
            raise RuntimeError("Gemini API rate limit exceeded (HTTP 429). Please wait before retrying.")

        if response.status_code != 200:
            error_data = response.text
            logger.error(f"Gemini API returned HTTP {response.status_code}: {error_data}")
            raise RuntimeError(f"Gemini API error (HTTP {response.status_code})")

        data = response.json()
        try:
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("No generation candidates returned from Gemini.")
            text = candidates[0]["content"]["parts"][0]["text"]
            return text
        except (KeyError, IndexError, TypeError) as exc:
            logger.error(f"Malformed Gemini API response: {data}")
            raise ValueError("Failed to extract generated text from Gemini API response.") from exc

    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
    ) -> T:
        if self._genai_client:
            for candidate in self._get_candidate_models():
                try:
                    config = types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        response_mime_type="application/json",
                        response_schema=response_schema,
                        temperature=settings.AI_TEMPERATURE,
                        max_output_tokens=settings.AI_MAX_OUTPUT_TOKENS,
                    )
                    response = await self._genai_client.aio.models.generate_content(
                        model=candidate,
                        contents=prompt,
                        config=config,
                    )
                    if response.text:
                        parsed = parse_structured_response(response.text, response_schema)
                        self._record_model_success(candidate)
                        return parsed
                except Exception as e:
                    err_str = str(e)
                    # If Google rejected additional_properties in schema, retry with JSON mode and schema prompt
                    if "additional_properties" in err_str or "INVALID_ARGUMENT" in err_str:
                        try:
                            schema_directive = (
                                f"{system_prompt or ''}\n\n"
                                f"CRITICAL: Output valid, pure JSON strictly conforming to this schema:\n"
                                f"{response_schema.model_json_schema()}"
                            )
                            config_retry = types.GenerateContentConfig(
                                system_instruction=schema_directive,
                                response_mime_type="application/json",
                                temperature=settings.AI_TEMPERATURE,
                                max_output_tokens=settings.AI_MAX_OUTPUT_TOKENS,
                            )
                            response = await self._genai_client.aio.models.generate_content(
                                model=candidate,
                                contents=prompt,
                                config=config_retry,
                            )
                            if response.text:
                                parsed = parse_structured_response(response.text, response_schema)
                                self._record_model_success(candidate)
                                return parsed
                        except Exception as e2:
                            logger.warning(f"google-genai JSON retry with '{candidate}' failed: {e2}")

                    self._record_model_failure(candidate, e)
                    logger.warning(f"google-genai generate_structured with '{candidate}' failed: {e}. Trying fallback...")

        endpoint = self._get_endpoint()

        # Instruct model explicitly to output valid JSON matching the schema
        schema_prompt = (
            f"\n\nCRITICAL REQUIREMENT: Output your response as a valid, pure JSON object conforming to this schema:\n"
            f"{response_schema.model_json_schema()}\n"
            f"Do not include any surrounding markdown or explanation outside the JSON object."
        )
        combined_prompt = prompt + schema_prompt

        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"System Directive:\n{system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will strictly follow these instructions and return pure JSON."}]})

        contents.append({"role": "user", "parts": [{"text": combined_prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": settings.AI_TEMPERATURE,
                "maxOutputTokens": settings.AI_MAX_OUTPUT_TOKENS,
                "responseMimeType": "application/json",
            },
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.post(endpoint, json=payload)
            except httpx.TimeoutException as exc:
                raise TimeoutError(f"Gemini API request timed out after {settings.AI_TIMEOUT_SECONDS}s.") from exc
            except httpx.RequestError as exc:
                raise ConnectionError(f"Gemini API connection failure: {str(exc)}") from exc

        if response.status_code == 429:
            raise RuntimeError("Gemini API rate limit exceeded. Please try again in a few moments.")

        if response.status_code != 200:
            raise RuntimeError(f"Gemini API responded with HTTP {response.status_code}")

        data = response.json()
        try:
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ValueError(f"Failed to extract JSON from Gemini candidate response: {exc}") from exc

        return parse_structured_response(raw_text, response_schema)

    async def check_connection(self) -> Dict[str, Any]:
        if not self._api_key:
            return {
                "available": False,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "error": "AI_API_KEY is not configured in backend/.env",
            }

        try:
            # Lightweight probe with 10-second fast timeout
            test_resp = await asyncio.wait_for(
                self.generate_text(
                    "Reply with 'OK'",
                    system_prompt="Reply with exactly 'OK'",
                ),
                timeout=10.0,
            )
            return {
                "available": True,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "sample_response": test_resp[:20].strip(),
            }
        except asyncio.TimeoutError:
            return {
                "available": False,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "error": "Gemini connection probe timed out after 10.0s",
            }
        except Exception as e:
            return {
                "available": False,
                "provider": self.provider_name,
                "model": self.model_name,
                "is_mock": False,
                "error": str(e),
            }

