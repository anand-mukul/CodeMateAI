"""
CodeMate AI — Phase 7 Python AST Parser
Extracts module imports, classes, functions, async methods, and decorators using the standard library ast module.
"""

import ast
import json
from typing import Dict, List, Optional


class PythonParser:
    """Parses Python source files using the native ast module."""

    @classmethod
    def parse_source(cls, source_code: str, file_path: str = "") -> Dict:
        """Parses Python code and extracts symbols and dependencies."""
        symbols: List[Dict] = []
        dependencies: List[Dict] = []
        imports: List[str] = []

        try:
            tree = ast.parse(source_code)
        except SyntaxError:
            return {"package_name": None, "imports": [], "symbols": [], "dependencies": []}

        for node in ast.iter_child_nodes(tree):
            # 1. Imports
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                mod = node.module or ""
                for alias in node.names:
                    full_name = f"{mod}.{alias.name}" if mod else alias.name
                    imports.append(full_name)
                    dependencies.append({
                        "source_symbol_name": file_path,
                        "target_symbol_name": alias.name,
                        "relation_type": "IMPORTS",
                        "confidence": "confirmed",
                        "line_number": node.lineno,
                    })

            # 2. Classes
            elif isinstance(node, ast.ClassDef):
                decorators = [ast.unparse(d) if hasattr(ast, "unparse") else d.__class__.__name__ for d in node.decorator_list]
                bases = [ast.unparse(b) if hasattr(ast, "unparse") else b.__class__.__name__ for b in node.bases]

                symbols.append({
                    "symbol_name": node.name,
                    "symbol_type": "class",
                    "container_name": None,
                    "package_name": None,
                    "return_type": None,
                    "parameters_json": None,
                    "annotations_json": json.dumps(decorators),
                    "start_line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                    "visibility": "public",
                    "documentation": ast.get_docstring(node),
                })

                for base in bases:
                    dependencies.append({
                        "source_symbol_name": node.name,
                        "target_symbol_name": base,
                        "relation_type": "EXTENDS",
                        "confidence": "confirmed",
                        "line_number": node.lineno,
                    })

                # Methods inside class
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        m_decorators = [ast.unparse(d) if hasattr(ast, "unparse") else d.__class__.__name__ for d in item.decorator_list]
                        params = [{"name": arg.arg, "type": ast.unparse(arg.annotation) if arg.annotation and hasattr(ast, "unparse") else "Any"} for arg in item.args.args]
                        ret = ast.unparse(item.returns) if item.returns and hasattr(ast, "unparse") else None

                        symbols.append({
                            "symbol_name": item.name,
                            "symbol_type": "method",
                            "container_name": node.name,
                            "package_name": None,
                            "return_type": ret,
                            "parameters_json": json.dumps(params),
                            "annotations_json": json.dumps(m_decorators),
                            "start_line": item.lineno,
                            "end_line": getattr(item, "end_lineno", item.lineno),
                            "visibility": "private" if item.name.startswith("__") else "public",
                            "documentation": ast.get_docstring(item),
                        })

            # 3. Top-level functions
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                decorators = [ast.unparse(d) if hasattr(ast, "unparse") else d.__class__.__name__ for d in node.decorator_list]
                params = [{"name": arg.arg, "type": ast.unparse(arg.annotation) if arg.annotation and hasattr(ast, "unparse") else "Any"} for arg in node.args.args]
                ret = ast.unparse(node.returns) if node.returns and hasattr(ast, "unparse") else None

                symbols.append({
                    "symbol_name": node.name,
                    "symbol_type": "function",
                    "container_name": None,
                    "package_name": None,
                    "return_type": ret,
                    "parameters_json": json.dumps(params),
                    "annotations_json": json.dumps(decorators),
                    "start_line": node.lineno,
                    "end_line": getattr(node, "end_lineno", node.lineno),
                    "visibility": "public",
                    "documentation": ast.get_docstring(node),
                })

        return {
            "package_name": None,
            "imports": imports,
            "symbols": symbols,
            "dependencies": dependencies,
        }

