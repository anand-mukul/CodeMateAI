"""
CodeMate AI — Robust JSON Response Parser & Model Deserializer
Extracts, repairs, validates, and deserializes JSON from LLM outputs into Pydantic models.
Includes advanced truncation recovery, state-machine JSON repair, and diagnostics.
"""

import json
import re
from typing import Any, Dict, Optional, Type, TypeVar
from pydantic import BaseModel, ValidationError
from app.core.logging import logger

T = TypeVar("T", bound=BaseModel)


class ResponseParsingError(Exception):
    """Raised when an LLM response cannot be parsed into the expected JSON structure."""
    def __init__(
        self,
        message: str,
        is_truncated: bool = False,
        raw_preview: Optional[str] = None,
        error_category: str = "MALFORMED_JSON",
        missing_fields: Optional[List[str]] = None,
    ):
        super().__init__(message)
        self.is_truncated = is_truncated
        self.raw_preview = raw_preview
        self.error_category = error_category
        self.missing_fields = missing_fields or []

    def to_diagnostic_dict(self) -> Dict[str, Any]:
        return {
            "error_category": self.error_category,
            "is_truncated": self.is_truncated,
            "message": str(self),
            "missing_fields": self.missing_fields,
            "raw_preview": self.raw_preview,
        }


def detect_truncation(text: str) -> bool:
    """
    Detects whether an LLM output appears to be abruptly cut off due to token limits.
    """
    if not text:
        return False
    trimmed = text.strip()
    # Unterminated string literal or open brace/bracket at the end
    if trimmed.endswith("\\") or trimmed.endswith('"') is False and ('"' in trimmed):
        # Count non-escaped double quotes
        quotes = len(re.findall(r'(?<!\\)"', trimmed))
        if quotes % 2 != 0:
            return True

    # Count braces and brackets
    open_braces = trimmed.count("{") - trimmed.count("}")
    open_brackets = trimmed.count("[") - trimmed.count("]")
    if open_braces > 0 or open_brackets > 0:
        return True

    return False


def repair_json_string(text: str) -> str:
    """
    State-machine based JSON repair for LLM outputs:
    1. Closes unterminated string literals.
    2. Strips invalid trailing commas before closing braces/brackets.
    3. Balances and closes unclosed curly braces and square brackets in correct order.
    """
    if not text or not text.strip():
        return text

    s = text.strip()

    in_string = False
    escape = False
    stack = []

    for ch in s:
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_string = False
        else:
            if ch == '"':
                in_string = True
            elif ch in ("{", "["):
                stack.append("}" if ch == "{" else "]")
            elif ch in ("}", "]"):
                if stack and stack[-1] == ch:
                    stack.pop()

    # If truncated inside a string literal, close it
    if in_string:
        s += '"'

    # Strip trailing commas
    s = re.sub(r",\s*$", "", s)

    # Balance unclosed brackets/braces in reverse order
    while stack:
        closing = stack.pop()
        s = re.sub(r",\s*$", "", s)
        s += closing

    return s


def extract_json_string(raw_text: str) -> str:
    """
    Strips markdown code fences and isolates JSON payload from raw LLM output.
    Safely handles None and empty inputs.
    """
    if raw_text is None:
        raise ResponseParsingError("Empty or None response received from AI model.")
    text = str(raw_text).strip()
    if not text:
        raise ResponseParsingError("Empty response received from AI model.")

    # Case 1: Markdown code block ```json ... ``` or ``` ... ```
    code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
    if code_block_match:
        return code_block_match.group(1).strip()

    # Case 2: Raw JSON starting with { and ending with }
    if text.startswith("{") and text.endswith("}"):
        return text

    # Case 3: Embedded JSON inside surrounding chatter
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        return text[first_brace : last_brace + 1].strip()

    # Case 4: Truncated JSON starting with { but no closing }
    if first_brace != -1 and last_brace <= first_brace:
        return text[first_brace:].strip()

    return text


def parse_structured_response(
    raw_text: str,
    schema: Type[T],
    finish_reason: Optional[str] = None,
) -> T:
    """
    Parses a raw LLM output string into a validated Pydantic model with repair fallback.
    """
    if raw_text is None or not str(raw_text).strip():
        raise ResponseParsingError(
            "Empty response received from AI model.",
            is_truncated=False,
            error_category="EMPTY_RESPONSE",
        )

    json_str = extract_json_string(raw_text)
    is_token_capped = finish_reason in ("length", "MAX_TOKENS")
    is_truncated = is_token_capped or detect_truncation(json_str)

    data = None
    # Attempt 1: Direct JSON parse
    try:
        data = json.loads(json_str, strict=False)
    except json.JSONDecodeError:
        pass

    # Attempt 2: Clean unprintable control characters
    if data is None:
        try:
            cleaned = re.sub(
                r"[\x00-\x1f\x7f-\x9f]",
                lambda m: "\n" if m.group(0) == "\n" else ("\t" if m.group(0) == "\t" else ""),
                json_str,
            )
            data = json.loads(cleaned, strict=False)
        except Exception:
            pass

    # Attempt 3: State-machine repair for truncated or unclosed brackets/strings
    if data is None:
        try:
            repaired = repair_json_string(json_str)
            data = json.loads(repaired, strict=False)
            logger.info("Successfully repaired truncated/unclosed JSON response from LLM.")
        except Exception as repair_err:
            logger.warning(f"JSON repair attempt failed: {repair_err}")

    if data is None:
        preview = (raw_text[:120] + "...") if len(raw_text) > 120 else raw_text
        trunc_msg = " (Response truncated by token limit)" if is_truncated else ""
        category = "MAX_TOKENS_TERMINATION" if is_token_capped else ("TRUNCATED_RESPONSE" if is_truncated else "MALFORMED_JSON")
        logger.error(f"Failed to decode JSON from LLM output{trunc_msg}. Preview: {preview}")
        raise ResponseParsingError(
            f"The AI model returned non-JSON text that could not be parsed{trunc_msg}.",
            is_truncated=is_truncated,
            raw_preview=preview,
            error_category=category,
        )

    if not isinstance(data, dict):
        raise ResponseParsingError(
            f"Expected a JSON object (dict), but received {type(data).__name__}",
            is_truncated=is_truncated,
            error_category="MALFORMED_JSON",
        )

    try:
        return schema.model_validate(data)
    except ValidationError as val_err:
        logger.error(f"Pydantic schema validation error on parsed LLM JSON: {val_err}")
        first_err = val_err.errors()[0]
        field = " -> ".join(str(loc) for loc in first_err.get("loc", []))
        msg = first_err.get("msg", "Invalid field structure")
        missing = [
            " -> ".join(str(loc) for loc in err.get("loc", []))
            for err in val_err.errors()
            if err.get("type") == "missing"
        ]
        category = "MAX_TOKENS_TERMINATION" if is_token_capped else ("TRUNCATED_RESPONSE" if is_truncated else "SCHEMA_VALIDATION_ERROR")
        raise ResponseParsingError(
            f"The AI response did not match the expected schema for field '{field}': {msg}",
            is_truncated=is_truncated,
            raw_preview=(raw_text[:120] + "...") if len(raw_text) > 120 else raw_text,
            error_category=category,
            missing_fields=missing,
        ) from val_err


