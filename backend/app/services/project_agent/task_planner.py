"""
CodeMate AI — Phase 7 Multi-File Task Planner
Analyzes coding requirements, retrieves project context, and creates ordered multi-file implementation plans.
"""

import json
from typing import Dict, List, Optional
from app.services.project_indexer.context_retriever import ContextRetriever
from app.services.project_indexer.project_graph import ProjectGraph


class TaskPlanner:
    """Plans multi-file changes based on project graph and coding requirements."""

    @classmethod
    def create_implementation_plan(
        cls,
        task_description: str,
        project_framework: str,
        symbols: List[Dict],
        dependencies: List[Dict],
        files: List[Dict],
    ) -> Dict:
        """
        Generates a structured, ordered multi-file implementation plan.
        """
        # Retrieve context slices and graph impact
        context = ContextRetriever.retrieve_context_for_task(
            task_description=task_description,
            symbols=symbols,
            dependencies=dependencies,
            files=files,
        )

        relevant_slices = context.get("slices", [])
        impact_reports = context.get("impact_reports", [])

        plan_steps: List[Dict] = []
        affected_files_summary: List[str] = [s["file_path"] for s in relevant_slices]

        # Step 1: Inspection steps
        for s in relevant_slices:
            symbols_in_file = ", ".join(s["symbols_present"]) if s["symbols_present"] else "structure"
            plan_steps.append({
                "step_number": len(plan_steps) + 1,
                "action": "INSPECT",
                "file_path": s["file_path"],
                "reason": f"Inspect existing definitions of {symbols_in_file} and verify field accessors.",
            })

        # Step 2: Implementation steps
        # If it's a Spring Boot project, sequence: Model/Entity -> Service -> Controller
        def sort_key(s):
            path = s["file_path"].lower()
            if "model" in path or "entity" in path:
                return 1
            if "repository" in path:
                return 2
            if "service" in path:
                return 3
            if "controller" in path or "app" in path:
                return 4
            if "test" in path:
                return 5
            return 3

        sorted_slices = sorted(relevant_slices, key=sort_key)

        for s in sorted_slices:
            if not s.get("file_path", "").endswith(".xml") and not s.get("file_path", "").endswith(".properties"):
                plan_steps.append({
                    "step_number": len(plan_steps) + 1,
                    "action": "MODIFY",
                    "file_path": s["file_path"],
                    "reason": f"Implement required methods matching the contract for: '{task_description}'.",
                })

        # Step 3: Verification / Test steps
        test_files = [f["file_path"] for f in files if f.get("is_test")]
        for tf in test_files[:2]:
            plan_steps.append({
                "step_number": len(plan_steps) + 1,
                "action": "VERIFY_TESTS",
                "file_path": tf,
                "reason": "Add or update test assertions to ensure behavior without regressions.",
            })

        return {
            "task_description": task_description,
            "project_framework": project_framework,
            "confidence": "HIGH" if len(relevant_slices) > 0 else "MEDIUM",
            "affected_files": affected_files_summary,
            "steps": plan_steps,
            "impact_analysis": impact_reports,
            "risks": [
                "Preserve existing method signatures to avoid breaking external callers.",
                "Ensure null-safety on string lookups and comparisons.",
            ],
            "context_summary": {
                "matched_symbols": context.get("matched_symbols_count", 0),
                "relevant_files": len(relevant_slices),
            },
        }

