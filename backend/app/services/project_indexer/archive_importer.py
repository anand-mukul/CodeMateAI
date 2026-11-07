"""
CodeMate AI — Phase 7 Secure Archive Importer
Extracts and validates uploaded ZIP project archives with protections against
ZIP bombs, path traversal, symlink attacks, and oversized payloads.
"""

import hashlib
import io
import os
import zipfile
from typing import Dict, List, Optional, Tuple

from app.services.project_indexer.exclusion_manager import ExclusionManager
from app.services.project_indexer.language_detector import LanguageDetector
from app.services.project_indexer.secret_scanner import SecretScanner


MAX_COMPRESSED_BYTES = 50 * 1024 * 1024   # 50 MB
MAX_UNCOMPRESSED_BYTES = 250 * 1024 * 1024 # 250 MB
MAX_FILE_COUNT = 2000
MAX_RATIO = 100  # ZIP bomb threshold ratio


class ArchiveImportError(Exception):
    """Raised when an uploaded archive violates security boundaries."""
    pass


class ArchiveImporter:
    """Safely inspects and extracts ZIP project files in memory."""

    @classmethod
    def import_zip_buffer(cls, zip_bytes: bytes) -> Tuple[List[Dict], Dict[str, str]]:
        """
        Validates and extracts project files from a raw ZIP buffer in-memory.
        Returns:
            Tuple of:
            - list of valid file dictionaries:
              { file_path, file_name, file_extension, language, content, content_hash, size_bytes, line_count, is_test }
            - project metadata { name, framework, build_tool, primary_language }
        """
        if len(zip_bytes) > MAX_COMPRESSED_BYTES:
            raise ArchiveImportError(f"Compressed archive size ({len(zip_bytes)} bytes) exceeds 50MB limit.")

        try:
            zip_file = zipfile.ZipFile(io.BytesIO(zip_bytes))
        except zipfile.BadZipFile as e:
            raise ArchiveImportError(f"Invalid or corrupted ZIP archive: {str(e)}")

        infolist = zip_file.infolist()
        if len(infolist) > MAX_FILE_COUNT:
            raise ArchiveImportError(f"Archive file count ({len(infolist)}) exceeds maximum limit of {MAX_FILE_COUNT}.")

        total_extracted_size = sum(info.file_size for info in infolist)
        if total_extracted_size > MAX_UNCOMPRESSED_BYTES:
            raise ArchiveImportError(f"Uncompressed archive size ({total_extracted_size} bytes) exceeds 250MB limit.")

        # ZIP bomb compression ratio check
        if len(zip_bytes) > 0 and (total_extracted_size / len(zip_bytes)) > MAX_RATIO:
            raise ArchiveImportError("Suspicious compression ratio detected (potential ZIP bomb). Extraction aborted.")

        exclusion_mgr = ExclusionManager()
        valid_files: List[Dict] = []
        raw_paths: List[str] = []

        # Find common root prefix if the archive has a single top-level directory (e.g. project-master/)
        common_prefix = cls._detect_common_prefix([info.filename for info in infolist if not info.is_dir()])

        for info in infolist:
            if info.is_dir():
                continue

            # Symlink check (Unix mode 0120000)
            if (info.external_attr >> 16) & 0o120000 == 0o120000:
                continue

            # Path traversal & dangerous path check
            raw_name = info.filename.replace("\\", "/")
            if ".." in raw_name or raw_name.startswith("/") or ":" in raw_name or "\0" in raw_name:
                raise ArchiveImportError(f"Malicious or illegal path traversal detected in archive: '{info.filename}'")

            # Strip common wrapper root folder if present
            rel_path = raw_name
            if common_prefix and rel_path.startswith(common_prefix):
                rel_path = rel_path[len(common_prefix):]
            rel_path = rel_path.strip("/")

            if not rel_path:
                continue

            raw_paths.append(rel_path)

            # Exclusion checks
            if exclusion_mgr.should_ignore_file(rel_path, info.file_size):
                continue

            try:
                file_bytes = zip_file.read(info)
            except Exception:
                continue

            if exclusion_mgr.is_binary(file_bytes):
                continue

            try:
                content = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    content = file_bytes.decode("latin-1")
                except Exception:
                    continue

            # Scan and redact any confidential tokens or credentials
            sanitized_content, _ = SecretScanner.scan_and_redact(content)

            content_hash = hashlib.sha256(sanitized_content.encode("utf-8")).hexdigest()
            filename = os.path.basename(rel_path)
            _, ext = os.path.splitext(filename)
            lang = LanguageDetector.detect_language(rel_path)
            is_test = LanguageDetector.is_test_file(rel_path)
            line_count = len(sanitized_content.splitlines())

            valid_files.append({
                "file_path": rel_path,
                "file_name": filename,
                "file_extension": ext,
                "language": lang,
                "content": sanitized_content,
                "content_hash": content_hash,
                "size_bytes": len(sanitized_content.encode("utf-8")),
                "line_count": line_count,
                "is_test": is_test,
            })

        # Detect project framework and primary language
        primary_lang, framework, build_tool = LanguageDetector.detect_project_framework_and_build_tool(raw_paths)
        project_name = common_prefix.strip("/") if common_prefix else "Project"

        return valid_files, {
            "name": project_name or "Imported Project",
            "framework": framework,
            "build_tool": build_tool,
            "primary_language": primary_lang,
        }

    @staticmethod
    def _detect_common_prefix(paths: List[str]) -> Optional[str]:
        """Detects if all files share a common single root folder."""
        if not paths:
            return None
        parts = [p.replace("\\", "/").strip("/").split("/") for p in paths if p.strip("/")]
        if not parts:
            return None
        first_dir = parts[0][0]
        if len(parts[0]) > 1 and all(p[0] == first_dir for p in parts):
            return first_dir + "/"
        return None

