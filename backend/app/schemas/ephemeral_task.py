"""
CodeMate AI — Ephemeral Task Schemas
Pydantic contracts for session-isolated, multi-step multi-file AI agent execution.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TaskInitRequest(BaseModel):
    problem_title: str = Field(..., description="Title of problem statement")
    problem_statement: str = Field(..., description="Full problem text and specifications")
    files: Dict[str, str] = Field(..., description="Map of filename -> file content harvested from workspace")
    target_framework: Optional[str] = Field(default=None, description="Optional framework hint (springboot, react, etc.)")
    provider: Optional[str] = Field(default=None, description="AI Provider override")
    model: Optional[str] = Field(default=None, description="Model override")


class TaskInitResponse(BaseModel):
    task_id: str
    target_framework: str
    dependency_order: List[str]
    total_steps: int
    summary: str


class TaskStepRequest(BaseModel):
    task_id: str
    step_index: int
    target_file: str
    provider: Optional[str] = None
    model: Optional[str] = None


class TaskStepResponse(BaseModel):
    task_id: str
    step_index: int
    target_file: str
    code: str
    explanation: str
    extracted_contracts: Dict[str, Any] = Field(default_factory=dict)
    is_last_step: bool = False


class TaskCommitRequest(BaseModel):
    task_id: str
    step_index: int
    target_file: str
    code: str
    extracted_contracts: Optional[Dict[str, Any]] = None


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    current_step_index: int
    total_steps: int
    completed_files: List[str]
    target_framework: str
    created_at: float
    ttl_remaining_seconds: int

