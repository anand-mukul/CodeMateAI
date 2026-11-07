"""
CodeMate AI — Phase 7 Coordinated Patch Engine
Generates unified diffs, verifies original file hashes, applies safe multi-file edits,
and maintains an audit rollback ledger.
"""

import difflib
import hashlib
import json
from typing import Dict, List, Optional, Tuple


class PatchValidationError(Exception):
    """Raised when patch application violates hash integrity or path boundaries."""
    pass


class PatchEngine:
    """Manages unified diff generation, hash verification, patch application, and rollback."""

    @classmethod
    def generate_unified_diff(cls, original_content: str, modified_content: str, file_path: str) -> str:
        """Computes standard unified diff string."""
        orig_lines = original_content.splitlines(keepends=True)
        mod_lines = modified_content.splitlines(keepends=True)
        diff = difflib.unified_diff(
            orig_lines,
            mod_lines,
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            lineterm="",
        )
        return "".join(diff)

    @classmethod
    def apply_patch_to_content(
        cls,
        current_content: str,
        expected_original_hash: Optional[str],
        new_content: str,
        file_path: str,
    ) -> Tuple[str, str]:
        """
        Validates hash integrity and applies replacement content.
        Returns:
            Tuple of (new_content, new_hash)
        """
        current_hash = hashlib.sha256(current_content.encode("utf-8")).hexdigest()

        # Concurrency & Stale Patch Detection
        if expected_original_hash and current_hash != expected_original_hash:
            raise PatchValidationError(
                f"Concurrent edit detected in '{file_path}'. File content hash has changed "
                f"(expected: {expected_original_hash[:8]}..., actual: {current_hash[:8]}...). "
                "Please refresh the project and re-plan."
            )

        new_hash = hashlib.sha256(new_content.encode("utf-8")).hexdigest()
        return new_content, new_hash

    @classmethod
    def create_rollback_snapshot(cls, files: List[Dict]) -> str:
        """Serializes current contents of files to JSON for instant rollback."""
        snapshot = {}
        for f in files:
            snapshot[f["file_path"]] = {
                "content": f.get("content", ""),
                "content_hash": f.get("content_hash", ""),
            }
        return json.dumps(snapshot)

    @classmethod
    def restore_rollback_snapshot(cls, rollback_json: str) -> Dict[str, Dict]:
        """Deserializes rollback snapshot."""
        try:
            return json.loads(rollback_json)
        except Exception:
            return {}

