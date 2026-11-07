"""
CodeMate AI — Phase 7 Java Source Parser & AST Extractor
Extracts packages, imports, class/interface declarations, constructors, methods,
Spring annotations (@RestController, @Service, @Entity, @Transactional, etc.),
and constructor injection dependencies from Java source code.
"""

import json
import re
from typing import Dict, List, Optional


class JavaParser:
    """Parses Java source files and extracts structured symbol metadata."""

    # Regex for stripping block & line comments while preserving line count
    BLOCK_COMMENT_RE = re.compile(r"/\*[\s\S]*?\*/")
    LINE_COMMENT_RE = re.compile(r"//.*")

    # Core language constructs
    PACKAGE_RE = re.compile(r"^\s*package\s+([a-zA-Z0-9_\.]+)\s*;", re.MULTILINE)
    IMPORT_RE = re.compile(r"^\s*import\s+(?:static\s+)?([a-zA-Z0-9_\.\*]+)\s*;", re.MULTILINE)

    # Class / Interface / Enum / Record declaration with annotations
    TYPE_DECL_RE = re.compile(
        r"((?:@\w+(?:\([^)]*\))?\s*)*)"  # Annotations
        r"(?:(public|protected|private)\s+)?"  # Visibility
        r"(?:(abstract|static|final)\s+)?"  # Modifiers
        r"(class|interface|enum|record)\s+"  # Type
        r"([a-zA-Z0-9_]+)"  # Name
        r"(?:<[^>]+>)?"  # Generics
        r"(?:\s+extends\s+([a-zA-Z0-9_\.<>]+))?"  # Extends
        r"(?:\s+implements\s+([a-zA-Z0-9_\.<>,\s]+))?"  # Implements
        r"\s*\{",
        re.MULTILINE,
    )

    # Method declaration with annotations
    METHOD_DECL_RE = re.compile(
        r"((?:@\w+(?:\([^)]*\))?\s*)*)"  # Annotations
        r"(?:(public|protected|private)\s+)?"  # Visibility
        r"(?:(static|final|abstract|synchronized)\s+)?"  # Modifiers
        r"(?:<[^>]+>\s+)?"  # Generic type params
        r"([a-zA-Z0-9_<>\[\],\s]+?)\s+"  # Return type
        r"([a-zA-Z0-9_]+)\s*"  # Method name
        r"\(([^)]*)\)"  # Parameters
        r"(?:\s+throws\s+[a-zA-Z0-9_,\s]+)?"  # Throws
        r"\s*[{;]",
        re.MULTILINE,
    )

    # Field declaration with annotations
    FIELD_DECL_RE = re.compile(
        r"((?:@\w+(?:\([^)]*\))?\s*)*)"  # Annotations
        r"(?:(public|protected|private)\s+)?"  # Visibility
        r"(?:(static|final|transient|volatile)\s+)*"  # Modifiers
        r"([a-zA-Z0-9_<>\[\]]+)\s+"  # Field type
        r"([a-zA-Z0-9_]+)\s*"  # Field name
        r"(?:=[^;]+)?;",
        re.MULTILINE,
    )

    @classmethod
    def parse_source(cls, source_code: str, file_path: str = "") -> Dict:
        """
        Parses Java source and returns structured symbol & dependency extraction.
        """
        lines = source_code.splitlines()
        total_lines = len(lines)

        # 1. Extract package
        package_match = cls.PACKAGE_RE.search(source_code)
        package_name = package_match.group(1) if package_match else None

        # 2. Extract imports
        imports = [m.group(1) for m in cls.IMPORT_RE.finditer(source_code)]

        symbols: List[Dict] = []
        dependencies: List[Dict] = []

        # 3. Extract types (classes, interfaces, etc.)
        for match in cls.TYPE_DECL_RE.finditer(source_code):
            raw_annotations = match.group(1) or ""
            visibility = match.group(2) or "package"
            kind = match.group(4)
            name = match.group(5)
            extends_type = match.group(6)
            implements_raw = match.group(7)

            annotations = cls._extract_annotations(raw_annotations)
            start_line = source_code[:match.start()].count("\n") + 1

            # Estimate end line by finding matching brace
            end_line = cls._find_matching_brace(source_code, match.end() - 1, start_line)

            symbols.append({
                "symbol_name": name,
                "symbol_type": kind,
                "container_name": None,
                "package_name": package_name,
                "return_type": None,
                "parameters_json": None,
                "annotations_json": json.dumps(annotations),
                "start_line": start_line,
                "end_line": min(end_line, total_lines),
                "visibility": visibility,
                "documentation": None,
            })

            # Check inheritance
            if extends_type:
                clean_ext = extends_type.split("<")[0].strip()
                dependencies.append({
                    "source_symbol_name": name,
                    "target_symbol_name": clean_ext,
                    "relation_type": "EXTENDS",
                    "confidence": "confirmed",
                    "line_number": start_line,
                })

            if implements_raw:
                for iface in implements_raw.split(","):
                    clean_iface = iface.split("<")[0].strip()
                    if clean_iface:
                        dependencies.append({
                            "source_symbol_name": name,
                            "target_symbol_name": clean_iface,
                            "relation_type": "IMPLEMENTS",
                            "confidence": "confirmed",
                            "line_number": start_line,
                        })

        # 4. Extract fields & dependencies (Spring injection)
        current_class = symbols[0]["symbol_name"] if symbols else "UnknownClass"
        field_types: Dict[str, str] = {}  # field_name -> field_type

        for match in cls.FIELD_DECL_RE.finditer(source_code):
            raw_annotations = match.group(1) or ""
            f_visibility = match.group(2) or "package"
            f_type = match.group(4)
            f_name = match.group(5)
            f_line = source_code[:match.start()].count("\n") + 1

            # Ignore keywords matched accidentally
            if f_type in ("return", "throw", "else", "public", "private", "protected"):
                continue

            field_types[f_name] = f_type
            f_annotations = cls._extract_annotations(raw_annotations)

            symbols.append({
                "symbol_name": f_name,
                "symbol_type": "field",
                "container_name": current_class,
                "package_name": package_name,
                "return_type": f_type,
                "parameters_json": None,
                "annotations_json": json.dumps(f_annotations),
                "start_line": f_line,
                "end_line": f_line,
                "visibility": f_visibility,
                "documentation": None,
            })

            # Detect @Autowired / injected fields
            if any("@autowired" in a.lower() for a in f_annotations):
                clean_type = f_type.split("<")[0].strip()
                dependencies.append({
                    "source_symbol_name": current_class,
                    "target_symbol_name": clean_type,
                    "relation_type": "INJECTS",
                    "confidence": "confirmed",
                    "line_number": f_line,
                })

        # 5. Extract methods & constructors
        for match in cls.METHOD_DECL_RE.finditer(source_code):
            raw_annotations = match.group(1) or ""
            m_visibility = match.group(2) or "package"
            return_type = (match.group(4) or "").strip()
            method_name = match.group(5)
            params_raw = match.group(6) or ""
            m_line = source_code[:match.start()].count("\n") + 1

            if method_name in ("if", "for", "while", "switch", "catch"):
                continue

            # Determine if this is a constructor
            is_constructor = (method_name == current_class) or (return_type == current_class)
            symbol_type = "constructor" if is_constructor else "method"

            m_annotations = cls._extract_annotations(raw_annotations)
            params = cls._parse_parameters(params_raw)

            m_end_line = cls._find_matching_brace(source_code, match.end() - 1, m_line)

            symbols.append({
                "symbol_name": method_name,
                "symbol_type": symbol_type,
                "container_name": current_class,
                "package_name": package_name,
                "return_type": return_type if not is_constructor else None,
                "parameters_json": json.dumps(params),
                "annotations_json": json.dumps(m_annotations),
                "start_line": m_line,
                "end_line": min(m_end_line, total_lines),
                "visibility": m_visibility,
                "documentation": None,
            })

            # Spring Constructor Injection: if a constructor parameters match class fields
            if is_constructor:
                for param in params:
                    p_type = param.get("type", "").split("<")[0].strip()
                    if p_type and p_type not in ("String", "int", "long", "boolean", "double", "float"):
                        dependencies.append({
                            "source_symbol_name": current_class,
                            "target_symbol_name": p_type,
                            "relation_type": "INJECTS",
                            "confidence": "confirmed",
                            "line_number": m_line,
                        })

        # 6. Extract method calls on injected fields (e.g. studentService.findByName())
        for field_name, f_type in field_types.items():
            call_pattern = re.compile(rf"{re.escape(field_name)}\.([a-zA-Z0-9_]+)\s*\(")
            for call_match in call_pattern.finditer(source_code):
                called_method = call_match.group(1)
                c_line = source_code[:call_match.start()].count("\n") + 1
                clean_target = f_type.split("<")[0].strip()
                dependencies.append({
                    "source_symbol_name": current_class,
                    "target_symbol_name": f"{clean_target}.{called_method}",
                    "relation_type": "CALLS",
                    "confidence": "confirmed",
                    "line_number": c_line,
                })

        # 7. Record package import dependencies
        for imp in imports:
            clean_imp = imp.split(".*")[0].split(".")[-1]
            if clean_imp and clean_imp[0].isupper():
                dependencies.append({
                    "source_symbol_name": current_class,
                    "target_symbol_name": clean_imp,
                    "relation_type": "IMPORTS",
                    "confidence": "confirmed",
                    "line_number": 1,
                })

        return {
            "package_name": package_name,
            "imports": imports,
            "symbols": symbols,
            "dependencies": dependencies,
        }

    @classmethod
    def _extract_annotations(cls, raw: str) -> List[str]:
        """Extracts individual annotation strings (e.g. ['@Service', '@Transactional'])."""
        if not raw:
            return []
        matches = re.findall(r"@\w+(?:\([^)]*\))?", raw)
        return [m.strip() for m in matches]

    @classmethod
    def _parse_parameters(cls, raw: str) -> List[Dict[str, str]]:
        """Parses method parameters into typed dictionaries."""
        if not raw or not raw.strip():
            return []
        params = []
        for p in raw.split(","):
            p = p.strip()
            if not p:
                continue
            parts = p.split()
            if len(parts) >= 2:
                params.append({"type": parts[-2], "name": parts[-1]})
            else:
                params.append({"type": parts[0], "name": "arg"})
        return params

    @classmethod
    def _find_matching_brace(cls, text: str, start_pos: int, start_line: int) -> int:
        """Finds the closing curly brace line count for a block."""
        open_brace = text.find("{", start_pos)
        if open_brace == -1:
            return start_line + 1

        depth = 1
        pos = open_brace + 1
        text_len = len(text)
        while pos < text_len and depth > 0:
            char = text[pos]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
            pos += 1

        return text[:pos].count("\n") + 1

