"""
CodeMate AI — Phase 7 Project Intelligence Schemas
Pydantic V2 models for project import, file tree, planning, patches, and diagnostic repair.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    framework: Optional[str] = "generic"
    primary_language: Optional[str] = "java"


class ProjectFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_path: str
    file_name: str
    file_extension: str
    language: str
    size_bytes: int
    line_count: int
    is_test: bool
    is_excluded: bool


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    framework: str
    primary_language: str
    build_tool: Optional[str] = None
    indexed_file_count: int
    total_file_count: int
    last_indexed_at: Optional[datetime] = None
    created_at: datetime


class PlanRequest(BaseModel):
    task_description: str = Field(min_length=3, max_length=500)


class PlanStep(BaseModel):
    step_number: int
    action: str  # INSPECT, MODIFY, VERIFY_TESTS
    file_path: str
    reason: str


class PlanResponse(BaseModel):
    task_description: str
    project_framework: str
    confidence: str
    affected_files: List[str]
    steps: List[PlanStep]
    risks: List[str]
    impact_analysis: List[Dict[str, Any]]


class GeneratePatchRequest(BaseModel):
    task_description: str = Field(min_length=3, max_length=500)
    plan: Optional[Dict[str, Any]] = None


class PatchFileResponse(BaseModel):
    id: str
    file_path: str
    operation: str
    original_hash: Optional[str]
    diff_content: str
    explanation: str
    status: str


class PatchResponse(BaseModel):
    id: str
    project_id: str
    task_description: str
    status: str
    patch_summary: str
    files: List[PatchFileResponse]


class ApplyPatchRequest(BaseModel):
    approved_file_ids: Optional[List[str]] = None  # None = apply all approved


class DiagnoseRequest(BaseModel):
    error_output: str = Field(min_length=5, max_length=100000)
    attempt_number: Optional[int] = 1


class DiagnosticRecord(BaseModel):
    file_path: str
    line_number: int
    error_message: str
    category: str


class DiagnoseResponse(BaseModel):
    diagnostics: List[DiagnosticRecord]
    proposed_fix: Optional[Dict[str, Any]] = None
    status: str


class EphemeralBlueprintRequest(BaseModel):
    problem_title: Optional[str] = "Multi-File Project"
    problem_statement: Optional[str] = "Implement problem components according to instructions."
    workspace_files: Optional[Dict[str, str]] = Field(default=None, description="Map of filename to raw code")
    files: Optional[Dict[str, str]] = Field(default=None, description="Alias for workspace_files")
    selected_language: Optional[str] = "java"
    platform: Optional[str] = "codechef"
    constraints: Optional[str] = ""


class EphemeralPlanStep(BaseModel):
    step: int
    filename: str
    action: str  # MODIFY, READ_ONLY_PROTECT, CREATE
    role: str    # MODEL, SERVICE, RUNNER, COMPONENT, MAIN_ENTRY
    reason: str


class EphemeralBlueprintResponse(BaseModel):
    project_id: str
    framework: str
    primary_language: str
    summary: str
    execution_plan: List[EphemeralPlanStep]
    risks_and_constraints: List[str]


class EphemeralCompleteFileRequest(BaseModel):
    filename: str
    file_content: Optional[str] = ""
    problem_statement: Optional[str] = ""
    problem_title: Optional[str] = "Project Task"
    blueprint: Optional[Dict[str, Any]] = None
    completed_files_context: Optional[Dict[str, str]] = None
    selected_language: Optional[str] = None
    project_id: Optional[str] = None
    problem_statement: str
    problem_title: Optional[str] = "Project Task"
    blueprint: Optional[Dict[str, Any]] = None
    completed_files_context: Optional[Dict[str, str]] = None
    selected_language: Optional[str] = None


class EphemeralCompleteFileResponse(BaseModel):
    filename: str
    code: str
    explanation: Optional[str] = None

