"""
CodeMate AI — Constraint Analyzer Service
Evaluates mathematical constraints and derives feasible computational complexity bounds.
"""

import re
from typing import Dict, Any


class ConstraintAnalyzer:
    """
    Analyzes input size limits and provides complexity guidance based on the
    standard competitive programming CPU budget of ~10^8 operations per second.
    """

    @classmethod
    def evaluate_constraints(cls, constraints_str: str) -> Dict[str, Any]:
        """
        Extracts numbers from constraints text and recommends feasible Big-O bounds.
        """
        if not constraints_str:
            return {
                "detected_max_n": None,
                "recommended_complexity": "O(N) or O(N log N)",
                "rationale": "No specific constraint limits provided; assume standard N <= 10^5.",
            }

        text = constraints_str.lower()

        # Check for 10^x notation or standard numbers
        power_match = re.search(r"10\^(\d+)", text)
        max_n = None
        if power_match:
            exponent = int(power_match.group(1))
            max_n = 10 ** exponent
        else:
            # Look for numbers like 100000, 200000, 1000
            numbers = re.findall(r"\b\d{2,10}\b", text)
            if numbers:
                max_n = max(int(n) for n in numbers)

        if max_n is None:
            return {
                "detected_max_n": None,
                "recommended_complexity": "O(N) or O(N log N)",
                "rationale": "Unable to extract exact scalar limit; target O(N) or O(N log N).",
            }

        # Estimate feasible complexity for ~1-second CPU budget (10^8 ops)
        if max_n <= 12:
            rec = "O(N!) or O(2^N)"
            rat = f"N is very small ({max_n}); factorial or exponential backtracking is feasible."
        elif max_n <= 25:
            rec = "O(2^N) or O(N * 2^N)"
            rat = f"N is small ({max_n}); bitmask DP or exponential subsets are feasible."
        elif max_n <= 500:
            rec = "O(N^3) or O(N^2)"
            rat = f"N <= {max_n}; cubic O(N^3) Floyd-Warshall or matrix operations will pass."
        elif max_n <= 5000:
            rec = "O(N^2) or O(N log N)"
            rat = f"N <= {max_n}; quadratic O(N^2) nested loops will comfortably execute in < 1s."
        elif max_n <= 500_000:
            rec = "O(N log N) or O(N)"
            rat = f"N <= {max_n}; quadratic O(N^2) will TLE. Must use linearithmic or linear algorithms."
        else:
            rec = "O(N) or O(log N) or O(1)"
            rat = f"N is large ({max_n}); requires linear stream or mathematical O(1)/O(log N) approach."

        return {
            "detected_max_n": max_n,
            "recommended_complexity": rec,
            "rationale": rat,
        }

