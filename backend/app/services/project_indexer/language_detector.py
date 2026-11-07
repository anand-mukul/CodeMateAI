"""
CodeMate AI — Phase 7 Language & Framework Detector
Detects programming languages, build systems, and framework conventions (Spring Boot, FastAPI, etc.).
"""

import os
from typing import Dict, List, Optional, Tuple


EXTENSION_LANGUAGE_MAP: Dict[str, str] = {
    ".java": "java",
    ".py": "python",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".c": "c",
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".h": "c",
    ".hpp": "cpp",
    ".go": "go",
    ".rs": "rust",
    ".kt": "kotlin",
    ".scala": "scala",
    ".xml": "xml",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".properties": "properties",
    ".sql": "sql",
    ".md": "markdown",
    ".gradle": "groovy",
}


class LanguageDetector:
    """Infers programming language, framework conventions, and test file designations."""

    @staticmethod
    def detect_language(file_path: str) -> str:
        """Returns normalized language name from file extension."""
        _, ext = os.path.splitext(file_path.lower())
        return EXTENSION_LANGUAGE_MAP.get(ext, "text")

    @staticmethod
    def is_test_file(file_path: str) -> bool:
        """Identifies if a file is an automated test based on directory and naming conventions."""
        norm = file_path.replace("\\", "/").lower()
        filename = os.path.basename(norm)

        # Directory conventions
        if "/test/" in norm or "/tests/" in norm or "/__tests__/" in norm or "src/test/" in norm:
            return True

        # Naming conventions
        if (
            filename.endswith("test.java")
            or filename.endswith("tests.java")
            or filename.endswith("testcase.java")
            or filename.startswith("test_")
            or filename.endswith("_test.py")
            or filename.endswith(".test.ts")
            or filename.endswith(".spec.ts")
            or filename.endswith(".test.js")
            or filename.endswith(".spec.js")
        ):
            return True

        return False

    @staticmethod
    def detect_project_framework_and_build_tool(file_paths: List[str]) -> Tuple[str, str, str]:
        """
        Inspects the list of file paths in the project to detect:
        Returns:
            Tuple of (primary_language, framework, build_tool)
        """
        norm_paths = [p.replace("\\", "/").lower() for p in file_paths]
        has_pom = any(p.endswith("pom.xml") for p in norm_paths)
        has_gradle = any(p.endswith("build.gradle") or p.endswith("build.gradle.kts") for p in norm_paths)
        has_java = any(p.endswith(".java") for p in norm_paths)
        has_pyproject = any(p.endswith("pyproject.toml") or p.endswith("requirements.txt") or p.endswith("setup.py") for p in norm_paths)
        has_package_json = any(p.endswith("package.json") for p in norm_paths)

        # 1. Spring Boot Detection
        if (has_pom or has_gradle) and has_java:
            build_tool = "maven" if has_pom else "gradle"
            return "java", "spring-boot", build_tool

        # 2. Python / FastAPI / Flask
        if has_pyproject or any(p.endswith(".py") for p in norm_paths):
            return "python", "fastapi", "pip"

        # 3. Node / React / TypeScript
        if has_package_json:
            return "typescript", "react", "npm"

        # Fallback
        if has_java:
            return "java", "generic-java", "manual"

        return "generic", "generic", "unknown"

