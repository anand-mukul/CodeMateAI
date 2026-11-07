"""
CodeMate AI — Solution Generation, Optimization, and Error Diagnostic Schemas
"""

from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator
from app.schemas.problem import ProblemRequest, normalize_language_str


class ComplexityItem(BaseModel):
    notation: str = Field(default="O(1)", description="Big-O notation (e.g. 'O(N)', 'O(N log N)', 'O(1)')")
    explanation: str = Field(default="Asymptotic complexity", description="Clear mathematical justification for this complexity")

    @field_validator("notation", mode="before")
    @classmethod
    def normalize_notation(cls, v: Any) -> str:
        if isinstance(v, dict):
            return str(v.get("notation") or v.get("value") or "O(1)")
        return str(v) if v else "O(1)"

    @field_validator("explanation", mode="before")
    @classmethod
    def normalize_explanation(cls, v: Any) -> str:
        if isinstance(v, dict):
            return str(v.get("explanation") or "Asymptotic complexity")
        return str(v) if v else "Asymptotic complexity"


class ComplexityAnalysis(BaseModel):
    time: ComplexityItem = Field(default_factory=lambda: ComplexityItem(notation="O(N)", explanation="Linear time traversal"))
    space: ComplexityItem = Field(default_factory=lambda: ComplexityItem(notation="O(1)", explanation="Auxiliary space complexity"))

    @field_validator("time", "space", mode="before")
    @classmethod
    def normalize_item(cls, v: Any) -> Any:
        if isinstance(v, str):
            return {"notation": v, "explanation": "Asymptotic complexity"}
        if isinstance(v, dict):
            return {
                "notation": v.get("notation") or v.get("value") or "O(1)",
                "explanation": v.get("explanation") or "Asymptotic complexity",
            }
        return v


class ApproachDetail(BaseModel):
    name: str = Field(default="Optimal Algorithmic Approach", description="Name of the selected approach")
    explanation: str = Field(default="Detailed algorithmic solution walkthrough", description="Detailed explanation of how the algorithm operates")
    steps: List[str] = Field(default_factory=list, description="Step-by-step logic breakdown")

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, v: Any) -> str:
        return str(v) if v else "Optimal Algorithmic Approach"

    @field_validator("explanation", mode="before")
    @classmethod
    def normalize_explanation(cls, v: Any) -> str:
        return str(v) if v else "Detailed algorithmic solution walkthrough"

    @field_validator("steps", mode="before")
    @classmethod
    def normalize_steps(cls, v: Any) -> List[str]:
        if isinstance(v, list):
            return [str(item) for item in v]
        if isinstance(v, str):
            lines = [l.strip("- *•0123456789.").strip() for l in v.split("\n") if l.strip()]
            return lines or [v]
        return []


class WorkspaceFile(BaseModel):
    filename: str = Field(..., description="File name with extension, e.g. 'StudentService.java'")
    code: str = Field(..., description="Full completed source code for this file")


class SolutionResponse(BaseModel):
    success: bool = Field(default=True, description="Whether the solution was generated successfully")
    problem_summary: str = Field(default="Competitive programming problem solution", description="Summary of the problem")
    approach: ApproachDetail = Field(default_factory=ApproachDetail, description="Algorithmic approach breakdown")
    algorithm: str = Field(default="Optimal Algorithm", description="Primary algorithm used")
    data_structures: List[str] = Field(default_factory=list, description="Data structures utilized")
    code: str = Field(..., description="Complete, compilable source code")
    workspace_files: Optional[List[WorkspaceFile]] = Field(
        default=None,
        description="Completed multi-file code list",
    )
    language: str = Field(..., description="Programming language of the code (e.g., 'cpp', 'python')")
    complexity: ComplexityAnalysis = Field(default_factory=ComplexityAnalysis, description="Time and space complexity analysis")
    edge_cases: List[str] = Field(default_factory=list, description="Boundary cases addressed in code")
    sample_case_analysis: List[str] = Field(
        default_factory=list, description="Walkthrough of how the code handles sample examples"
    )
    warnings: List[str] = Field(default_factory=list, description="Any caveats or precision warnings")
    provider: str = Field(default="gemini", description="AI provider that generated the response ('gemini', 'openrouter', 'openai')")
    model: str = Field(default="default", description="Model identifier used")

    @field_validator("problem_summary", mode="before")
    @classmethod
    def normalize_problem_summary(cls, v: Any) -> str:
        return str(v) if v else "Competitive programming problem solution"

    @field_validator("algorithm", mode="before")
    @classmethod
    def normalize_algorithm(cls, v: Any) -> str:
        return str(v) if v else "Optimal Algorithm"

    @field_validator("approach", mode="before")
    @classmethod
    def normalize_approach(cls, v: Any) -> Any:
        if isinstance(v, str):
            lines = [l.strip("- *•0123456789.").strip() for l in v.split("\n") if l.strip()]
            return {
                "name": "Optimal Algorithmic Approach",
                "explanation": v,
                "steps": lines or [v],
            }
        if isinstance(v, dict):
            name = v.get("name") or "Optimal Algorithmic Approach"
            explanation = v.get("explanation") or v.get("intuition") or v.get("description") or str(v)
            steps = v.get("steps") or []
            if isinstance(steps, str):
                steps = [l.strip("- *•0123456789.").strip() for l in steps.split("\n") if l.strip()] or [steps]
            return {"name": name, "explanation": explanation, "steps": steps}
        return v

    @field_validator("complexity", mode="before")
    @classmethod
    def normalize_complexity(cls, v: Any) -> Any:
        if isinstance(v, str):
            return {
                "time": {"notation": v, "explanation": "Asymptotic time complexity"},
                "space": {"notation": "O(1)", "explanation": "Auxiliary space complexity"},
            }
        if isinstance(v, dict):
            time_val = v.get("time") or v.get("time_complexity") or "O(N)"
            space_val = v.get("space") or v.get("space_complexity") or "O(1)"
            return {
                "time": time_val if isinstance(time_val, dict) else {"notation": str(time_val), "explanation": "Time complexity"},
                "space": space_val if isinstance(space_val, dict) else {"notation": str(space_val), "explanation": "Space complexity"},
            }
        return v

    @field_validator("data_structures", "edge_cases", "sample_case_analysis", "warnings", mode="before")
    @classmethod
    def normalize_list_fields(cls, v: Any) -> List[str]:
        if v is None:
            return []
        if isinstance(v, list):
            return [str(item) for item in v]
        if isinstance(v, str):
            v_clean = v.strip()
            if not v_clean:
                return []
            if "," in v_clean and "\n" not in v_clean:
                return [item.strip() for item in v_clean.split(",") if item.strip()]
            if "\n" in v_clean:
                return [l.strip("- *•0123456789.").strip() for l in v_clean.split("\n") if l.strip()]
            return [v_clean]
        return [str(v)]

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
