"""
CodeMate AI — Provider Manager Factory
Initializes and serves the configured AIProvider based on registry, environment, and user overrides.
"""

from typing import Optional
from app.ai.provider import AIProvider
from app.ai.gemini_provider import GeminiProvider
from app.ai.openai_provider import OpenAIProvider
from app.ai.openrouter_provider import OpenRouterProvider
from app.ai.anthropic_provider import AnthropicProvider
from app.ai.deepseek_provider import DeepSeekProvider
from app.ai.xai_provider import XAIProvider
from app.core.config import settings
from app.core.logging import logger

_active_provider: Optional[AIProvider] = None


class ProviderManager:
    """
    Factory for resolving and instantiating AIProvider implementations.
    Provides multi-provider routing (Gemini, OpenAI, OpenRouter, Claude, DeepSeek, Grok, Mock).
    """

    @classmethod
    def get_provider(
        cls,
        override: Optional[str] = None,
        model_override: Optional[str] = None,
        api_key_override: Optional[str] = None,
    ) -> AIProvider:
        global _active_provider
        
        if _active_provider is not None:
            return _active_provider

        target = (override or settings.DEFAULT_AI_PROVIDER or settings.AI_PROVIDER or "gemini").lower().strip()

        if target == "managed":
            target = (settings.DEFAULT_AI_PROVIDER or "gemini").lower().strip()

        if target == "mock":
            from app.ai.mock_provider import MockAIProvider
            return MockAIProvider(model_name=model_override or "mock-deterministic-v1")

        if target == "openrouter":
            # Guard against passing Gemini/OpenAI bare model names to OpenRouter
            clean_model = model_override
            if clean_model and not ("/" in clean_model or ":" in clean_model or clean_model.startswith("openrouter/")):
                clean_model = None
            return OpenRouterProvider(api_key=api_key_override, model_name=clean_model)

        if target == "openai":
            if not api_key_override and not settings.OPENAI_API_KEY and not settings.AI_API_KEY:
                raise ValueError("OpenAI provider requested but OPENAI_API_KEY is not configured.")
            return OpenAIProvider(api_key=api_key_override, model_name=model_override)

        if target in ["anthropic", "claude"]:
            return AnthropicProvider(api_key=api_key_override, model_name=model_override)

        if target == "deepseek":
            return DeepSeekProvider(api_key=api_key_override, model_name=model_override)

        if target in ["xai", "grok"]:
            return XAIProvider(api_key=api_key_override, model_name=model_override)

        # Default / Managed AI: Route to Gemini
        # Guard against passing OpenRouter or third-party slugs (e.g. meta-llama/...) to Gemini
        clean_gemini_model = model_override
        if clean_gemini_model and ("/" in clean_gemini_model or "llama" in clean_gemini_model or "qwen" in clean_gemini_model):
            clean_gemini_model = None
        return GeminiProvider(api_key=api_key_override, model_name=clean_gemini_model)

    @classmethod
    def set_provider(cls, provider: Optional[AIProvider]) -> None:
        """Allows test suites to inject custom providers if needed."""
        global _active_provider
        _active_provider = provider

