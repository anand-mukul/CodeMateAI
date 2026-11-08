"""
CodeMate AI — Phase 7.5 Multi-File Dependency Resolver & Typed Contract Extractor
Provides:
1. Dependency-aware topological sort for multi-file workspace generation.
2. Typed interface/contract extraction to replace brittle text slicing.
3. Cycle handling and fallback heuristics.
"""

import re
from typing import Dict, List, Set, Tuple
from collections import defaultdict, deque
import logging

logger = logging.getLogger("codemate.multifile")


def file_order_key(name: str) -> int:
    """Architectural layer priority for tie-breaking and cycle fallback."""
    n = name.lower()
    if any(k in n for k in ["type", "interface", "model", "schema", "dto", "entity"]):
        return 1
    if any(k in n for k in ["util", "repo", "dao", "hook", "store", "slice", "helper"]):
        return 2
    if any(k in n for k in ["service", "api", "crud", "client"]):
        return 3
    if any(k in n for k in ["component", "controller", "route", "view", "handler"]):
        return 4
    if any(k in n for k in ["app", "main", "index", "runner", "application", "server"]):
        return 5
    return 6


def extract_file_symbols_and_imports(files: Dict[str, str]) -> Tuple[Dict[str, Set[str]], Dict[str, Set[str]]]:
    """
    Scans files to extract:
    1. declared_symbols: {filename -> set of symbols declared in this file}
    2. referenced_symbols: {filename -> set of symbols or imported file names referenced}
    """
    declared: Dict[str, Set[str]] = defaultdict(set)
    referenced: Dict[str, Set[str]] = defaultdict(set)

    # Pre-populate symbol names from filenames (e.g. User.java -> User, user_service.py -> user_service)
    for fname in files.keys():
        base = fname.split("/")[-1].split("\\")[-1]
        name_no_ext = base.split(".")[0]
        declared[fname].add(name_no_ext)

    for fname, code in files.items():
        base = fname.split("/")[-1].split("\\")[-1]
        ext = base.split(".")[-1].lower() if "." in base else ""

        # Find classes, interfaces, types declared inside the file
        if ext in ("java", "kt", "scala"):
            class_matches = re.findall(r"\b(?:public\s+)?(?:class|interface|enum|record)\s+([A-Za-z0-9_]+)\b", code)
            for cm in class_matches:
                declared[fname].add(cm)
        elif ext in ("ts", "tsx", "js", "jsx"):
            ts_matches = re.findall(r"\b(?:export\s+)?(?:class|interface|type|enum)\s+([A-Za-z0-9_]+)\b", code)
            for tm in ts_matches:
                declared[fname].add(tm)
            comp_matches = re.findall(r"\bexport\s+(?:const|function)\s+([A-Za-z0-9_]+)\b", code)
            for cm in comp_matches:
                declared[fname].add(cm)
        elif ext == "py":
            py_matches = re.findall(r"^(?:class|def)\s+([A-Za-z0-9_]+)\b", code, re.MULTILINE)
            for pm in py_matches:
                declared[fname].add(pm)

        # Check references to declared symbols of OTHER files
        # Check explicit imports
        # Java: import ...ClassName;
        # TS/JS: import ... from './...'
        # Python: import ... or from ... import ...
        for other_fname, other_symbols in declared.items():
            if other_fname == fname:
                continue
            other_base = other_fname.split("/")[-1].split("\\")[-1].split(".")[0]
            # Check if other base or any of its symbols are referenced in code
            for sym in other_symbols:
                pattern = rf"\b{re.escape(sym)}\b"
                if re.search(pattern, code):
                    referenced[fname].add(other_fname)
                    break

            # Also check relative path imports (JS/TS/Python)
            rel_pattern = rf"['\"].*?{re.escape(other_base)}['\"]"
            if re.search(rel_pattern, code):
                referenced[fname].add(other_fname)

    return declared, referenced


