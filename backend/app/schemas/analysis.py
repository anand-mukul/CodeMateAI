"""
CodeMate AI — Problem Analysis & Explanation Schemas
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class PotentialApproach(BaseModel):
    name: str = Field(..., description="Algorithm or approach name (e.g. 'Brute Force', 'Two Pointers')")
    time_complexity: str = Field(..., description="Asymptotic time complexity (e.g. 'O(N^2)')")
    space_complexity: str = Field(..., description="Auxiliary space complexity (e.g. 'O(1)')")
    feasibility: str = Field(..., description="Feasibility judgment (e.g. 'TLE for N=10^5', 'Optimal')")
    description: str = Field(..., description="Brief summary of how this approach operates")


class ProblemAnalysis(BaseModel):
    problem_summary: str = Field(..., description="Concise synopsis of the task")
    objective: str = Field(..., description="Exact mathematical or programmatic goal")
    input_description: str = Field(..., description="Structured breakdown of inputs")
    output_description: str = Field(..., description="Structured breakdown of required output")
    constraints_analysis: str = Field(..., description="Evaluation of size bounds and runtime budget")
    important_observations: List[str] = Field(default_factory=list, description="Key mathematical/logical insights")
    potential_approaches: List[PotentialApproach] = Field(
        default_factory=list, description="Evaluated algorithmic strategies with trade-offs"
    )
    recommended_algorithm: str = Field(..., description="The chosen optimal algorithm for the problem")
    recommended_data_structures: List[str] = Field(
        default_factory=list, description="Data structures to use (e.g., 'std::vector', 'hash map')"
    )
    expected_time_complexity: str = Field(..., description="Overall time complexity of recommended solution")
    expected_space_complexity: str = Field(..., description="Auxiliary space complexity of recommended solution")
    edge_cases: List[str] = Field(default_factory=list, description="Critical boundary and corner cases to guard")


class ProblemExplanation(BaseModel):
    problem_title: str = Field(..., description="Title of the problem")
    simple_summary: str = Field(..., description="Plain-language explanation without excessive jargon")
    what_is_asked: str = Field(..., description="Direct summary of what the output must be")
    input_breakdown: str = Field(..., description="Explanation of what input values represent")
    output_breakdown: str = Field(..., description="Explanation of how output should be formatted")
    example_walkthrough: List[str] = Field(
        default_factory=list, description="Step-by-step trace through provided sample cases"
    )
    key_observations: List[str] = Field(
        default_factory=list, description="Intuitive clues that make solving easier"
    )
    edge_cases_to_consider: List[str] = Field(
        default_factory=list, description="Scenarios that could cause WA or RTE"
    )

