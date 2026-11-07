"""
CodeMate AI — DeepSeek AI Provider Implementation
Integrates with DeepSeek API via OpenAI-compatible Chat Completions.
Reference: https://api-docs.deepseek.com/
"""

from typing import Optional
from app.ai.openai_provider import OpenAIProvider
from app.core.config import settings


class DeepSeekProvider(OpenAIProvider):
    """
    DeepSeek API provider (deepseek-chat, deepseek-coder, deepseek-reasoner).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        key = api_key or settings.DEEPSEEK_API_KEY
        model = model_name or settings.DEEPSEEK_MODEL or "deepseek-chat"
        url = base_url or settings.DEEPSEEK_BASE_URL or "https://api.deepseek.com/v1"
        super().__init__(api_key=key, model_name=model, base_url=url)

    @property
    def provider_name(self) -> str:
        return "deepseek"