def sort_workspace_files_topologically(files: Dict[str, str]) -> List[str]:
    """
    Constructs a dependency DAG where an edge exists U -> V if V depends on U
    (meaning U must be resolved before V).
    Performs Kahn's algorithm with architectural priority tie-breaking.
    Gracefully resolves cycles without failure.
    """
    if not files:
        return []
    if len(files) == 1:
        return list(files.keys())

    _, referenced = extract_file_symbols_and_imports(files)

    # Graph construction:
    # If file V references file U, then U must come before V.
    # Edge: U -> V (U enables V).
    adj: Dict[str, Set[str]] = defaultdict(set)
    in_degree: Dict[str, int] = {f: 0 for f in files}

    for v, deps in referenced.items():
        for u in deps:
            if u in files and u != v:
                if v not in adj[u]:
                    adj[u].add(v)
                    in_degree[v] += 1

    # Queue of nodes with in_degree == 0
    # To be deterministic, sort by (file_order_key, filename)
    queue = deque(
        sorted([f for f in files if in_degree[f] == 0], key=lambda x: (file_order_key(x), x))
    )

    result: List[str] = []

    while queue:
        u = queue.popleft()
        result.append(u)

        for v in sorted(adj[u], key=lambda x: (file_order_key(x), x)):
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)

        # Re-sort queue to maintain architectural layer priority
        if len(queue) > 1:
            sorted_q = sorted(queue, key=lambda x: (file_order_key(x), x))
            queue = deque(sorted_q)

    # Cycle handling: if some nodes have not been added due to dependency cycles
    if len(result) < len(files):
        remaining = [f for f in files if f not in set(result)]
        logger.warning(
            f"Dependency cycle detected among multi-file project workspace: {remaining}. "
            "Falling back to architectural layer priority order for cyclic files."
        )
        remaining.sort(key=lambda x: (file_order_key(x), x))
        result.extend(remaining)

    return result


def extract_typed_contracts(code: str, filename: str, language: str) -> str:
    """
    Extracts a high-fidelity, concise API contract from a completed source file.
    Replaces bulky method bodies with signatures while preserving:
    - Package and import declarations
    - Class, interface, type, record, enum headers
    - Public/protected method signatures with annotations
    - Public/private fields and DTO properties
    """
    if not code or len(code.strip()) < 50:
        return code

    lang = language.lower() if language else ""
    if not lang or lang == "text":
        base = filename.split(".")[-1].lower() if "." in filename else ""
        if base in ("java", "kt"):
            lang = "java"
        elif base in ("ts", "tsx"):
            lang = "typescript"
        elif base in ("js", "jsx"):
            lang = "javascript"
        elif base == "py":
            lang = "python"
        elif base in ("cpp", "c", "h", "hpp"):
            lang = "cpp"

    if lang == "java":
        return _extract_java_contract(code)
    elif lang in ("typescript", "javascript"):
        return _extract_typescript_contract(code)
    elif lang == "python":
        return _extract_python_contract(code)
    else:
        # Fallback for generic/c++/other: return header / first 1500 chars
        return code[:1500]


