"""
CodeMate AI — Phase 7 Context Retrieval & Compression Engine
Hybrid retrieval combining exact symbol matching, graph traversal, and token budget compression
to synthesize targeted AI prompts without sending the entire repository.
"""

from typing import Dict, List, Optional, Set
from app.services.project_indexer.project_graph import ProjectGraph


MAX_CONTEXT_TOKENS = 6000  # Default budget for retrieved project context


class ContextRetriever:
    """Retrieves relevant file slices, symbols, and dependencies based on a task or query."""

    @classmethod
    def retrieve_context_for_task(
        cls,
        task_description: str,
        symbols: List[Dict],
        dependencies: List[Dict],
        files: List[Dict],
        token_budget: int = MAX_CONTEXT_TOKENS,
    ) -> Dict:
        """
        Synthesizes a minimal, high-precision context package for a given coding task.
        """
        graph = ProjectGraph(symbols, dependencies)
        task_lower = task_description.lower()
        words = set(task_lower.replace(",", " ").replace(".", " ").replace("(", " ").replace(")", " ").split())

        # Stage 1: Exact & Keyword Symbol Matching
        matched_symbols: List[Dict] = []
        for sym in symbols:
            s_name = sym["symbol_name"].lower()
            if s_name in words or any(w in s_name for w in words if len(w) > 3):
                matched_symbols.append(sym)

        # Stage 2: Change-Impact & Downstream Graph Traversal
        affected_symbol_names: Set[str] = {s["symbol_name"] for s in matched_symbols}
        impact_reports: List[Dict] = []

        for sym in matched_symbols[:5]:  # Top 5 matched symbols
            impact = graph.analyze_change_impact(sym["symbol_name"])
            impact_reports.append(impact)
            for caller in impact["impacted_callers"]:
                affected_symbol_names.add(caller)
            for injection in impact["impacted_injection_points"]:
                affected_symbol_names.add(injection)

        # Stage 3: File Map & Slice Selection
        files_by_path = {f["file_path"]: f for f in files}
        relevant_file_paths: Set[str] = set()

        for imp in impact_reports:
            for path in imp["affected_files"]:
                relevant_file_paths.add(path)

        for sym in matched_symbols:
            if sym.get("file_path"):
                relevant_file_paths.add(sym["file_path"])

        # Stage 4: Context Slicing & Compression within Token Budget
        context_slices: List[Dict] = []
        current_char_count = 0
        char_budget = token_budget * 4  # ~4 chars per token estimate

        for rel_path in sorted(list(relevant_file_paths)):
            file_obj = files_by_path.get(rel_path)
            if not file_obj:
                continue

            content = file_obj.get("content", "")
            lines = content.splitlines()

            # Find matching symbol line ranges within this file
            file_symbols = [s for s in symbols if s.get("file_path") == rel_path and s["symbol_name"] in affected_symbol_names]

            if not file_symbols:
                # If small file (< 80 lines), include whole file
                if len(lines) <= 80:
                    slice_text = content
                    line_range = f"1-{len(lines)}"
                else:
                    # Include top 60 lines (imports & structure)
                    slice_text = "\n".join(lines[:60]) + "\n... [Remaining lines truncated for brevity]"
                    line_range = "1-60"
            else:
                # Slice around symbols
                start_l = max(1, min(s["start_line"] for s in file_symbols) - 3)
                end_l = min(len(lines), max(s["end_line"] for s in file_symbols) + 5)
                slice_text = "\n".join(lines[start_l - 1:end_l])
                line_range = f"{start_l}-{end_l}"

            if current_char_count + len(slice_text) > char_budget:
                break

            context_slices.append({
                "file_path": rel_path,
                "language": file_obj.get("language", "text"),
                "line_range": line_range,
                "content_hash": file_obj.get("content_hash", ""),
                "slice_content": slice_text,
                "symbols_present": [s["symbol_name"] for s in file_symbols],
            })
            current_char_count += len(slice_text)

        # Stage 5: Structural Summary
        return {
            "task_description": task_description,
            "matched_symbols_count": len(matched_symbols),
            "relevant_files_count": len(context_slices),
            "slices": context_slices,
            "impact_reports": impact_reports,
            "graph_summary": {
                "total_symbols": len(symbols),
                "total_dependencies": len(dependencies),
            },
        }

