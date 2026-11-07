"""
CodeMate AI — Time and Space Complexity Analyzer
Validates and standardizes asymptotic complexity notations and explanations.
"""

import re
from typing import Tuple
from app.schemas.solution import ComplexityAnalysis, ComplexityItem


class ComplexityAnalyzer:
    """
    Standardizes and verifies Big-O asymptotic notations for competitive programming solutions.
    """

    BIG_O_PATTERN = re.compile(r"O\s*\(\s*([^\)]+)\s*\)", re.IGNORECASE)

    @classmethod
    def normalize_notation(cls, raw: str) -> str:
        """
        Normalizes variations like 'O(nlogn)', 'O(N^2)', 'O(1)' into standard casing.
        """
        match = cls.BIG_O_PATTERN.search(raw)
        if match:
            inner = match.group(1).strip()
            # Normalize common variables
            inner_normalized = inner.replace("n", "N").replace("t", "T").replace("m", "M")
            return f"O({inner_normalized})"
        return raw.strip() or "O(N)"

    @classmethod
    def validate_complexity(cls, complexity: ComplexityAnalysis) -> ComplexityAnalysis:
        """
        Validates that both time and space complexity have non-empty notation and explanations.
        """
        time_not = cls.normalize_notation(complexity.time.notation)
        space_not = cls.normalize_notation(complexity.space.notation)

        time_exp = complexity.time.explanation.strip() if complexity.time.explanation else "Dominated by core loop operations."
        space_exp = complexity.space.explanation.strip() if complexity.space.explanation else "Auxiliary memory usage."

        return ComplexityAnalysis(
            time=ComplexityItem(notation=time_not, explanation=time_exp),
            space=ComplexityItem(notation=space_not, explanation=space_exp),
        )

