"""
CodeMate AI — Robust JSON Response Parser & Model Deserializer
Extracts, repairs, and deserializes JSON from LLM outputs into Pydantic models.
"""

import json
import re
from typing import Any, Dict, Type, TypeVar
from pydantic import BaseModel, ValidationError
from app.core.logging import logger

T = TypeVar("T", bound=BaseModel)


class ResponseParsingError(Exception):
    """Raised when an LLM response cannot be parsed into the expected JSON structure."""
    pass


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

    return text


def parse_structured_response(raw_text: str, schema: Type[T]) -> T:
    """
    Parses a raw LLM output string into a validated Pydantic model.
    """
    json_str = extract_json_string(raw_text)

    data = None
    try:
        data = json.loads(json_str, strict=False)
    except json.JSONDecodeError:
        try:
            cleaned = re.sub(r'[\x00-\x1f\x7f-\x9f]', lambda m: '\n' if m.group(0) == '\n' else ('\t' if m.group(0) == '\t' else ''), json_str)
            data = json.loads(cleaned, strict=False)
        except Exception:
            pass

    if data is None:
        try:
            data = json.loads(json_str)
        except json.JSONDecodeError as json_err:
            logger.error(f"Failed to decode JSON from LLM output: {json_err}. Raw preview: {raw_text[:200]}")
            raise ResponseParsingError(
                f"The AI model returned non-JSON text that could not be parsed: {str(json_err)}"
            ) from json_err

    if not isinstance(data, dict):
        raise ResponseParsingError(f"Expected a JSON object (dict), but received {type(data).__name__}")

    try:
        return schema.model_validate(data)
    except ValidationError as val_err:
        logger.error(f"Pydantic schema validation error on parsed LLM JSON: {val_err}")
        raise ResponseParsingError(
            f"The AI response did not match the expected schema: {val_err.errors()[0]['msg']}"
        ) from val_err

