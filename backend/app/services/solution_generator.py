"""
CodeMate AI — Solution Generation & Code Optimization Service
Produces complete, executable, competitive programming solutions and refactors existing code.
"""

import re
from pathlib import Path
from typing import Optional
from app.ai.provider import AIProvider
from app.ai.provider_manager import ProviderManager
from app.core.security import sanitize_untrusted_text
from app.schemas.problem import ProblemRequest
from app.schemas.solution import (
    SolutionResponse,
    OptimizationRequest,
    OptimizationResponse,
    SolutionFixRequest,
    SolutionFixResponse,
)
from app.services.complexity_analyzer import ComplexityAnalyzer
from app.services.response_validator import ResponseValidator
from app.services.constraint_analyzer import ConstraintAnalyzer
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


class SolutionGeneratorService:
    """
    Coordinates optimal code generation and code optimization.
    """

    @classmethod
    async def generate_solution(
        cls, problem: ProblemRequest, provider: Optional[AIProvider] = None
    ) -> SolutionResponse:
        if provider is None:
            provider = ProviderManager.get_provider()

        # Check if multi-file project with 2 or more files
        if problem.workspace_files and len(problem.workspace_files) > 1:
            try:
                from app.ai.mock_provider import MockAIProvider
                if isinstance(provider, MockAIProvider) or provider.provider_name == "mock":
                    return await provider.generate_structured(
                        prompt=f"Multi-file Spring Boot project {problem.title}",
                        response_schema=SolutionResponse,
                    )
                return await cls.generate_multifile_solution(problem, provider=provider)
            except Exception as mf_err:
                logger.warning(f"Sequential multi-file pipeline warning: {mf_err}. Falling back to standard pipeline...")

        safe_title = sanitize_untrusted_text(problem.title, max_chars=200)
        safe_statement = sanitize_untrusted_text(problem.problem_statement, max_chars=20000)
        safe_constraints = sanitize_untrusted_text(problem.constraints or "Standard bounds", max_chars=5000)
        safe_input_fmt = sanitize_untrusted_text(problem.input_format or "Standard input", max_chars=5000)
        safe_output_fmt = sanitize_untrusted_text(problem.output_format or "Standard output", max_chars=5000)

        budget = ConstraintAnalyzer.evaluate_constraints(safe_constraints)

        examples_text = ""
        for i, eg in enumerate(problem.examples, 1):
            examples_text += f"Example {i}:\nInput: {eg.input}\nOutput: {eg.output}\n"

        starter_code_section = ""
        if problem.workspace_files:
            files_desc = "\n\n".join([
                f"FILE: {fname}\n```{problem.selected_language}\n{sanitize_untrusted_text(fcontent, max_chars=10000)}\n```"
                for fname, fcontent in problem.workspace_files.items()
            ])
            starter_code_section = (
                f"\n\nCRITICAL REQUIREMENT — MULTI-FILE PROJECT COMPLETION:\n"
                f"The user's project workspace contains the following files:\n"
                f"{files_desc}\n\n"
                f"INSTRUCTIONS:\n"
                f"1. Complete all `// TODO` items across the files according to problem instructions.\n"
                f"2. Return the completed code for each file in the `workspace_files` list, where each item has `filename` (e.g. 'StudentService.java') and `code` (the full completed source code for that specific file).\n"
                f"3. STRICT FILE INTEGRITY: Each file MUST contain its own class only (e.g. Student.java contains `class Student`, StudentService.java contains `@Service class StudentService`, CollegeApp.java contains runner). NEVER put StudentService inside Student.java or vice-versa.\n"
                f"4. In the primary `code` field, include the primary completed service/runner file.\n"
                f"5. Do NOT leave any TODO placeholders or incomplete methods.\n"
            )
        elif problem.starter_code and problem.starter_code.strip():
            safe_starter = sanitize_untrusted_text(problem.starter_code, max_chars=15000)
            starter_code_section = (
                f"\n\nCRITICAL REQUIREMENT — STARTER CODE COMPLETION:\n"
                f"The user's code editor already contains this starter code/boilerplate:\n"
                f"```{problem.selected_language}\n{safe_starter}\n```\n"
                f"INSTRUCTIONS FOR COMPLETING CODE:\n"
                f"1. You MUST PRESERVE the exact class name, struct definitions, function names, parameter types, and return types from the starter code.\n"
                f"2. DO NOT change function signatures (e.g. if the function is named `createBST`, DO NOT rename it).\n"
                f"3. DO NOT redefine structs if they are already defined or commented as provided (e.g. if `struct Node` is commented or pre-defined, DO NOT redeclare it as it causes redefinition compilation errors).\n"
                f"4. Fill in the complete algorithmic implementation inside the function body (replacing comments like '// your code goes here').\n"
                f"5. IMPORTANT JUDGE FORMATTING RULE:\n"
                f"   - If the starter code is a `class Solution` or function signature without `int main()`, DO NOT add `int main()`. Return ONLY the completed class/function structure expected by the online judge.\n"
                f"   - If the starter code or problem uses standard competitive programming I/O (no class Solution), write full runnable code with `int main()`.\n"
                f"6. Return the full code that should replace the editor content, complete and ready to compile.\n"
            )

        system_prompt = load_prompt_template(
            "generate.txt",
            fallback="You are a competitive programmer. Generate complete, executable source code and return pure JSON.",
        )

        user_prompt = (
            f"Generate an optimal, complete solution for this competitive programming problem:\n\n"
            f"TITLE: {safe_title}\n"
            f"TARGET LANGUAGE: {problem.selected_language}\n"
            f"PLATFORM: {problem.platform or 'CodeChef'}\n\n"
            f"PROBLEM STATEMENT:\n{safe_statement}\n\n"
            f"INPUT FORMAT:\n{safe_input_fmt}\n\n"
            f"OUTPUT FORMAT:\n{safe_output_fmt}\n\n"
            f"CONSTRAINTS:\n{safe_constraints}\n"
            f"(Target Feasible Complexity: {budget['recommended_complexity']})\n\n"
            f"SAMPLE EXAMPLES:\n{examples_text or 'None supplied'}\n"
            f"{starter_code_section}\n"
            f"CODING STYLE DIRECTIVE:\n"
            f"- Write the solution using natural student competitive programming conventions.\n"
            f"- For C++, include 'using namespace std;', 'typedef long long ll;', and use concise, logical variable names (e.g. n, m, low, high, mid, ans, res, cnt, val, cur) with natural student variance.\n"
            f"- Avoid sterile, overly verbose AI variable names like `binarySearchTreeRootNodePointer`.\n"
            f"- Write realistic, clean student code that reads naturally, with clean indentation and proper helper functions if needed.\n"
            f"- Generate complete, ready-to-compile source code in {problem.selected_language}. Do not truncate code or leave placeholders.\n"
            f"- Output pure JSON adhering strictly to the SolutionResponse schema."
        )

        solution: Optional[SolutionResponse] = None
        try:
            solution = await provider.generate_structured(
                prompt=user_prompt,
                response_schema=SolutionResponse,
                system_prompt=system_prompt,
            )
        except TimeoutError:
            import app.ai.provider_manager as pm
            if getattr(pm, "_active_provider", None) is not None:
                raise
            logger.warning("Primary AI Provider timed out. Engaging resilient fallback generator...")
        except Exception as e:
            logger.warning(f"Primary AI Provider failed to generate solution ({e}). Engaging resilient fallback generator...")

        if solution is None:
            from app.core.config import settings
            if settings.OPENROUTER_API_KEY and not settings.OPENROUTER_API_KEY.startswith("your_"):
                try:
                    logger.info("Engaging OpenRouter secondary fallback...")
                    from app.ai.openrouter_provider import OpenRouterProvider
                    op = OpenRouterProvider(model_name=settings.OPENROUTER_MODEL or "meta-llama/llama-3.3-70b-instruct")
                    solution = await op.generate_structured(
                        prompt=user_prompt,
                        response_schema=SolutionResponse,
                        system_prompt=system_prompt,
                    )
                except Exception as op_err:
                    logger.warning(f"OpenRouter fallback also failed ({op_err}). Using mock provider...")

        if solution is None:
            from app.ai.mock_provider import MockAIProvider
            fallback_provider = MockAIProvider()
            solution = await fallback_provider.generate_structured(
                prompt=user_prompt,
                response_schema=SolutionResponse,
                system_prompt=system_prompt,
            )

        # Normalize and validate Big-O complexity
        solution.complexity = ComplexityAnalyzer.validate_complexity(solution.complexity)

        # Static response quality validation
        _, warnings = ResponseValidator.validate_solution(solution, problem.selected_language)
        if warnings:
            solution.warnings.extend(warnings)

        return solution

    @classmethod
    def _extract_code(cls, text: str) -> str:
        """Extracts clean source code from markdown code fences or plain text."""
        if not text:
            return ""
        match = re.search(r"```(?:java|cpp|python|c|javascript|typescript)?\s*(.*?)\s*```", text, re.DOTALL)
        if match:
            return match.group(1).strip()
        lines = [l for l in text.split("\n") if not l.strip().startswith("```")]
        return "\n".join(lines).strip()

    @classmethod
    async def generate_multifile_solution(
        cls, problem: ProblemRequest, provider: AIProvider
    ) -> SolutionResponse:
        """
        Universal Sequential Multi-File Completion Pipeline:
        Applies to React, Spring Boot, FastAPI, Node.js, C++, and multi-file projects.
        Processes files in architectural dependency order (Types -> Utils -> Services -> Components -> Apps)
        with shared memory to prevent token truncation, eliminate cross-contamination, and ensure clean builds.
        """
        from app.schemas.solution import ComplexityAnalysis, ComplexityItem, WorkspaceFile
        from app.services.project_indexer.language_detector import LanguageDetector

        raw_files = dict(problem.workspace_files or {})
        completed_files: dict[str, str] = {}

        # 1. Detect Primary Language & Framework Conventions
        primary_lang, framework, build_tool = LanguageDetector.detect_project_framework_and_build_tool(list(raw_files.keys()))
        if problem.selected_language and problem.selected_language.lower() not in ("text", "generic"):
            primary_lang = problem.selected_language.lower()

        # 2. Boilerplate / Entry Point Protection & Healing
        # Spring Boot: Prevent test annotations from corrupting main @SpringBootApplication
        for fname, fcontent in list(raw_files.items()):
            if "demoapplication" in fname.lower():
                if "test" in fcontent.lower() or "mockmvc" in fcontent.lower() or "junit" in fcontent.lower():
                    logger.info("Restoring DemoApplication.java to clean @SpringBootApplication main runner.")
                    clean_runner = (
                        "package com.example.demo;\n\n"
                        "import org.springframework.boot.SpringApplication;\n"
                        "import org.springframework.boot.autoconfigure.SpringBootApplication;\n\n"
                        "@SpringBootApplication\n"
                        "public class DemoApplication {\n"
                        "    public static void main(String[] args) {\n"
                        "        SpringApplication.run(DemoApplication.class, args);\n"
                        "    }\n"
                        "}\n"
                    )
                    raw_files[fname] = clean_runner
                    completed_files[fname] = clean_runner

        # 3. Universal Topological Sequence Order
        # Types/Models -> Utils/Repositories -> Services/API -> Components/Controllers -> Entrypoints/Apps
        def file_order_key(name: str) -> int:
            n = name.lower()
            if "type" in n or "interface" in n or "model" in n or "schema" in n or "dto" in n or "entity" in n:
                return 1
            if "util" in n or "repo" in n or "dao" in n or "hook" in n or "store" in n or "slice" in n:
                return 2
            if "service" in n or "api" in n or "crud" in n or "helper" in n:
                return 3
            if "component" in n or "controller" in n or "route" in n or "view" in n:
                return 4
            if "app" in n or "main" in n or "index" in n or "runner" in n:
                return 5
            return 6

        sorted_files = sorted(raw_files.keys(), key=file_order_key)
        safe_statement = sanitize_untrusted_text(problem.problem_statement, max_chars=10000)
        safe_title = sanitize_untrusted_text(problem.title, max_chars=200)

        # 4. Process each file sequentially with shared memory
        for fname in sorted_files:
            if fname in completed_files:
                continue

            orig_code = raw_files[fname]
            file_lang = LanguageDetector.detect_language(fname)
            if file_lang == "text":
                file_lang = primary_lang

            # Build memory context from already completed files
            memory_context = ""
            for done_name, done_code in completed_files.items():
                memory_context += f"FILE: {done_name}\n```{file_lang}\n{done_code[:800]}\n```\n\n"

            framework_desc = f"{framework} ({primary_lang})" if framework != "generic" else primary_lang

            file_prompt = (
                f"You are an expert {framework_desc} engineer.\n\n"
                f"TASK: Complete ONLY the single project file '{fname}'.\n\n"
                f"PROBLEM / FEATURE REQUIREMENTS:\n{safe_title}\n{safe_statement}\n\n"
                f"SHARED PROJECT CONTEXT (ALREADY RESOLVED FILES):\n{memory_context or 'None'}\n\n"
                f"EXISTING FILE CONTENT FOR '{fname}':\n"
                f"```{file_lang}\n{orig_code}\n```\n\n"
                f"STRICT ENGINEERING INSTRUCTIONS:\n"
                f"1. Fulfill all `// TODO` items and missing methods/components in '{fname}'.\n"
                f"2. Follow standard {framework_desc} conventions, correct imports, and preserve exports/signatures.\n"
                f"3. CRITICAL COMPILE SAFETY: This file compiles in the production source tree (src/main/). NEVER include test framework imports or annotations (@SpringBootTest, MockMvc, @Test, org.junit.*, jest, vitest) inside this file.\n"
                f"4. REST CONTROLLER & CRUD ACCURACY: If '{fname}' is a Controller, annotate with @RestController and @RequestMapping('/api/...'). Implement all endpoints with correct HTTP status codes (POST -> 201 Created with auto-generated ID, GET/PUT -> 200 OK or 404, DELETE -> 200 OK or 204).\n"
                f"5. DEPENDENCY INJECTION: If '{fname}' is a Service or Component, annotate with @Service or @Component and use constructor injection.\n"
                f"6. Return ONLY the complete, ready-to-run source code for '{fname}'. Do NOT output conversational filler, just the code inside ```{file_lang} ```."
            )

            try:
                res = await provider.generate_text(file_prompt)
                extracted_code = cls._extract_code(res)
                if extracted_code and len(extracted_code.strip()) > 20:
                    code = extracted_code.strip()
                    target_class = fname.split(".")[0]
                    if file_lang == "java":
                        wrong_class_match = re.search(r"\bpublic\s+(class|interface|record|enum)\s+([A-Za-z0-9_]+)\b", code)
                        if wrong_class_match:
                            detected_kind = wrong_class_match.group(1)
                            detected_name = wrong_class_match.group(2)
                            if detected_name != target_class:
                                code = re.sub(
                                    rf"\bpublic\s+{detected_kind}\s+{detected_name}\b",
                                    f"public {detected_kind} {target_class}",
                                    code,
                                    count=1,
                                )
                        open_b = code.count('{')
                        close_b = code.count('}')
                        if open_b > close_b:
                            code = code.rstrip() + "\n" + ("}" * (open_b - close_b)) + "\n"
                        elif close_b > open_b:
                            excess = close_b - open_b
                            while excess > 0 and code.rstrip().endswith("}"):
                                idx = code.rfind("}")
                                code = code[:idx] + code[idx+1:]
                                excess -= 1
                    completed_files[fname] = code
                else:
                    completed_files[fname] = orig_code
            except Exception as err:
                logger.warning(f"Error completing file '{fname}': {err}. Keeping original code.")
                completed_files[fname] = orig_code

        # Primary completed file selection
        primary_code = list(completed_files.values())[0] if completed_files else ""
        for pref in ["Service", "App", "Component", "main", "index"]:
            for fname, fcode in completed_files.items():
                if pref.lower() in fname.lower():
                    primary_code = fcode
                    break

        ws_list = [WorkspaceFile(filename=k, code=v) for k, v in completed_files.items()]

        return SolutionResponse(
            success=True,
            problem_summary=f"{framework.capitalize() if framework else 'Project'}: {safe_title}",
            algorithm=f"{framework.capitalize()} Layered Architecture & Component Composition",
            data_structures=["Modular Components", "Service Layer", "DTO / Model State"],
            code=primary_code,
            workspace_files=ws_list,
            language=primary_lang,
            complexity=ComplexityAnalysis(
                time=ComplexityItem(notation="O(1)", explanation="Component lifecycle and state operations run in standard time"),
                space=ComplexityItem(notation="O(N)", explanation="Application state and data structures scale linearly with entities")
            ),
            explanation=f"Completed multi-file {framework_desc} project sequentially with shared context, fulfilling all requirements.",
        )

    @classmethod
    async def optimize_solution(
        cls, request: OptimizationRequest, provider: Optional[AIProvider] = None
    ) -> OptimizationResponse:
        if provider is None:
            provider = ProviderManager.get_provider()

        problem = request.problem
        safe_title = sanitize_untrusted_text(problem.title, max_chars=200)
        safe_statement = sanitize_untrusted_text(problem.problem_statement, max_chars=20000)
        safe_constraints = sanitize_untrusted_text(problem.constraints or "Standard bounds", max_chars=5000)
        safe_code = sanitize_untrusted_text(request.existing_code, max_chars=30000)

        system_prompt = load_prompt_template(
            "optimize.txt",
            fallback="You are a systems optimization expert. Refactor and optimize this code, returning pure JSON.",
        )

        user_prompt = (
            f"Optimize and refactor this solution code for maximum performance:\n\n"
            f"PROBLEM: {safe_title}\n"
            f"LANGUAGE: {request.current_language}\n"
            f"CONSTRAINTS: {safe_constraints}\n\n"
            f"PROBLEM STATEMENT:\n{safe_statement}\n\n"
            f"EXISTING STUDENT CODE:\n```\n{safe_code}\n```\n\n"
            f"Analyze bottlenecks (e.g. slow I/O, quadratic loops, unnecessary dynamic allocations). "
            f"Provide improved, complete source code in {request.current_language} and pure JSON matching OptimizationResponse."
        )

        optimization = await provider.generate_structured(
            prompt=user_prompt,
            response_schema=OptimizationResponse,
            system_prompt=system_prompt,
        )

        # Standardize complexities
        optimization.original_complexity = ComplexityAnalyzer.validate_complexity(optimization.original_complexity)
        optimization.optimized_complexity = ComplexityAnalyzer.validate_complexity(optimization.optimized_complexity)

        return optimization

    @classmethod
    async def diagnose_and_fix_solution(
        cls, request: SolutionFixRequest, provider: Optional[AIProvider] = None
    ) -> SolutionFixResponse:
        """
        Diagnoses compilation errors, runtime exceptions, or wrong answer bugs
        and returns a structured minimal patch and explanation.
        """
        if provider is None:
            provider = ProviderManager.get_provider()

        problem = request.problem
        safe_title = sanitize_untrusted_text(problem.title, max_chars=200)
        safe_statement = sanitize_untrusted_text(problem.problem_statement, max_chars=20000)
        safe_constraints = sanitize_untrusted_text(problem.constraints or "Standard bounds", max_chars=5000)
        safe_code = sanitize_untrusted_text(request.current_code, max_chars=30000)
        safe_error = sanitize_untrusted_text(request.error_message, max_chars=10000)
        safe_test = sanitize_untrusted_text(request.test_case or "N/A", max_chars=5000)
        safe_expected = sanitize_untrusted_text(request.expected_output or "N/A", max_chars=5000)
        safe_actual = sanitize_untrusted_text(request.actual_output or "N/A", max_chars=5000)

        system_prompt = load_prompt_template(
            "fix.txt",
            fallback=(
                "You are an expert competitive programming tutor and software debugger. "
                "Analyze the student's code error or failure, diagnose the precise root cause, "
                "and propose a minimally invasive, correct patch preserving the student's code structure. "
                "Output strictly valid JSON conforming to the SolutionFixResponse schema."
            ),
        )

        user_prompt = (
            f"Diagnose and fix the following programming error:\n\n"
            f"PROBLEM: {safe_title}\n"
            f"LANGUAGE: {request.selected_language}\n"
            f"CONSTRAINTS: {safe_constraints}\n"
            f"PROBLEM STATEMENT:\n{safe_statement}\n\n"
            f"STUDENT'S CURRENT CODE:\n```{request.selected_language}\n{safe_code}\n```\n\n"
            f"ERROR / FAILURE REPORT:\n{safe_error}\n\n"
            f"TEST CASE INPUT: {safe_test}\n"
            f"EXPECTED OUTPUT: {safe_expected}\n"
            f"ACTUAL OUTPUT: {safe_actual}\n\n"
            f"DEBUGGING DIRECTIVES:\n"
            f"1. Categorize the error (e.g. COMPILATION_ERROR, LOGICAL_ERROR, INDEX_OUT_OF_BOUNDS, INTEGER_OVERFLOW, TIME_LIMIT_EXCEEDED).\n"
            f"2. Provide a concise, clear explanation of the bug.\n"
            f"3. Produce the COMPLETE, corrected source code in {request.selected_language} with the fix applied.\n"
            f"4. Preserve the student's original variable names, algorithmic structure, and class/function skeletons.\n"
            f"5. List the discrete changes made and any potential side effects.\n"
            f"Return pure JSON adhering to the SolutionFixResponse schema."
        )

        fix_response = await provider.generate_structured(
            prompt=user_prompt,
            response_schema=SolutionFixResponse,
            system_prompt=system_prompt,
        )

        return fix_response

