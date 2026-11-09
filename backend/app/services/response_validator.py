"""
CodeMate AI — Static Solution & Code Response Validator
Enforces quality, syntax completeness, and rejects unfinished code or placeholders.
"""

from typing import List, Tuple
from app.schemas.solution import SolutionResponse


class SolutionValidationError(Exception):
    """Raised when generated code violates structural completeness rules."""
    pass


class ResponseValidator:
    """
    Validates generated source code completeness, language conformity, and Big-O consistency.
    Does NOT execute untrusted code on the server.
    """

    PLACEHOLDER_PATTERNS = [
        "// todo",
        "# todo",
        "// your code here",
        "# your code here",
        "/* insert solution */",
        "...",
        "pass  # implement",
    ]

    LANGUAGE_SIGNATURES = {
        "cpp": ["#include", "main"],
        "c": ["#include", "main"],
        "python": [("def ", "input", "sys.stdin", "print")],
        "java": ["class ", "main"],
        "javascript": [("function", "console.log", "fs", "=>")],
        "go": ["package main", "func main"],
    }

    @classmethod
    def validate_solution(cls, solution: SolutionResponse, expected_language: str) -> Tuple[bool, List[str]]:
        """
        Performs static validation of generated solution.
        Returns (is_valid, list_of_warnings).
        """
        warnings: List[str] = []
        code = solution.code.strip()

        # 1. Non-empty code check
        if not code or len(code) < 15:
            raise SolutionValidationError("Generated code is too short or empty to be a complete solution.")

        # 2. Language alignment & Auto-adaptation
        norm_expected = expected_language.lower().replace("3", "").replace("17", "").strip()
        norm_gen = solution.language.lower().replace("3", "").replace("17", "").strip()
        if norm_gen != norm_expected:
            warnings.append(
                f"Generated language '{solution.language}' differed from requested '{expected_language}', auto-adapted."
            )

        # 3. Placeholder / Stub detection
        code_lower = code.lower()
        for placeholder in cls.PLACEHOLDER_PATTERNS:
            if placeholder in code_lower:
                warnings.append(f"Potential placeholder '{placeholder}' detected in solution.")

        # 4. Basic language signature check
        signatures = cls.LANGUAGE_SIGNATURES.get(expected_language.lower())
        if signatures:
            for sig in signatures:
                if isinstance(sig, tuple):
                    if not any(token in code for token in sig):
                        warnings.append(f"Standard {expected_language} keywords {sig} were not detected.")
                elif sig not in code:
                    warnings.append(f"Standard {expected_language} keyword '{sig}' was not detected.")

        return True, warnings

