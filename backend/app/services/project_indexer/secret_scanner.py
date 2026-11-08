"""
CodeMate AI — Phase 7 Secret Scanner & Redaction Engine
Detects and redacts sensitive credentials, tokens, private keys, and connection strings
before project context is stored or transmitted to external AI providers.
"""

import re
from typing import Dict, List, Tuple


# Regex patterns for common sensitive credentials
SECRET_PATTERNS: List[Tuple[str, re.Pattern]] = [
    # Private Keys
    ("PRIVATE_KEY", re.compile(r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]+?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----")),
    
    # Generic API Keys & Secrets in properties/json
    ("ASSIGNED_SECRET", re.compile(r"(?i)(?:api[_-]?key|secret|password|passwd|token|auth_token)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-\.\$\!\@\#\%\^\&\*]{8,128})['\"]?")),
    
    # Google / Gemini API Keys (AIza or newer AQ. prefixes)
    ("GEMINI_API_KEY", re.compile(r"(?:AIza[0-9A-Za-z\-_]{30,45}|AQ\.[0-9A-Za-z\-_]{30,70})")),
    
    # OpenAI & DeepSeek API Keys
    ("AI_API_KEY", re.compile(r"\b(?:sk-[a-zA-Z0-9_\-]{20,64}|sk-or-v1-[0-9a-fA-F]{64})\b")),
    
    # Resend API Key
    ("RESEND_API_KEY", re.compile(r"\bre_[0-9A-Za-z_]{20,64}\b")),
    
    # Upstash Redis Token
    ("UPSTASH_REDIS_TOKEN", re.compile(r"\bgQ[0-9A-Za-z]{30,80}\b")),
    
    # Razorpay Test / Live Keys
    ("RAZORPAY_KEY", re.compile(r"rzp_(?:test|live)_[0-9a-zA-Z]{14}")),
    
    # AWS Access Key ID
    ("AWS_ACCESS_KEY", re.compile(r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}")),
    
    # GitHub Personal Access Tokens
    ("GITHUB_TOKEN", re.compile(r"gh[pousr]_[0-9a-zA-Z]{36}")),
    
    # Database Connection Strings with Passwords
    ("DATABASE_URI_PASSWORD", re.compile(r"(?i)(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^:\/\s]+:([^@\/\s]+)@")),
    
    # JWT Tokens
    ("JWT_TOKEN", re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}")),
    
    # Slack / Discord Bot Tokens
    ("SLACK_TOKEN", re.compile(r"xox[baprs]-[0-9a-zA-Z]{10,48}")),
]


class SecretScanner:
    """Detects and redacts confidential credentials from source files."""

    @classmethod
    def scan_and_redact(cls, content: str) -> Tuple[str, List[Dict[str, str]]]:
        """
        Scans code content and redacts any matching secrets.
        Returns:
            Tuple of (redacted_content, list_of_detected_secrets)
        """
        redacted_content = content
        findings: List[Dict[str, str]] = []

        for secret_type, pattern in SECRET_PATTERNS:
            matches = list(pattern.finditer(redacted_content))
            for match in reversed(matches):
                full_match = match.group(0)
                # If pattern has a specific capturing group for the secret part (e.g. ASSIGNED_SECRET, DB password)
                if match.groups():
                    secret_val = match.group(1)
                    if len(secret_val) >= 6 and not cls._is_placeholder(secret_val):
                        # Replace only the secret value part
                        start = match.start(1)
                        end = match.end(1)
                        replacement = f"[REDACTED_{secret_type}]"
                        redacted_content = redacted_content[:start] + replacement + redacted_content[end:]
                        findings.append({
                            "type": secret_type,
                            "preview": f"*** (length={len(secret_val)})",
                        })
                else:
                    if not cls._is_placeholder(full_match):
                        start = match.start(0)
                        end = match.end(0)
                        replacement = f"[REDACTED_{secret_type}]"
                        redacted_content = redacted_content[:start] + replacement + redacted_content[end:]
                        findings.append({
                            "type": secret_type,
                            "preview": f"*** (length={len(full_match)})",
                        })

        return redacted_content, findings

    @staticmethod
    def _is_placeholder(val: str) -> bool:
        """Checks if a matched string is just an example placeholder rather than an actual secret."""
        val_lower = val.lower().strip()
        exact_placeholders = {
            "your_api_key",
            "your_secret",
            "dummy",
            "placeholder",
            "password",
            "example",
            "test_secret",
            "changeme",
            "secret_key",
            "none",
            "null",
            "localhost",
        }
        return val_lower in exact_placeholders or val_lower.startswith("your_") or len(val) < 6

