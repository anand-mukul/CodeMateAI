"""
CodeMate AI — Compilation & Syntax Validation Schemas
"""

from typing import Optional
from pydantic import BaseModel, Field


class CompilationRequest(BaseModel):
    language: str = Field(..., description="Target language: python, java, cpp, javascript, typescript")
    source_code: str = Field(..., max_length=100000, description="Source code to compile or syntax-check")
    entry_filename: Optional[str] = Field(None, max_length=100, description="Optional filename e.g. Solution.java")
    timeout_seconds: float = Field(default=5.0, ge=0.5, le=15.0, description="Subprocess timeout bound")


class CompilationResult(BaseModel):
    success: bool
    status: str  # "COMPILED_OK", "SYNTAX_ERROR", "COMPILATION_ERROR", "TIMEOUT", "TOOL_UNAVAILABLE"
    returncode: int = 0
    stdout: str = ""
    stderr: str = ""
    duration_ms: float = 0.0
    error_type: Optional[str] = None
    compiler_used: Optional[str] = None

