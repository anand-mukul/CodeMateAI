"""
CodeMate AI — xAI (Grok) AI Provider Implementation
Integrates with xAI API via OpenAI-compatible Chat Completions.
Reference: https://docs.x.ai/overview
"""

from typing import Optional
from app.ai.openai_provider import OpenAIProvider
from app.core.config import settings


class XAIProvider(OpenAIProvider):
    """
    xAI Grok API provider (grok-2, grok-beta).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        key = api_key or settings.XAI_API_KEY
        model = model_name or settings.XAI_MODEL or "grok-2"
        url = base_url or settings.XAI_BASE_URL or "https://api.x.ai/v1"
        super().__init__(api_key=key, model_name=model, base_url=url)

    @property
    def provider_name(self) -> str:
        return "xai"

