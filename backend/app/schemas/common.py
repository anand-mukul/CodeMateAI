"""
CodeMate AI — Common Pydantic Response Schemas
"""

from typing import Generic, Optional, TypeVar, Any, Dict
from pydantic import BaseModel, Field

T = TypeVar("T")


class BaseResponse(BaseModel):
    success: bool = Field(default=True, description="Whether the operation succeeded")
    message: Optional[str] = Field(default=None, description="Optional informational message")


class ErrorResponse(BaseModel):
    success: bool = Field(default=False, description="Always false for error responses")
    error_code: str = Field(..., description="Machine-readable error identifier")
    detail: str = Field(..., description="Actionable, user-friendly error message")
    timestamp: float = Field(..., description="Unix epoch timestamp of the error")


class HealthResponse(BaseModel):
    status: str = Field(default="healthy", description="Service health state")
    service: str = Field(default="CodeMate AI Backend", description="Service identity")
    version: str = Field(default="1.0.0", description="Service version")
    timestamp: float = Field(..., description="Unix epoch timestamp")


class AIStatusResponse(BaseModel):
    provider: str = Field(..., description="Currently active AI provider")
    model: str = Field(..., description="Target model name")
    available: bool = Field(..., description="Whether the provider is reachable and active")
    is_mock: bool = Field(..., description="True if operating in simulated mock mode without API keys")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Safe runtime metrics")

