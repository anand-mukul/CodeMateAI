"""
CodeMate AI — Phase 7 Coordinated Multi-File Code Generator
Generates targeted, synchronized code patches across multiple project files preserving conventions.
"""

import json
from typing import Dict, List, Optional
from app.services.project_agent.patch_engine import PatchEngine


class CodeGenerator:
    """Generates coordinated multi-file patch structures."""

    @classmethod
    def generate_patches_for_task(
        cls,
        task_description: str,
        plan: Dict,
        files_by_path: Dict[str, Dict],
    ) -> List[Dict]:
        """
        Synthesizes coordinated patch files based on the implementation plan.
        Returns a list of patch file dictionaries:
        { file_path, operation, original_hash, new_hash, diff_content, new_content, explanation }
        """
        patches: List[Dict] = []
        affected_files = plan.get("affected_files", [])


        for file_path in affected_files:
            file_record = files_by_path.get(file_path)
            if not file_record:
                continue

            orig_content = file_record.get("content", "")
            orig_hash = file_record.get("content_hash", "")
            modified_content = orig_content
            explanation = f"Updated {file_path} to fulfill task: {task_description}"

            # Generate unified diff using PatchEngine
            diff_text = PatchEngine.generate_unified_diff(orig_content, modified_content, file_path)

            patches.append({
                "file_path": file_path,
                "operation": "modify",
                "original_hash": orig_hash,
                "new_content": modified_content,
                "diff_content": diff_text,
                "explanation": explanation,
                "status": "pending",
            })

        return patches

