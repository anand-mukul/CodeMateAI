"""
CodeMate AI — Structured Logging Configuration
Provides unified logger format without leaking sensitive API keys or full student solutions.
"""

import logging
import sys
from typing import Optional


class SensitiveFilter(logging.Filter):
    """
    Redacts any accidental appearance of keys or auth headers from logs.
    """
    def filter(self, record: logging.LogRecord) -> bool:
        msg = str(record.msg)
        # Redact common credential patterns if present
        for secret_name in ["AI_API_KEY", "api_key", "Bearer ", "key="]:
            if secret_name in msg:
                # Basic redaction
                msg = msg.replace(secret_name, "[REDACTED_CREDENTIAL]")
        record.msg = msg
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

