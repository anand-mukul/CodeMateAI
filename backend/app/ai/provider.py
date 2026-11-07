"""
CodeMate AI — AI Provider Abstraction Interface
Defines the contract for all LLM providers (Mock, Google Gemini, OpenAI, etc.).
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Type, TypeVar
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class AIProvider(ABC):
    """
    Abstract Base Class defining the standard interface for LLM backends.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. 'mock', 'gemini', 'openai')."""
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Name of the underlying LLM model."""
        pass

    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Generates freeform text from the prompt.
        """
        pass

    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_prompt: Optional[str] = None,
    ) -> T:
        """
        Generates structured data conforming to the given Pydantic schema.
        """
        pass

    @abstractmethod
    async def check_connection(self) -> Dict[str, Any]:
        """
        Validates connectivity to the provider endpoint without exposing secrets.
        Returns a dict with 'available': bool and metadata.
        """
        pass

