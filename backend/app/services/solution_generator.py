"""
CodeMate AI — Solution Generation & Code Optimization Service
Produces complete, executable, competitive programming solutions and refactors existing code.
"""

import re
from pathlib import Path
from typing import Optional
from fastapi import HTTPException, status
from app.ai.provider import AIProvider
from app.ai.provider_manager import ProviderManager
from app.ai.openrouter_provider import OpenRouterProvider
from app.core.config import settings
from app.core.security import sanitize_untrusted_text
from app.schemas.problem import ProblemRequest
from app.schemas.solution import (
    SolutionResponse,
    OptimizationRequest,
    OptimizationResponse,
    SolutionFixRequest,
    SolutionFixResponse,
    ComplexityAnalysis,
    ComplexityItem,
    WorkspaceFile,
)
from app.services.project_indexer.language_detector import LanguageDetector
from app.services.complexity_analyzer import ComplexityAnalyzer
from app.services.response_validator import ResponseValidator
from app.services.constraint_analyzer import ConstraintAnalyzer
from app.services.starter_fidelity import StarterFidelityEngine
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

        # Check if multi-file project with 2 or more files and NO single-file starter_code specified
        if problem.workspace_files and len(problem.workspace_files) > 1 and not (problem.starter_code and problem.starter_code.strip()):
            try:
                return await cls.generate_multifile_solution(problem, provider=provider)
            except Exception as mf_err:
                logger.warning(f"Sequential multi-file pipeline warning: {mf_err}. Falling back to standard pipeline...")

        safe_title = sanitize_untrusted_text(problem.title, max_chars=200)
        safe_statement = sanitize_untrusted_text(problem.problem_statement, max_chars=20000)
        safe_constraints = sanitize_untrusted_text(problem.constraints or "Standard bounds", max_chars=5000)
        safe_input_fmt = sanitize_untrusted_text(problem.input_format or "Standard input", max_chars=5000)
        safe_output_fmt = sanitize_untrusted_text(problem.output_format or "Standard output", max_chars=5000)

        budget = ConstraintAnalyzer.evaluate_constraints(safe_constraints)
        graph_taxonomy = ConstraintAnalyzer.analyze_graph_taxonomy(safe_title, safe_statement)

        examples_text = ""
        for i, eg in enumerate(problem.examples, 1):
            examples_text += f"Example {i}:\nInput: {eg.input}\nOutput: {eg.output}\n"

        starter_code_section = ""
        if problem.starter_code and problem.starter_code.strip():
            safe_starter = sanitize_untrusted_text(problem.starter_code, max_chars=15000)
            context_section = ""
            if problem.workspace_files:
                other_files = [
                    f"FILE: {fname}\n```{problem.selected_language}\n{sanitize_untrusted_text(fcontent, max_chars=3000)}\n```"
                    for fname, fcontent in problem.workspace_files.items()
                    if fcontent.strip() != problem.starter_code.strip()
                ]
                if other_files:
                    context_section = "\n\nPROJECT WORKSPACE CONTEXT (OTHER FILES FOR REFERENCE ONLY):\n" + "\n\n".join(other_files[:4])

            fidelity_rules = StarterFidelityEngine.build_fidelity_prompt_directives(
                problem.starter_code, language=problem.selected_language, filename="Current File"
            )

            starter_code_section = (
                f"\n\nCURRENT ACTIVE FILE STARTER CODE TO COMPLETE:\n"
                f"```{problem.selected_language}\n{safe_starter}\n```\n"
                f"{context_section}\n\n"
                f"CRITICAL RULES FOR ACTIVE FILE COMPLETION:\n"
                f"1. HIGHEST MANDATE — PROBLEM STATEMENT IS THE ABSOLUTE SPECIFICATION: Always give 100% priority to instructions given in the PROBLEM STATEMENT. If any in-code comment, javadoc, or TODO in the starter code conflicts with the problem statement (e.g. a TODO suggests constructor injection while the problem statement instructs @Autowired field injection, or vice-versa), the PROBLEM STATEMENT ALWAYS PREVAILS. Disregard any contradictory comment or TODO.\n"
                f"2. Implement ONLY this current active file. Do not replace it with code for other files.\n"
                f"3. PRESERVE EXISTING CLASS DECLARATION & PACKAGE: Keep the exact class/interface name, package, annotations, and parameters already declared in this starter code. Do NOT rename the class to match the file name if it differs.\n"
                f"4. Fulfill missing methods and valid `// TODO` items that align with the problem statement.\n"
                f"{fidelity_rules}\n"
                f"5. DEPENDENCY INJECTION & CONSTRUCTORS: Always give absolute priority to instructions in the problem statement. If the problem specifies field-level injection (e.g. '@Autowired'), annotate fields directly and do NOT write manual constructors. If constructor injection is specified, implement constructor injection. If unspecified, preserve starter code patterns. Never generate both field injection and constructor injection for the same dependency.\n"
                f"6. If this file is a production component (*.java in src/main), NEVER add @Test methods or test frameworks. Only complete and preserve @Test methods if this file is explicitly a test class (*Test.java).\n"
                f"7. Return the full completed ready-to-compile file code in the `code` field."
            )
        elif problem.workspace_files:
            files_desc = "\n\n".join([
                f"FILE: {fname}\n```{problem.selected_language}\n{sanitize_untrusted_text(fcontent, max_chars=10000)}\n```"
                for fname, fcontent in problem.workspace_files.items()
            ])
            starter_code_section = (
                f"\n\nCRITICAL REQUIREMENT — MULTI-FILE PROJECT COMPLETION:\n"
                f"The user's project workspace contains the following files:\n"
                f"{files_desc}\n\n"
                f"INSTRUCTIONS:\n"
                f"1. HIGHEST MANDATE — PROBLEM STATEMENT IS THE ABSOLUTE SPECIFICATION: Always give 100% priority to instructions given in the PROBLEM STATEMENT. If any in-code comment, javadoc, or TODO conflicts with the problem statement, the PROBLEM STATEMENT ALWAYS takes absolute precedence. Disregard any contradictory comment.\n"
                f"2. Complete all missing methods and valid `// TODO` items across the files according to problem instructions.\n"
                f"3. Return the completed code for each file in the `workspace_files` list, where each item has `filename` and `code`.\n"
                f"4. PRESERVE EXISTING DECLARATIONS: Retain the exact class names, packages, and annotations present in each file's starter code.\n"
                f"5. DEPENDENCY INJECTION & CONSTRUCTORS: Always give absolute priority to instructions in the problem statement. If the problem specifies field-level injection (e.g. '@Autowired'), annotate fields directly and do NOT write manual constructors. If constructor injection is specified, implement constructor injection. If unspecified, preserve starter code patterns. Never generate both field injection and constructor injection for the same dependency.\n"
                f"6. If a file contains @Test annotations or test TODOs, fulfill all test methods and preserve all test annotations and test imports.\n"
                f"7. In the primary `code` field, include the primary completed service/runner file.\n"
                f"8. Do NOT leave any TODO placeholders or incomplete methods.\n"
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
            f"{graph_taxonomy['guidance']}\n"
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
                    op = OpenRouterProvider(model_name=settings.OPENROUTER_MODEL or "openrouter/free")
                    solution = await op.generate_structured(
                        prompt=user_prompt,
                        response_schema=SolutionResponse,
                        system_prompt=system_prompt,
                    )
                except Exception as op_err:
                    logger.warning(f"OpenRouter fallback also failed ({op_err}).")

        if solution is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="All configured AI models failed to generate a solution. Please verify AI provider configuration or retry."
            )

        # Normalize and validate Big-O complexity
        solution.complexity = ComplexityAnalyzer.validate_complexity(solution.complexity)

        # Field-level @Autowired healing and final stripping for Java solutions
        if solution and problem.selected_language and problem.selected_language.lower() in ("java", "generic"):
            def _heal_autowired(src: str) -> str:
                # Strip illegal 'final' from @Autowired fields
                return re.sub(
                    r"(@Autowired\s*\n?\s*private)\s+final\s+([A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+);",
                    r"\1 \2 \3;",
                    src,
                )

            solution.code = _heal_autowired(solution.code)
            if solution.workspace_files:
                for wf in solution.workspace_files:
                    wf.code = _heal_autowired(wf.code)

        # Starter code asset fidelity healing (retains predefined helper methods & collections)
        if problem.starter_code:
            solution.code = StarterFidelityEngine.heal_missing_assets(
                solution.code, problem.starter_code, language=problem.selected_language
            )

        # Ensure no unit test annotations leaked into single-file production solutions
        if problem.selected_language.lower() in ("java", "csharp", "cs") and not any(k in (problem.title or "").lower() for k in ("test", "tests", "testcase")):
            solution.code = StarterFidelityEngine.strip_test_methods(solution.code)

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

        # 2. Universal Topological Sequence Order with Dependency Analysis
        # Models/Types -> Repositories/Utils -> Services -> Controllers/Components -> Entrypoints/Apps
        from app.services.multifile_resolver import sort_workspace_files_topologically, extract_typed_contracts

        sorted_files = sort_workspace_files_topologically(raw_files)
        safe_statement = sanitize_untrusted_text(problem.problem_statement, max_chars=10000)
        safe_title = sanitize_untrusted_text(problem.title, max_chars=200)

        # 4. Process each file sequentially with shared typed contracts
        for fname in sorted_files:
            if fname in completed_files:
                continue

            orig_code = raw_files[fname]
            file_lang = LanguageDetector.detect_language(fname)
            if file_lang == "text":
                file_lang = primary_lang

            # Build contract memory context from already completed files (typed interface / public signatures)
            memory_context = ""
            for done_name, done_code in completed_files.items():
                contract = extract_typed_contracts(done_code, done_name, file_lang)
                memory_context += f"FILE: {done_name} (TYPED API CONTRACT):\n```{file_lang}\n{contract}\n```\n\n"

            target_class = fname.split(".")[0]
            framework_desc = f"{framework} ({primary_lang})" if framework != "generic" else primary_lang

            is_test_file = (
                fname.lower().endswith(("test.java", "tests.java", "testcase.java"))
                or "src/test" in fname.lower()
                or "/test/" in fname.lower()
                or "/tests/" in fname.lower()
            )

            fidelity_directives = StarterFidelityEngine.build_fidelity_prompt_directives(
                orig_code, language=file_lang, filename=fname
            )

            if is_test_file:
                test_class_match = re.search(r"\b(?:public\s+)?class\s+([A-Za-z0-9_]*Test[A-Za-z0-9_]*)\b", orig_code)
                effective_test_class = test_class_match.group(1) if test_class_match else target_class
                class_rule = f"2. TEST CLASS PRESERVATION: Retain the test class structure and name ('{effective_test_class}') declared in the starter code. Do not force rename to {target_class}."
                role_rule = "3. TEST SUITE IMPLEMENTATION: This file is an automated test suite. Complete all @Test methods and fulfill every single // TODO item using mockMvc.perform(...) and assertions."
                compile_rule = "4. TEST FRAMEWORK INTEGRITY: Preserve all @Test annotations, @SpringBootTest, @AutoConfigureMockMvc, MockMvc injection, and org.junit.* / Spring test imports. Never omit or strip test annotations!"
            else:
                class_rule = f"2. CLASS NAME INTEGRITY: The class inside '{fname}' MUST be named exactly '{target_class}'. NEVER declare another class (e.g. if file is {fname}, declare public class {target_class}, NEVER a Controller or Test class)."
                role_rule = (
                    f"3. STRICT ROLE & INJECTION FIDELITY: If '{fname}' is a Service or Component, declare appropriate framework annotations (@Service, @Component). "
                    f"Always give absolute priority to instructions in the problem statement. "
                    f"If field-level injection is specified (e.g. '@Autowired'), annotate the field directly and do NOT write a constructor manually. "
                    f"If constructor injection is specified, implement constructor injection. "
                    f"Never mix both field injection and constructor injection for the same dependency. "
                    f"NEVER put @RestController or HTTP endpoints in a Service. "
                    f"If '{fname}' is a Model/Entity, implement only required fields, getters, setters, and constructors."
                )
                compile_rule = f"4. CRITICAL COMPILE SAFETY: This file compiles in the production source tree (src/main/). NEVER include test framework imports or annotations (@SpringBootTest, MockMvc, @Test, org.junit.*, jest, vitest) inside this file."

            file_prompt = (
                f"You are an expert {framework_desc} engineer.\n\n"
                f"TASK: Complete ONLY the single project file '{fname}'.\n\n"
                f"PROBLEM / FEATURE REQUIREMENTS:\n{safe_title}\n{safe_statement}\n\n"
                f"SHARED PROJECT CONTEXT (ALREADY RESOLVED FILES):\n{memory_context or 'None'}\n\n"
                f"EXISTING FILE CONTENT FOR '{fname}':\n"
                f"```{file_lang}\n{orig_code}\n```\n\n"
                f"STRICT ENGINEERING INSTRUCTIONS:\n"
                f"1. HIGHEST MANDATE — PROBLEM STATEMENT IS THE ABSOLUTE SPECIFICATION: Always give 100% priority to instructions given in the PROBLEM STATEMENT. If any in-code comment, javadoc, or TODO conflicts with the problem statement (e.g. a TODO suggests constructor injection, but the problem statement instructs @Autowired field injection, or vice-versa), the PROBLEM STATEMENT ALWAYS WINS. Disregard any contradictory comment.\n"
                f"2. Fulfill all requirements, missing methods, and valid TODO items in '{fname}' strictly adhering to problem instructions.\n"
                f"{class_rule}\n"
                f"{role_rule}\n"
                f"{compile_rule}\n"
                f"{fidelity_directives}\n"
                f"5. Return ONLY the complete, ready-to-run source code for '{fname}'. Do NOT output conversational filler, just the code inside ```{file_lang} ```."
            )

            system_prompt = (
                f"You are an expert {framework_desc} engineer.\n"
                "AUTHORITY HIERARCHY (PROBLEM STATEMENT > IN-CODE COMMENTS):\n"
                "1. The PROBLEM STATEMENT is the absolute authoritative specification. Always implement what the problem statement requires.\n"
                "2. If any starter code comment, javadoc, or TODO contradicts the problem statement (e.g. a TODO tells you to replace an injection style, but the problem statement instructs @Autowired field injection), YOU MUST OBEY THE PROBLEM STATEMENT AND DISREGARD THE CONFLICTING TODO.\n"
                "3. Output pure, production-grade, compilable source code."
            )

            try:
                res = await provider.generate_text(file_prompt, system_prompt=system_prompt)
                extracted_code = cls._extract_code(res)
                if extracted_code and len(extracted_code.strip()) > 20:
                    code = extracted_code.strip()
                    if file_lang == "java":
                        if not is_test_file:
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
                            code = re.sub(r"import\s+org\.junit[^\n]+;\n?", "", code)
                            code = re.sub(r"import\s+org\.springframework\.boot\.test[^\n]+;\n?", "", code)
                            code = StarterFidelityEngine.strip_test_methods(code)
                            code = re.sub(r"@(?:SpringBootTest|WebMvcTest|AutoConfigureMockMvc)\b[^\n]*\n?", "", code)
                        code = re.sub(
                            r"(@Autowired\s*\n?\s*private)\s+final\s+([A-Za-z0-9_<>]+)\s+([A-Za-z0-9_]+);",
                            r"\1 \2 \3;",
                            code,
                        )
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

