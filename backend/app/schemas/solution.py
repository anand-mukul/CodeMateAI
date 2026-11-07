"""
CodeMate AI — Solution Generation, Optimization, and Error Diagnostic Schemas
"""

from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.problem import ProblemRequest, normalize_language_str


class ComplexityItem(BaseModel):
    notation: str = Field(..., description="Big-O notation (e.g. 'O(N)', 'O(N log N)', 'O(1)')")
    explanation: str = Field(..., description="Clear mathematical justification for this complexity")


class ComplexityAnalysis(BaseModel):
    time: ComplexityItem = Field(..., description="Asymptotic time complexity breakdown")
    space: ComplexityItem = Field(..., description="Auxiliary space complexity breakdown")


class ApproachDetail(BaseModel):
    name: str = Field(..., description="Name of the selected approach (e.g., 'Prefix Sum with Hash Map')")
    explanation: str = Field(..., description="Detailed explanation of how the algorithm operates")
    steps: List[str] = Field(default_factory=list, description="Step-by-step logic breakdown")


class WorkspaceFile(BaseModel):
    filename: str = Field(..., description="File name with extension, e.g. 'StudentService.java'")
    code: str = Field(..., description="Full completed source code for this file")


class SolutionResponse(BaseModel):
    success: bool = Field(default=True, description="Whether the solution was generated successfully")
    problem_summary: str = Field(..., description="Summary of the problem")
    approach: ApproachDetail = Field(..., description="Algorithmic approach breakdown")
    algorithm: str = Field(..., description="Primary algorithm used (e.g., 'Dynamic Programming')")
    data_structures: List[str] = Field(default_factory=list, description="Data structures utilized")
    code: str = Field(..., description="Complete, compilable source code")
    workspace_files: Optional[List[WorkspaceFile]] = Field(
        default=None,
        description="Completed multi-file code list",
    )
    language: str = Field(..., description="Programming language of the code (e.g., 'cpp', 'python')")
    complexity: ComplexityAnalysis = Field(..., description="Time and space complexity analysis")
    edge_cases: List[str] = Field(default_factory=list, description="Boundary cases addressed in code")
    sample_case_analysis: List[str] = Field(
        default_factory=list, description="Walkthrough of how the code handles sample examples"
    )
    warnings: List[str] = Field(default_factory=list, description="Any caveats or precision warnings")
    provider: str = Field(..., description="AI provider that generated the response ('mock', 'gemini', 'openai')")
    model: str = Field(..., description="Model identifier used")

    @field_validator("workspace_files", mode="before")
    @classmethod
    def normalize_workspace_files(cls, v: Any) -> Any:
        if isinstance(v, dict):
            return [{"filename": k, "code": val} for k, val in v.items()]
        return v

    @property
    def workspace_files_map(self) -> dict[str, str]:
        if not self.workspace_files:
            return {}
        return {f.filename: f.code for f in self.workspace_files}


class OptimizationRequest(BaseModel):
    problem: ProblemRequest = Field(..., description="The problem statement and metadata")
    existing_code: str = Field(..., min_length=5, description="Student's existing source code to be optimized")
    current_language: str = Field(default="cpp", description="Language of the existing code")

    @field_validator("current_language")
    @classmethod
    def validate_lang(cls, v: str) -> str:
        return normalize_language_str(v).value


class OptimizationResponse(BaseModel):
    success: bool = Field(default=True, description="Whether optimization completed successfully")
    improved_code: str = Field(..., description="Optimized, refactored complete source code")
    language: str = Field(..., description="Programming language")
    explanation_of_changes: str = Field(..., description="Detailed summary of what was refactored and why")
    original_complexity: ComplexityAnalysis = Field(..., description="Estimated complexity of previous code")
    optimized_complexity: ComplexityAnalysis = Field(..., description="Complexity achieved after optimization")
    bottlenecks_eliminated: List[str] = Field(default_factory=list, description="Inefficiencies removed")
    tradeoffs: List[str] = Field(default_factory=list, description="Any trade-offs incurred (e.g. more memory)")
    provider: str = Field(..., description="AI provider used")
    model: str = Field(..., description="Model identifier used")


class SolutionFixRequest(BaseModel):
    problem: ProblemRequest = Field(..., description="Problem statement and constraints")
    selected_language: str = Field(default="cpp", description="Target programming language")
    current_code: str = Field(..., min_length=3, max_length=50000, description="Current buggy or failing source code")
    error_message: str = Field(..., min_length=2, max_length=10000, description="Compiler error, runtime exception, or WA description")
    expected_output: Optional[str] = Field(default=None, max_length=5000, description="Expected output for the failing test case")
    actual_output: Optional[str] = Field(default=None, max_length=5000, description="Actual output produced by the current code")
    test_case: Optional[str] = Field(default=None, max_length=5000, description="Input data of the failing test case")

    @field_validator("selected_language")
    @classmethod
    def validate_lang(cls, v: str) -> str:
        return normalize_language_str(v).value


class SolutionFixResponse(BaseModel):
    success: bool = Field(default=True, description="Whether the diagnostic and patch completed successfully")
    fixed_code: str = Field(..., description="Proposed corrected source code with the fix applied")
    language: str = Field(..., description="Target programming language")
    error_category: str = Field(
        ...,
        description="Categorized bug type (e.g. 'COMPILATION_ERROR', 'LOGICAL_ERROR', 'OUT_OF_BOUNDS', 'TIME_LIMIT_EXCEEDED')",
    )
    explanation: str = Field(..., description="Clear explanation of why the bug occurred")
    changes_made: List[str] = Field(default_factory=list, description="Specific edits made to the original code")
    potential_side_effects: List[str] = Field(default_factory=list, description="Potential side effects or edge cases to watch out for")
    confidence: str = Field(default="HIGH", description="Confidence level in the fix (HIGH, MEDIUM, LOW)")
    provider: str = Field(..., description="AI provider that analyzed the bug")
    model: str = Field(..., description="Model identifier used")
