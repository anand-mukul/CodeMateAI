"""
CodeMate AI — Ephemeral Multi-File Agent Task Service
Coordinates dependency DAG sequencing, context compression, and contract-aware file synthesis.
Ensures zero contract drift across multi-step project execution on CodeChef.
"""

import asyncio
import json
import re
from typing import Any, Dict, List, Optional, Tuple
from app.ai.provider import AIProvider
from app.ai.provider_manager import ProviderManager
from app.core.logging import logger
from app.services.upstash_service import UpstashRedisService
from app.services.starter_fidelity import StarterFidelityEngine


class EphemeralTaskService:
    """
    Coordinates multi-step multi-file agent execution using ephemeral task working memory.
    """

    @classmethod
    async def create_task_plan(
        cls,
        problem_title: str,
        problem_statement: str,
        files: Dict[str, str],
        provider: AIProvider,
        target_framework: Optional[str] = None,
    ) -> Tuple[str, List[str], str]:
        """
        Analyzes the project structure and problem statement to derive:
        1. Framework (Spring Boot, React, FastAPI, Node, etc.)
        2. Clean dependency execution order (DAG)
        3. Architectural summary
        """
        file_list = list(files.keys())

        # Fast heuristic ordering fallback
        def _heuristic_rank(fname: str) -> int:
            f = fname.lower()
            if "pom.xml" in f or "package.json" in f or "build.gradle" in f:
                return 1
            if "model" in f or "entity" in f or "domain" in f or (f.endswith(".java") and not ("service" in f or "controller" in f or "repo" in f or "app" in f)):
                return 2
            if "repo" in f or "dao" in f:
                return 3
            if "dto" in f or "payload" in f or "schema" in f:
                return 4
            if "service" in f:
                return 5
            if "controller" in f or "resource" in f or "route" in f or "endpoint" in f:
                return 6
            if "application" in f or "main" in f or "server" in f:
                return 7
            if "api" in f or "client" in f or "util" in f:
                return 8
            if "component" in f or "view" in f or f.endswith(".jsx") or f.endswith(".tsx"):
                return 9
            return 10

        heuristic_order = sorted(file_list, key=_heuristic_rank)

        # Prompt LLM to refine DAG ordering
        prompt = (
            f"You are the Lead Software Architect for CodeMate AI.\n"
            f"Analyze this multi-file competitive project task on CodeChef:\n\n"
            f"PROBLEM TITLE: {problem_title}\n"
            f"PROBLEM SPECIFICATION:\n{problem_statement[:2500]}\n\n"
            f"PROJECT FILES DISCOVERED IN WORKSPACE:\n"
            + "\n".join(f"- {fname} (length: {len(content)} chars)" for fname, content in files.items())
            + "\n\n"
            f"TASK: Determine the framework and optimal dependency implementation order so each file "
            f"builds upon previously implemented symbols.\n"
            f"Return JSON strictly with format:\n"
            f'{{"framework": "springboot|react|fullstack|general", "ordered_files": ["file1", "file2", ...], "summary": "Brief architectural plan"}}\n'
            f"Ensure every discovered file is included in ordered_files."
        )

        try:
            raw_resp = await asyncio.wait_for(
                provider.generate_text(prompt, system_prompt="You output strictly valid JSON without conversational wrapper."),
                timeout=6.0,
            )
            match = re.search(r"\{.*\}", raw_resp, re.DOTALL)
            if match:
                data = json.loads(match.group(0))
                ordered = data.get("ordered_files", [])
                # Ensure all files are present
                final_order = [f for f in ordered if f in files]
                for f in file_list:
                    if f not in final_order:
                        final_order.append(f)
                framework = data.get("framework", target_framework or "springboot")
                summary = data.get("summary", f"Multi-file {framework} implementation plan across {len(final_order)} files.")
                return framework, final_order, summary
        except Exception as e:
            logger.warning(f"[EphemeralTaskService] Fast heuristic fallback engaged: {e}")

        # Fallback heuristic
        detected_fw = target_framework or ("springboot" if any(f.endswith(".java") for f in file_list) else "react")
        return detected_fw, heuristic_order, f"Automated dependency sequence across {len(heuristic_order)} project files."

    @classmethod
    async def synthesize_file_with_context(
        cls,
        task_state: Dict[str, Any],
        target_file: str,
        step_index: int,
        provider: AIProvider,
    ) -> Tuple[str, str, Dict[str, Any]]:
        """
        Synthesizes a single target file using accumulated ephemeral working memory contracts:
        - Starter code of target file
        - Accumulated entity schemas, endpoint paths, method names
        - Previous step summaries
        Returns: (code, explanation, extracted_contracts)
        """
        problem_title = task_state.get("problem_title", "")
        problem_statement = task_state.get("problem_statement", "")
        shared_contracts = task_state.get("shared_contracts", {})
        step_summaries = task_state.get("step_summaries", [])
        raw_files = task_state.get("raw_files", {})
        target_starter_code = raw_files.get(target_file, "")
        total_steps = len(task_state.get("dependency_order", []))
        detected_lang = cls._detect_lang(target_file)

        # Build universal starter code fidelity directives
        fidelity_directives = StarterFidelityEngine.build_fidelity_prompt_directives(
            target_starter_code, language=detected_lang, filename=target_file
        )

        # Format compressed context
        contracts_summary = json.dumps(shared_contracts, indent=2)
        history_summary = "\n".join(f"- {s}" for s in step_summaries) if step_summaries else "Initial step."

        prompt = (
            f"You are CodeMate AI's specialized multi-file software engineering agent.\n"
            f"TASK: Implement step {step_index + 1} of {total_steps}: file '{target_file}' for problem '{problem_title}'.\n\n"
            f"PROBLEM STATEMENT:\n{problem_statement[:15000]}\n\n"
            f"CUMULATIVE WORKING MEMORY CONTRACTS (Must match existing declarations exactly):\n"
            f"{contracts_summary}\n\n"
            f"PREVIOUS STEPS EXECUTED:\n"
            f"{history_summary}\n\n"
            f"TARGET FILE: '{target_file}'\n"
            f"EXISTING STARTER CODE:\n```{detected_lang}\n{target_starter_code[:15000]}\n```\n\n"
            f"STRICT IMPLEMENTATION INSTRUCTIONS:\n"
            f"1. HIGHEST MANDATE — PROBLEM STATEMENT IS THE ABSOLUTE SPECIFICATION: Always give 100% priority to instructions given in the PROBLEM STATEMENT. If any in-code comment, javadoc, or TODO conflicts with the problem statement (e.g. a TODO suggests constructor injection, but the problem statement instructs @Autowired field injection, or vice-versa), the PROBLEM STATEMENT ALWAYS WINS. Disregard any contradictory comment.\n"
            f"2. Generate the COMPLETE, ready-to-compile production code for '{target_file}'.\n"
            f"3. Use EXACT naming, packages, annotations, and parameters declared in CUMULATIVE WORKING MEMORY CONTRACTS.\n"
            f"4. Do NOT include unit tests, mocks, or placeholder stubs unless explicitly instructed by the problem.\n"
            f"5. DEPENDENCY INJECTION & CONSTRUCTORS: Always give absolute priority to instructions in the problem statement. If the problem specifies field-level injection (e.g. '@Autowired'), annotate fields directly and do NOT write manual constructors. If constructor injection is specified, implement constructor injection. Otherwise adhere to existing starter code conventions. Never mix field injection and constructor injection for the same dependency.\n"
            f"{fidelity_directives}\n"
            f"6. If this file declares new Entities, Endpoints, or Services, summarize them in an EXTRACTED CONTRACTS JSON block at the end.\n\n"
            f"OUTPUT FORMAT:\n"
            f"```{detected_lang}\n"
            f"<COMPLETE_FILE_CODE>\n"
            f"```\n"
            f"EXPLANATION: <Brief 1-line explanation>\n"
            f"CONTRACTS:\n"
            f'{{"entities": {{...}}, "endpoints": [...], "service_methods": {{...}}}}\n'
        )

        raw_output = await provider.generate_text(
            prompt,
            system_prompt=(
                "You are an expert autonomous software engineer.\n"
                "AUTHORITY HIERARCHY (PROBLEM STATEMENT > IN-CODE COMMENTS):\n"
                "1. The PROBLEM STATEMENT is the absolute authoritative specification. Always implement what the problem statement requires.\n"
                "2. If any starter code comment, javadoc, or TODO contradicts the problem statement (e.g. a TODO tells you to replace an injection style, but the problem statement instructs @Autowired field injection), YOU MUST OBEY THE PROBLEM STATEMENT AND DISREGARD THE CONFLICTING TODO.\n"
                "3. Output production-grade, bug-free code strictly adhering to shared project contracts and problem requirements."
            ),
        )

        code, explanation, extracted_contracts = cls._parse_file_output(raw_output, target_file)
        if detected_lang == "java" and not target_file.lower().endswith(("test.java", "tests.java")):
            code = StarterFidelityEngine.strip_test_methods(code)
        return code, explanation, extracted_contracts

    @classmethod
    def _detect_lang(cls, fname: str) -> str:
        f = fname.lower()
        if f.endswith(".java"):
            return "java"
        if f.endswith(".py"):
            return "python"
        if f.endswith(".ts") or f.endswith(".tsx"):
            return "typescript"
        if f.endswith(".js") or f.endswith(".jsx"):
            return "javascript"
        if f.endswith(".cpp") or f.endswith(".cc"):
            return "cpp"
        if f.endswith(".xml"):
            return "xml"
        if f.endswith(".json"):
            return "json"
        return "text"

    @classmethod
    def _parse_file_output(cls, raw: str, target_file: str) -> Tuple[str, str, Dict[str, Any]]:
        """Extracts code block, explanation, and new contract declarations."""
        # 1. Extract code block
        code_match = re.search(r"```[a-zA-Z0-9_-]*\s*\n(.*?)\n```", raw, re.DOTALL)
        if code_match:
            code = code_match.group(1).strip()
        else:
            # Fallback: strip markdown fences
            code = raw.replace("```", "").strip()

        # 2. Extract explanation
        exp_match = re.search(r"EXPLANATION:\s*(.+)", raw, re.IGNORECASE)
        explanation = exp_match.group(1).strip() if exp_match else f"Completed implementation of {target_file}"

        # 3. Extract new contracts JSON
        contracts: Dict[str, Any] = {}
        contracts_match = re.search(r"CONTRACTS:\s*(\{.*?\})", raw, re.DOTALL | re.IGNORECASE)
        if contracts_match:
            try:
                contracts = json.loads(contracts_match.group(1))
            except Exception:
                contracts = {}

        return code, explanation, contracts

