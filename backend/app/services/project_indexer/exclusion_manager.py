"""
CodeMate AI — Phase 7 Exclusion Manager
Enforces repository exclusion rules (.gitignore, .env, build artifacts, binaries, and credentials).
"""

import fnmatch
import os
from typing import List, Set


DEFAULT_IGNORED_DIRS: Set[str] = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "target",
    ".gradle",
    ".idea",
    ".vscode",
    "__pycache__",
    ".venv",
    "venv",
    "bin",
    "out",
    ".mvn",
    ".next",
    "coverage",
}

DEFAULT_IGNORED_EXTENSIONS: Set[str] = {
    ".class",
    ".jar",
    ".war",
    ".ear",
    ".pyc",
    ".pyo",
    ".pyd",
    ".so",
    ".dll",
    ".exe",
    ".obj",
    ".o",
    ".a",
    ".lib",
    ".zip",
    ".tar",
    ".gz",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".svg",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".pdf",
    ".mp3",
    ".mp4",
    ".wav",
    ".avi",
    ".mov",
    ".log",
    ".tmp",
    ".swp",
    ".ds_store",
}

DEFAULT_IGNORED_FILENAMES: Set[str] = {
    ".env",
    ".env.local",
    ".env.development",
    ".env.test",
    ".env.production",
    ".ds_store",
    "thumbs.db",
    "npm-debug.log",
    "yarn-error.log",
}

MAX_FILE_SIZE_BYTES = 512 * 1024  # 512 KB per file


class ExclusionManager:
    """Manages file exclusion, .gitignore evaluation, and binary file filtering."""

    def __init__(self, custom_ignored_patterns: List[str] = None):
        self.custom_patterns: List[str] = custom_ignored_patterns or []

    def should_ignore_file(self, relative_path: str, file_size: int = 0) -> bool:
        """
        Determines whether a file should be ignored from project indexing.
        """
        # 1. Normalize path
        norm_path = relative_path.replace("\\", "/").strip("/")
        parts = norm_path.split("/")
        filename = parts[-1].lower()
        _, ext = os.path.splitext(filename)

        # 2. Check directory exclusions
        for part in parts[:-1]:
            if part.lower() in DEFAULT_IGNORED_DIRS:
                return True

        # 3. Check filename exclusions
        if filename in DEFAULT_IGNORED_FILENAMES or filename.startswith(".env."):
            return True

        # 4. Check extension exclusions
        if ext.lower() in DEFAULT_IGNORED_EXTENSIONS:
            return True

        # 5. Check sensitive credential patterns in filename
        if any(marker in filename for marker in ["private_key", "id_rsa", "credentials.json", "keystore.jks"]):
            return True

        # 6. Check file size limit
        if file_size > MAX_FILE_SIZE_BYTES:
            return True

        # 7. Check custom patterns (gitignore style)
        for pattern in self.custom_patterns:
            pattern = pattern.strip().replace("\\", "/")
            if not pattern or pattern.startswith("#"):
                continue
            if fnmatch.fnmatch(norm_path, pattern) or fnmatch.fnmatch(filename, pattern):
                return True

        return False

    def is_binary(self, content_bytes: bytes) -> bool:
        """Detects if content is binary using null-byte and high-order character inspection."""
        if not content_bytes:
            return False
        # Null bytes indicate binary in 99.9% of cases
        if b"\x00" in content_bytes[:4096]:
            return True
        # Check ratio of non-text bytes
        text_characters = bytes(range(32, 127)) + b"\n\r\t\b"
        sample = content_bytes[:1024]
        non_text = sum(1 for byte in sample if byte not in text_characters)
        return (non_text / len(sample)) > 0.30

