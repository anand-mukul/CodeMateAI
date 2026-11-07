"""
CodeMate AI — Phase 7 Project Dependency Graph & Change-Impact Engine
Constructs directed dependency graphs with confirmed/inferred confidence ratings
and performs impact analysis across classes, methods, endpoints, and tests.
"""

from typing import Dict, List, Optional, Set
from collections import defaultdict


class ProjectGraph:
    """Represents a project's symbols and dependency relationships as a directed graph."""

    def __init__(self, symbols: List[Dict], dependencies: List[Dict]):
        self.symbols = symbols
        self.dependencies = dependencies

        # Symbol lookup: symbol_name -> symbol dict
        self.symbol_map: Dict[str, Dict] = {s["symbol_name"]: s for s in symbols}

        # Adjacency lists: source -> list of (target, relation_type, confidence)
        self.forward_adj: Dict[str, List[Dict]] = defaultdict(list)
        # Reverse adjacency list: target -> list of (source, relation_type, confidence)
        self.reverse_adj: Dict[str, List[Dict]] = defaultdict(list)

        for dep in dependencies:
            src = dep["source_symbol_name"]
            tgt = dep["target_symbol_name"]
            rel = dep["relation_type"]
            conf = dep.get("confidence", "confirmed")

            edge = {
                "source": src,
                "target": tgt,
                "relation_type": rel,
                "confidence": conf,
                "line_number": dep.get("line_number"),
            }
            self.forward_adj[src].append(edge)
            self.reverse_adj[tgt].append(edge)

    def trace_dependency_flow(self, start_symbol: str) -> List[List[str]]:
        """
        Traces downstream dependencies from a symbol (e.g. CollegeApp -> StudentService -> Student).
        """
        paths: List[List[str]] = []

        def dfs(current: str, current_path: List[str], visited: Set[str]):
            # If current has a method call target like "StudentService.findByName", extract class
            base_sym = current.split(".")[0]
            out_edges = self.forward_adj.get(base_sym, [])
            downstream = [e["target"].split(".")[0] for e in out_edges if e["relation_type"] in ("INJECTS", "CALLS", "USES", "EXTENDS")]

            valid_downstream = [d for d in downstream if d not in visited and d != base_sym]
            if not valid_downstream:
                if len(current_path) > 1:
                    paths.append(list(current_path))
                return

            for nxt in valid_downstream:
                visited.add(nxt)
                current_path.append(nxt)
                dfs(nxt, current_path, visited)
                current_path.pop()
                visited.remove(nxt)

        dfs(start_symbol, [start_symbol], {start_symbol})
        return paths

    def analyze_change_impact(self, target_symbol: str) -> Dict:
        """
        Computes structured change-impact report when a class or method needs modification.
        Answers:
        1. Which files define it?
        2. Which files import or use it?
        3. Which interfaces or implementations depend on it?
        4. Which constructors or dependency injection points are affected?
        5. Which tests may need updating?
        """
        clean_target = target_symbol.split(".")[0]
        defining_symbol = self.symbol_map.get(clean_target)
        defining_file = defining_symbol.get("file_path") if defining_symbol else "Unknown"

        impacted_callers: Set[str] = set()
        impacted_interfaces: Set[str] = set()
        impacted_implementations: Set[str] = set()
        impacted_injection_points: Set[str] = set()
        impacted_tests: Set[str] = set()

        # Inward dependencies (who depends on target?)
        in_edges = self.reverse_adj.get(clean_target, [])
        for edge in in_edges:
            src = edge["source"]
            rel = edge["relation_type"]
            src_sym = self.symbol_map.get(src)
            src_file = src_sym.get("file_path", "") if src_sym else ""

            if "test" in src.lower() or "test" in src_file.lower():
                impacted_tests.add(src)
            elif rel == "INJECTS":
                impacted_injection_points.add(src)
            elif rel == "IMPLEMENTS":
                impacted_implementations.add(src)
            elif rel == "CALLS" or rel == "USES":
                impacted_callers.add(src)

        # Also check method-specific inward calls (e.g. StudentService.findByName)
        for sym_name, edges in self.reverse_adj.items():
            if sym_name.startswith(f"{clean_target}."):
                for edge in edges:
                    src = edge["source"]
                    impacted_callers.add(src)

        # Outward dependencies (what does target depend on?)
        out_edges = self.forward_adj.get(clean_target, [])
        for edge in out_edges:
            tgt = edge["target"]
            rel = edge["relation_type"]
            if rel == "IMPLEMENTS":
                impacted_interfaces.add(tgt)

        affected_files: Set[str] = set()
        if defining_file and defining_file != "Unknown":
            affected_files.add(defining_file)

        for sym in (impacted_callers | impacted_injection_points | impacted_tests):
            sym_obj = self.symbol_map.get(sym)
            if sym_obj and sym_obj.get("file_path"):
                affected_files.add(sym_obj["file_path"])

        return {
            "target_symbol": target_symbol,
            "defining_file": defining_file,
            "affected_files": sorted(list(affected_files)),
            "impacted_callers": sorted(list(impacted_callers)),
            "impacted_injection_points": sorted(list(impacted_injection_points)),
            "impacted_interfaces": sorted(list(impacted_interfaces)),
            "impacted_implementations": sorted(list(impacted_implementations)),
            "impacted_tests": sorted(list(impacted_tests)),
            "risk_level": "HIGH" if len(affected_files) > 3 else ("MEDIUM" if len(affected_files) > 1 else "LOW"),
        }

    def to_graph_data(self) -> Dict:
        """Serializes the graph into nodes and edges for visualization and API responses."""
        nodes = []
        for sym in self.symbols:
            nodes.append({
                "id": sym["symbol_name"],
                "label": sym["symbol_name"],
                "type": sym["symbol_type"],
                "file_path": sym.get("file_path", ""),
                "package": sym.get("package_name"),
            })

        edges = []
        for dep in self.dependencies:
            edges.append({
                "source": dep["source_symbol_name"],
                "target": dep["target_symbol_name"],
                "relation_type": dep["relation_type"],
                "confidence": dep.get("confidence", "confirmed"),
            })

        return {"nodes": nodes, "edges": edges}

