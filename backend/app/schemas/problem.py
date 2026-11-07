"""
CodeMate AI — Problem Input Schema and Validation
Validates, normalizes, and sanitizes incoming coding problem requests.
"""

from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class SupportedLanguage(str, Enum):
    CPP = "cpp"
    PYTHON = "python"
    JAVA = "java"
    C = "c"
    JAVASCRIPT = "javascript"
    GO = "go"


LANGUAGE_ALIASES = {
    "c++": SupportedLanguage.CPP,
    "cpp": SupportedLanguage.CPP,
    "cp+": SupportedLanguage.CPP,
    "c+": SupportedLanguage.CPP,
    "cplusplus": SupportedLanguage.CPP,
    "c_cpp": SupportedLanguage.CPP,
    "c++14": SupportedLanguage.CPP,
    "c++17": SupportedLanguage.CPP,
    "c++20": SupportedLanguage.CPP,
    "c++ 14": SupportedLanguage.CPP,
    "c++ 17": SupportedLanguage.CPP,
    "c++ 20": SupportedLanguage.CPP,
    "c++ (gcc)": SupportedLanguage.CPP,
    "python": SupportedLanguage.PYTHON,
    "py": SupportedLanguage.PYTHON,
    "python3": SupportedLanguage.PYTHON,
    "python 3": SupportedLanguage.PYTHON,
    "pypy": SupportedLanguage.PYTHON,
    "pypy3": SupportedLanguage.PYTHON,
    "java": SupportedLanguage.JAVA,
    "java8": SupportedLanguage.JAVA,
    "java11": SupportedLanguage.JAVA,
    "java17": SupportedLanguage.JAVA,
    "c": SupportedLanguage.C,
    "c (gcc)": SupportedLanguage.C,
    "javascript": SupportedLanguage.JAVASCRIPT,
    "js": SupportedLanguage.JAVASCRIPT,
    "node": SupportedLanguage.JAVASCRIPT,
    "nodejs": SupportedLanguage.JAVASCRIPT,
    "go": SupportedLanguage.GO,
    "golang": SupportedLanguage.GO,
}


def normalize_language_str(lang: str) -> SupportedLanguage:
    clean = lang.strip().lower()
    # Normalize common symbols
    if (
        clean.startswith("c++")
        or clean.startswith("cpp")
        or clean.startswith("cp")
        or clean in ["c+", "cp+", "cplusplus", "c_cpp", "c++14", "c++17", "c++20"]
    ):
        return SupportedLanguage.CPP
    if clean.startswith("python") or clean.startswith("py"):
        return SupportedLanguage.PYTHON
    if clean.startswith("java") and not clean.startswith("javascript"):
        return SupportedLanguage.JAVA
    if clean.startswith("js") or clean.startswith("node") or "javascript" in clean:
        return SupportedLanguage.JAVASCRIPT
    if clean == "c" or clean.startswith("c "):
        return SupportedLanguage.C
    if clean.startswith("go"):
        return SupportedLanguage.GO
    if clean in LANGUAGE_ALIASES:
        return LANGUAGE_ALIASES[clean]
    raise ValueError(f"Unsupported programming language: '{lang}'. Supported: cpp, python, java, c, javascript, go")


class ExampleCase(BaseModel):
    input: str = Field(..., description="Example standard input")
    output: str = Field(..., description="Expected standard output")
    explanation: Optional[str] = Field(default=None, description="Optional step explanation")


class ProblemRequest(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Problem title (e.g., 'Number Mirror')",
    )
    problem_statement: str = Field(
        ...,
        min_length=5,
        max_length=50000,
        description="Full text of the problem description",
    )
    input_format: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="Explanation of standard input structure",
    )
    output_format: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="Explanation of expected output structure",
    )
    constraints: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="Numerical bounds on variables (e.g., 1 <= N <= 10^5)",
    )
    examples: List[ExampleCase] = Field(
        default_factory=list,
        description="Sample input/output test cases",
    )
    selected_language: str = Field(
        default="cpp",
        description="Target programming language (cpp, python, java, c, javascript, go)",
    )
    starter_code: Optional[str] = Field(
        default=None,
        max_length=20000,
        description="Existing boilerplate or function signature in the editor to complete",
    )
    workspace_files: Optional[dict[str, str]] = Field(
        default=None,
        description="Multi-file project bundle { file_name: content } for multi-file workspace/lab problems",
    )
    platform: Optional[str] = Field(
        default="codechef",
        max_length=50,
        description="Source coding platform (e.g., codechef, leetcode)",
    )
    problem_url: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Direct URL to problem statement",
    )

    @field_validator("title", "problem_statement")
    @classmethod
    def reject_whitespace_only(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field cannot be empty or whitespace only")
        return v.strip()

    @field_validator("selected_language")
    @classmethod
    def validate_and_normalize_language(cls, v: str) -> str:
        return normalize_language_str(v).value

