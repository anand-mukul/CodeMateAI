"""
CodeMate AI — Provider Manager Factory
Initializes and serves the configured AIProvider based on registry, environment, database settings, and dynamic admin overrides.
"""

from typing import Any, Dict, List, Optional
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
_configured_default_provider: Optional[str] = None
_configured_default_model: Optional[str] = None


class ProviderManager:
    """
    Factory for resolving and instantiating AIProvider implementations.
    Provides multi-provider routing (DeepSeek, Gemini, OpenAI, OpenRouter, Claude, Grok).
    Supports dynamic administrative switching without restarting the application.
    """

    @classmethod
    def get_default_provider_name(cls) -> str:
        """Returns the active default provider name."""
        return (
            _configured_default_provider
            or settings.DEFAULT_AI_PROVIDER
            or settings.AI_PROVIDER
            or "deepseek"
        ).lower().strip()

    @classmethod
    def get_default_model_name(cls) -> Optional[str]:
        """Returns the active default model override if set."""
        return _configured_default_model

    @classmethod
    def set_default_provider_name(cls, provider_name: str, model_name: Optional[str] = None) -> None:
        """
        Dynamically updates the default AI provider and model.
        Instantly takes effect for subsequent unpinned requests.
        """
        global _configured_default_provider, _configured_default_model, _active_provider
        _configured_default_provider = provider_name.lower().strip()
        _configured_default_model = model_name
        _active_provider = None  # Clear any cached instance
        logger.info(
            f"ProviderManager: Default AI provider switched to '{_configured_default_provider}' "
            f"(model: {_configured_default_model or 'default'})"
        )

    @classmethod
    def get_provider(
        cls,
        override: Optional[str] = None,
        model_override: Optional[str] = None,
        api_key_override: Optional[str] = None,
    ) -> AIProvider:
        global _active_provider
        
        # Test fixture injection override (when mock is active and no production provider override is requested)
        if _active_provider is not None:
            if not override or override.lower().strip() == "mock":
                return _active_provider

        default_provider = cls.get_default_provider_name()
        default_model = cls.get_default_model_name()

        target = (override or default_provider).lower().strip()
        if target == "managed":
            target = default_provider

        resolved_model = model_override or (default_model if not override else None)

        if target == "mock":
            if _active_provider is not None:
                return _active_provider
            raise ValueError("Mock AI Provider has been permanently decommissioned for production.")

        if target == "deepseek":
            return DeepSeekProvider(api_key=api_key_override, model_name=resolved_model)

        if target == "openrouter":
            clean_model = resolved_model
            if clean_model and not ("/" in clean_model or ":" in clean_model or clean_model.startswith("openrouter/")):
                clean_model = None
            return OpenRouterProvider(api_key=api_key_override, model_name=clean_model)

        if target == "openai":
            if not api_key_override and not settings.OPENAI_API_KEY and not settings.AI_API_KEY:
                raise ValueError("OpenAI provider requested but OPENAI_API_KEY is not configured.")
            return OpenAIProvider(api_key=api_key_override, model_name=resolved_model)

        if target in ["anthropic", "claude"]:
            return AnthropicProvider(api_key=api_key_override, model_name=resolved_model)

        if target in ["xai", "grok"]:
            return XAIProvider(api_key=api_key_override, model_name=resolved_model)

        if target == "gemini":
            clean_gemini_model = resolved_model
            if clean_gemini_model and ("/" in clean_gemini_model or "llama" in clean_gemini_model or "qwen" in clean_gemini_model):
                clean_gemini_model = None
            return GeminiProvider(api_key=api_key_override, model_name=clean_gemini_model)

        # Fallback to DeepSeek if unknown target
        return DeepSeekProvider(api_key=api_key_override, model_name=resolved_model)

    @classmethod
    def set_provider(cls, provider: Optional[AIProvider]) -> None:
        """Allows test suites to inject custom providers if needed."""
        global _active_provider
        _active_provider = provider

    @classmethod
    def get_providers_catalog(cls) -> List[Dict[str, Any]]:
        """Returns catalog of all registered AI providers with their current configuration status."""
        catalog = [
            {
                "id": "deepseek",
                "name": "DeepSeek AI (Active Credits)",
                "models": ["deepseek-flash", "deepseek-v4-pro", "deepseek-chat"],
                "default_model": "deepseek-flash",
                "configured": bool(settings.DEEPSEEK_API_KEY and not settings.DEEPSEEK_API_KEY.startswith("your_")),
                "status": "ready" if (settings.DEEPSEEK_API_KEY and not settings.DEEPSEEK_API_KEY.startswith("your_")) else "unconfigured",
            },
            {
                "id": "gemini",
                "name": "Google Gemini",
                "models": ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-4-argon"],
                "default_model": "gemini-3.8-flash",
                "configured": bool(settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_")),
                "status": "ready" if (settings.GEMINI_API_KEY and not settings.GEMINI_API_KEY.startswith("your_")) else "unconfigured",
            },
            {
                "id": "openrouter",
                "name": "OpenRouter (Multi-Model Hub)",
                "models": ["meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat", "anthropic/claude-3.5-sonnet"],
                "default_model": "meta-llama/llama-3.3-70b-instruct",
                "configured": bool(settings.OPENROUTER_API_KEY and not settings.OPENROUTER_API_KEY.startswith("your_")),
                "status": "ready" if (settings.OPENROUTER_API_KEY and not settings.OPENROUTER_API_KEY.startswith("your_")) else "unconfigured",
            },
            {
                "id": "openai",
                "name": "OpenAI",
                "models": ["gpt-4o-mini", "gpt-4o"],
                "default_model": "gpt-4o-mini",
                "configured": bool(settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("your_")),
                "status": "ready" if (settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("your_")) else "unconfigured",
            },
            {
                "id": "anthropic",
                "name": "Anthropic Claude",
                "models": ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
                "default_model": "claude-3-5-sonnet-20241022",
                "configured": bool(settings.ANTHROPIC_API_KEY and not settings.ANTHROPIC_API_KEY.startswith("your_")),
                "status": "ready" if (settings.ANTHROPIC_API_KEY and not settings.ANTHROPIC_API_KEY.startswith("your_")) else "unconfigured",
            },
            {
                "id": "xai",
                "name": "xAI Grok",
                "models": ["grok-2", "grok-beta"],
                "default_model": "grok-2",
                "configured": bool(settings.XAI_API_KEY and not settings.XAI_API_KEY.startswith("your_")),
                "status": "ready" if (settings.XAI_API_KEY and not settings.XAI_API_KEY.startswith("your_")) else "unconfigured",
            },
        ]
        return catalog
