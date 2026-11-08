"""
CodeMate AI — Structured Logging Configuration
Provides unified logger format without leaking sensitive API keys or full student solutions.
"""

import logging
import sys
from typing import Optional


import logging
import sys
import re
from typing import Optional

# Compiled patterns to strip sensitive credentials from logs
_URI_PASSWORD_PATTERN = re.compile(r"(://[^:\s@]+:)([^@\s]+)(@)", re.IGNORECASE)

_PREFIX_SECRET_PATTERNS = [
    re.compile(r"(Bearer\s+)[A-Za-z0-9_\-\.\$\!\@\#\%\^\&\*]{8,}", re.IGNORECASE),
    re.compile(r"(api[_-]?key\s*[:=]\s*['\"]?)[A-Za-z0-9_\-\.]{8,}['\"]?", re.IGNORECASE),
    re.compile(r"(password\s*[:=]\s*['\"]?)[^\s'\",]{4,}['\"]?", re.IGNORECASE),
]

_STANDALONE_SECRET_PATTERNS = [
    re.compile(r"\bsk-[a-zA-Z0-9_\-]{20,}\b"),
    re.compile(r"\bAQ\.[A-Za-z0-9_\-]{30,}\b"),
    re.compile(r"\bAIza[A-Za-z0-9_\-]{30,}\b"),
    re.compile(r"\bre_[A-Za-z0-9_\-]{20,}\b"),
    re.compile(r"\brzp_(?:test|live)_[a-zA-Z0-9_\-]{14,}\b"),
    re.compile(r"\bgQ[A-Za-z0-9_\-]{30,}\b"),
]


def redact_secrets_from_text(text: str) -> str:
    """Replaces any matched credential substring with a safe redaction token."""
    if not text:
        return text
    clean = text
    clean = _URI_PASSWORD_PATTERN.sub(r"\1[REDACTED_PASSWORD]\3", clean)
    for pat in _PREFIX_SECRET_PATTERNS:
        clean = pat.sub(r"\1[REDACTED_SECRET]", clean)
    for pat in _STANDALONE_SECRET_PATTERNS:
        clean = pat.sub("[REDACTED_SECRET]", clean)
    return clean


class SensitiveFilter(logging.Filter):
    """
    Redacts any appearance of keys, tokens, or auth headers from logs and exceptions.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_secrets_from_text(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = {k: redact_secrets_from_text(str(v)) for k, v in record.args.items()}
            elif isinstance(record.args, tuple):
                record.args = tuple(redact_secrets_from_text(str(a)) for a in record.args)
        if record.exc_text:
            record.exc_text = redact_secrets_from_text(record.exc_text)
        return True


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    level = getattr(logging, log_level.upper(), logging.INFO)
    logger = logging.getLogger("codemate")
    logger.setLevel(level)

    # Avoid duplicate handlers if re-initialized
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [CodeMate AI] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        handler.addFilter(SensitiveFilter())
        logger.addHandler(handler)

    return logger


logger = setup_logging()

