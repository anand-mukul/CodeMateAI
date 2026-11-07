"""
CodeMate AI — Algorithm Planning Engine
Recommends optimal algorithmic paradigms, suitable data structures, and evaluates trade-offs.
"""

from typing import Dict, List, Any
from app.services.constraint_analyzer import ConstraintAnalyzer


class AlgorithmPlanner:
    """
    Assists in planning algorithm selection by analyzing problem features,
    feasible time bounds, and suitable competitive programming data structures.
    """

    ALGORITHM_FAMILIES = [
        "Direct Streaming / Simulation",
        "Two Pointers & Sliding Window",
        "Binary Search on Answer / Array",
        "Sorting & Coordinate Compression",
        "Prefix Sums & Difference Arrays",
        "Hashing & Frequency Map",
        "Greedy Choice Strategy",
        "Dynamic Programming (1D / 2D / Bitmask)",
        "Breadth-First Search & Depth-First Search",
        "Dijkstra & Shortest Path",
        "Disjoint Set Union (DSU / Union-Find)",
        "Segment Tree / Fenwick Tree (Binary Indexed Tree)",
        "Number Theory & Modular Arithmetic",
        "Bit Manipulation",
    ]

    @classmethod
    def plan_algorithm(
        cls,
        problem_statement: str,
        constraints: str,
    ) -> Dict[str, Any]:
        """
        Derives algorithmic suggestions and complexity budget.
        """
        budget = ConstraintAnalyzer.evaluate_constraints(constraints)
        text = problem_statement.lower()

        suggested_families = []
        suggested_ds = []

        if any(w in text for w in ["sort", "order", "kth smallest", "median"]):
            suggested_families.append("Sorting & Greedy")
            suggested_ds.append("std::vector / Arrays.sort")

        if any(w in text for w in ["subarray", "substring", "continuous segment"]):
            suggested_families.append("Two Pointers / Sliding Window / Prefix Sums")
            suggested_ds.append("Prefix Sum Array / Hash Table")

        if any(w in text for w in ["minimum", "maximum", "optimal", "ways to", "number of ways"]):
            suggested_families.append("Dynamic Programming or Greedy")
            suggested_ds.append("DP memo table / vector")

        if any(w in text for w in ["graph", "grid", "shortest path", "connected", "island"]):
            suggested_families.append("BFS / DFS / Shortest Path")
            suggested_ds.append("Adjacency List / Queue")

        if not suggested_families:
            suggested_families.append("Direct Fast I/O Simulation / Linear Scan")
            suggested_ds.append("Scalar variables / Fast I/O buffers")

        return {
            "complexity_budget": budget["recommended_complexity"],
            "budget_rationale": budget["rationale"],
            "candidate_families": suggested_families,
            "suggested_data_structures": suggested_ds,
        }

