"""
CodeMate AI — Phase 7 Run, Analyze, Diagnose & Targeted Repair Workflow
Parses compiler / test failure output, diagnoses root cause, and generates targeted minimal fixes.
"""

import re
from typing import Dict, List, Optional, Tuple
from app.services.project_agent.patch_engine import PatchEngine


MAX_REPAIR_ATTEMPTS = 3


class RepairWorkflow:
    """Orchestrates diagnostic error analysis and targeted repair patch generation."""

    # Java / Maven compiler error pattern: [ERROR] /path/to/File.java:[line,col] error: message
    COMPILER_ERROR_RE = re.compile(
        r"(?:\[ERROR\]\s+)?([a-zA-Z0-9_\-\.\/\\\:]+\.java):\[?(\d+)[,\:]?(\d*)\]?:?\s*(error:\s*.+)",
        re.MULTILINE,
    )

    @classmethod
    def parse_error_output(cls, output_text: str) -> List[Dict]:
        """Parses error output into structured diagnostic records."""
        diagnostics = []
        lines = output_text.splitlines()
        for i, line in enumerate(lines):
            match = cls.COMPILER_ERROR_RE.search(line)
            if match:
                file_path = match.group(1).replace("\\", "/")
                # Extract relative path if absolute
                if "/src/" in file_path:
                    file_path = "src/" + file_path.split("/src/", 1)[1]

                line_num = int(match.group(2))
                error_msg = match.group(4).strip()

                # Capture subsequent continuation lines (e.g. symbol: class Optional)
                j = i + 1
                while j < len(lines) and (lines[j].startswith(" ") or lines[j].startswith("\t")):
                    continuation = lines[j].strip()
                    if continuation:
                        error_msg += " " + continuation
                    j += 1

                diagnostics.append({
                    "file_path": file_path,
                    "line_number": line_num,
                    "error_message": error_msg,
                    "category": cls._categorize_error(error_msg),
                })

        # Fallback if generic error without line format
        if not diagnostics and ("error" in output_text.lower() or "exception" in output_text.lower()):
            diagnostics.append({
                "file_path": "unknown",
                "line_number": 0,
                "error_message": output_text.splitlines()[0][:200],
                "category": "COMPILATION_ERROR",
            })

        return diagnostics

    @classmethod
    def generate_targeted_fix(
        cls,
        diagnostic: Dict,
        file_content: str,
        attempt_number: int = 1,
    ) -> Dict:
        """
        Synthesizes a minimal targeted patch to resolve a specific diagnostic error.
        """
        if attempt_number > MAX_REPAIR_ATTEMPTS:
            return {
                "status": "STOPPED_MAX_ATTEMPTS",
                "message": f"Reached maximum repair attempts ({MAX_REPAIR_ATTEMPTS}). User intervention required.",
                "patch": None,
            }

        error_msg = diagnostic.get("error_message", "").lower()
        file_path = diagnostic.get("file_path", "")
        modified_content = file_content
        fix_explanation = f"Targeted repair for: {diagnostic.get('error_message')}"

        # Common Fix 1: Missing Optional import in Java
        if "cannot find symbol" in error_msg and "class optional" in error_msg:
            if "import java.util.Optional;" not in modified_content:
                # Add import right after package or at top
                if "package " in modified_content:
                    idx = modified_content.find(";\n")
                    if idx != -1:
                        modified_content = modified_content[:idx + 2] + "\nimport java.util.Optional;\n" + modified_content[idx + 2:]
                else:
                    modified_content = "import java.util.Optional;\n" + modified_content
                fix_explanation = "Added missing 'import java.util.Optional;' statement."

        # Common Fix 2: Semicolon missing
        elif "';' expected" in error_msg:
            line_num = diagnostic.get("line_number", 1)
            lines = modified_content.splitlines()
            if 0 < line_num <= len(lines):
                target_l = lines[line_num - 1]
                if not target_l.rstrip().endswith(";"):
                    lines[line_num - 1] = target_l.rstrip() + ";"
                    modified_content = "\n".join(lines)
                    fix_explanation = f"Added missing semicolon at line {line_num}."

        diff = PatchEngine.generate_unified_diff(file_content, modified_content, file_path)

        return {
            "status": "PROPOSED",
            "attempt": attempt_number,
            "file_path": file_path,
            "explanation": fix_explanation,
            "diff_content": diff,
            "new_content": modified_content,
        }

    @staticmethod
    def _categorize_error(msg: str) -> str:
        msg_l = msg.lower()
        if "cannot find symbol" in msg_l or "cannot be resolved" in msg_l:
            return "MISSING_SYMBOL"
        if "incompatible types" in msg_l or "type mismatch" in msg_l:
            return "TYPE_MISMATCH"
        if "expected" in msg_l or "syntax error" in msg_l:
            return "SYNTAX_ERROR"
        return "COMPILATION_ERROR"

