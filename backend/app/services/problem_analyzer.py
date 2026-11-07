"""
CodeMate AI — Problem Analyzer Service
Orchestrates problem comprehension, constraint evaluation, and pedagogical explanations.
"""

from pathlib import Path
from typing import Optional
from fastapi import HTTPException, status
from app.ai.provider import AIProvider
from app.ai.provider_manager import ProviderManager
from app.ai.openrouter_provider import OpenRouterProvider
from app.core.config import settings
from app.core.security import sanitize_untrusted_text
from app.schemas.problem import ProblemRequest
from app.schemas.analysis import ProblemAnalysis, ProblemExplanation
from app.services.constraint_analyzer import ConstraintAnalyzer
from app.services.algorithm_planner import AlgorithmPlanner
from app.core.logging import logger

PROMPTS_DIR = Path(__file__).resolve().parent.parent / "ai" / "prompts"


def load_prompt_template(filename: str, fallback: str) -> str:
    path = PROMPTS_DIR / filename
    if path.exists():
        try:
            return path.read_text(encoding="utf-8")
        except Exception as e:
            logger.warning(f"Could not read prompt file {path}: {e}")
    return fallback


class ProblemAnalyzerService:
    """
    Coordinates problem analysis and student-friendly explanation generation.
    """

    @classmethod
    async def analyze_problem(
        cls, problem: ProblemRequest, provider: Optional[AIProvider] = None
    ) -> ProblemAnalysis:
        if provider is None:
            provider = ProviderManager.get_provider()

        # Sanitize untrusted input fields to neutralize prompt injection
        safe_title = sanitize_untrusted_text(problem.title, max_chars=200)
        safe_statement = sanitize_untrusted_text(problem.problem_statement, max_chars=20000)
        safe_constraints = sanitize_untrusted_text(problem.constraints or "Not explicitly specified", max_chars=5000)
        safe_input_fmt = sanitize_untrusted_text(problem.input_format or "Not specified", max_chars=5000)
        safe_output_fmt = sanitize_untrusted_text(problem.output_format or "Not specified", max_chars=5000)

        # Pre-compute computational feasibility bounds
        budget = ConstraintAnalyzer.evaluate_constraints(safe_constraints)
        plan = AlgorithmPlanner.plan_algorithm(safe_statement, safe_constraints)

        system_prompt = load_prompt_template(
            "analyze.txt",
            fallback="You are a competitive programming expert. Analyze the problem and return a structured JSON response.",
        )

        user_prompt = (
            f"Analyze this competitive programming problem:\n\n"
            f"TITLE: {safe_title}\n"
            f"PLATFORM: {problem.platform or 'CodeChef'}\n"
            f"TARGET LANGUAGE: {problem.selected_language}\n\n"
            f"PROBLEM STATEMENT:\n{safe_statement}\n\n"
            f"INPUT FORMAT:\n{safe_input_fmt}\n\n"
            f"OUTPUT FORMAT:\n{safe_output_fmt}\n\n"
            f"CONSTRAINTS:\n{safe_constraints}\n\n"
            f"PRECOMPUTED BUDGET GUIDELINES:\n"
            f"- Recommended Feasible Complexity: {budget['recommended_complexity']}\n"
            f"- Rationale: {budget['rationale']}\n"
            f"- Candidate Algorithm Families: {', '.join(plan['candidate_families'])}\n\n"
            f"Provide your complete analysis in pure JSON matching the ProblemAnalysis schema."
        )

        try:
            analysis = await provider.generate_structured(
                prompt=user_prompt,
                response_schema=ProblemAnalysis,
                system_prompt=system_prompt,
            )
            return analysis
        except Exception as e:
            logger.warning(f"Primary AI Provider failed for analysis ({e}). Engaging fallback...")
            from app.core.config import settings
            if settings.OPENROUTER_API_KEY and not settings.OPENROUTER_API_KEY.startswith("your_"):
                try:
                    from app.ai.openrouter_provider import OpenRouterProvider
                    op = OpenRouterProvider(model_name=settings.OPENROUTER_MODEL or "meta-llama/llama-3.3-70b-instruct")
                    return await op.generate_structured(
                        prompt=user_prompt,
                        response_schema=ProblemAnalysis,
                        system_prompt=system_prompt,
                    )
                except Exception as op_err:
                    logger.warning(f"OpenRouter analysis fallback failed: {op_err}")

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="All configured AI providers failed to analyze the problem. Please verify network and API key status."
            )

    @classmethod
    async def explain_problem(
        cls, problem: ProblemRequest, provider: Optional[AIProvider] = None
    ) -> ProblemExplanation:
        if provider is None:
            provider = ProviderManager.get_provider()

        safe_title = sanitize_untrusted_text(problem.title, max_chars=200)
        safe_statement = sanitize_untrusted_text(problem.problem_statement, max_chars=20000)
        examples_text = ""
        for i, eg in enumerate(problem.examples, 1):
            examples_text += f"Example {i}:\nInput: {eg.input}\nOutput: {eg.output}\n"

        system_prompt = load_prompt_template(
            "explain.txt",
            fallback="You are a computer science educator. Explain the problem simply and output structured JSON.",
        )

        user_prompt = (
            f"Explain this coding problem to a student in simple, clear terms:\n\n"
            f"PROBLEM TITLE: {safe_title}\n\n"
            f"PROBLEM STATEMENT:\n{safe_statement}\n\n"
            f"INPUT FORMAT: {problem.input_format or 'Standard input'}\n"
            f"OUTPUT FORMAT: {problem.output_format or 'Standard output'}\n\n"
            f"SAMPLE EXAMPLES:\n{examples_text or 'None supplied'}\n\n"
            f"Output pure JSON matching the ProblemExplanation schema."
        )

        try:
            explanation = await provider.generate_structured(
                prompt=user_prompt,
                response_schema=ProblemExplanation,
                system_prompt=system_prompt,
            )
            return explanation
        except Exception as e:
            logger.warning(f"Primary AI Provider failed for explanation ({e}). Engaging fallback...")
            from app.core.config import settings
            if settings.OPENROUTER_API_KEY and not settings.OPENROUTER_API_KEY.startswith("your_"):
                try:
                    from app.ai.openrouter_provider import OpenRouterProvider
                    op = OpenRouterProvider(model_name=settings.OPENROUTER_MODEL or "meta-llama/llama-3.3-70b-instruct")
                    return await op.generate_structured(
                        prompt=user_prompt,
                        response_schema=ProblemExplanation,
                        system_prompt=system_prompt,
                    )
                except Exception as op_err:
                    logger.warning(f"OpenRouter explanation fallback failed: {op_err}")

            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="All configured AI providers failed to generate an explanation. Please verify network and API key status."
            )