def _extract_java_contract(code: str) -> str:
    """Extracts Java package, imports, class header, fields, and method signatures without bodies."""
    lines = code.splitlines()
    output_lines: List[str] = []
    in_class = False
    brace_depth = 0

    method_sig_pattern = re.compile(
        r"^\s*(?:@\w+(?:\([^)]*\))?\s*)*(?:public|protected)\s+(?:static\s+)?(?:final\s+)?(?:<[^>]+>\s+)?([A-Za-z0-9_<>\[\],\s]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)"
    )
    field_pattern = re.compile(
        r"^\s*(?:@\w+(?:\([^)]*\))?\s*)*(?:private|public|protected)\s+(?:static\s+)?(?:final\s+)?([A-Za-z0-9_<>\[\],\s]+)\s+([A-Za-z0-9_]+)\s*(?:=.*?)?;\s*$"
    )
    class_pattern = re.compile(
        r"^\s*(?:@\w+(?:\([^)]*\))?\s*)*(?:public\s+)?(?:abstract\s+)?(?:class|interface|enum|record)\s+([A-Za-z0-9_]+)"
    )

    pending_annotations: List[str] = []

    for line in lines:
        stripped = line.strip()

        # Handle annotations
        if stripped.startswith("@"):
            if brace_depth <= 1:
                pending_annotations.append(line)
            continue

        # Package and import statements
        if not in_class and (stripped.startswith("package ") or stripped.startswith("import ")):
            output_lines.append(line)
            continue

        # Class declaration
        if not in_class and class_pattern.search(line):
            output_lines.extend(pending_annotations)
            pending_annotations = []
            output_lines.append(line.rstrip())
            in_class = True
            brace_depth += line.count("{") - line.count("}")
            continue

        if in_class:
            # If we are directly inside the class body (brace_depth == 1)
            if brace_depth == 1:
                # Field declarations
                if field_pattern.search(line) and "{" not in line:
                    output_lines.extend(pending_annotations)
                    pending_annotations = []
                    output_lines.append(line.rstrip())
                    continue

                # Method declarations
                sig_match = method_sig_pattern.search(line)
                if sig_match:
                    output_lines.extend(pending_annotations)
                    pending_annotations = []
                    ret_type = sig_match.group(1).strip()
                    method_name = sig_match.group(2).strip()
                    params = sig_match.group(3).strip()
                    indent = "    "
                    output_lines.append(f"{indent}public {ret_type} {method_name}({params});")
                    # Track if method opened a block
                    brace_depth += line.count("{") - line.count("}")
                    continue

            # Inside method body (brace_depth > 1) or class closing
            pending_annotations = []
            brace_depth += line.count("{") - line.count("}")
            if brace_depth <= 0:
                output_lines.append("}")
                break

    if in_class and (not output_lines or output_lines[-1] != "}"):
        output_lines.append("}")

    result = "\n".join(output_lines).strip()
    return result if len(result) > 40 else code[:1500]


def _extract_typescript_contract(code: str) -> str:
    """Extracts TS/JS exported interfaces, types, enums, and method/function signatures."""
    lines = code.splitlines()
    output_lines: List[str] = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("import "):
            output_lines.append(line)
        elif stripped.startswith("export interface ") or stripped.startswith("export type ") or stripped.startswith("export enum "):
            output_lines.append(line)
        elif stripped.startswith("export const ") or stripped.startswith("export function "):
            # If function has body, extract signature
            if "{" in line:
                sig = line.split("{")[0].strip() + ";"
                output_lines.append(sig)
            else:
                output_lines.append(line)
        elif stripped.startswith("export default "):
            output_lines.append(line)

    result = "\n".join(output_lines).strip()
    return result if len(result) > 40 else code[:1500]


def _extract_python_contract(code: str) -> str:
    """Extracts Python class declarations, type hints, and def signatures."""
    lines = code.splitlines()
    output_lines: List[str] = []
    in_class = False

    def_pattern = re.compile(r"^(\s*(?:async\s+)?def\s+[A-Za-z0-9_]+\s*\(.*?\)(?:\s*->\s*[^:]+)?)\s*:\s*(?:$|#)")
    field_pattern = re.compile(r"^(\s+[A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_\[\],\s\.\'\"]+)(?:\s*=.*)?$")

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        if stripped.startswith("from ") or stripped.startswith("import "):
            output_lines.append(line)
            continue

        if stripped.startswith("class "):
            output_lines.append(line)
            in_class = True
            continue

        # Method/Function definitions
        def_match = def_pattern.match(line)
        if def_match:
            sig = def_match.group(1).rstrip()
            output_lines.append(f"{sig}: ...")
            continue

        # Type-annotated class attributes (Pydantic / dataclasses / typed models)
        if in_class and not any(stripped.startswith(k) for k in ("if ", "for ", "while ", "try:", "except", "with ", "return ", "self.", "raise ", "pass")):
            field_match = field_pattern.match(line)
            if field_match:
                attr_name = field_match.group(1).rstrip()
                attr_type = field_match.group(2).strip()
                output_lines.append(f"{attr_name}: {attr_type}")

    result = "\n".join(output_lines).strip()
    return result if len(result) > 40 else code[:1500]
