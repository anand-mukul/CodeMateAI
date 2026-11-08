"""
CodeMate AI — Compiler Runner Architecture
SECURITY CLASSIFICATION: UNSANDBOXED DEVELOPMENT RUNNER — NOT APPROVED FOR PUBLIC PRODUCTION CODE EXECUTION

WARNING & ARCHITECTURAL BOUNDARY:
This runner provides basic syntax validation and compilation checks using host-level subprocesses
(asyncio.create_subprocess_exec) with scrubbed environment variables and timeouts.
It DOES NOT provide OS-level container isolation, cgroups, namespaces, seccomp, gVisor, or Firecracker microVMs.
Therefore, it is formally classified as an UNSANDBOXED DEVELOPMENT RUNNER and is strictly NOT APPROVED
for public multi-tenant execution of arbitrary untrusted code. Production deployment requires dedicated
sandboxed execution workers (e.g. Judge0, gVisor, or AWS Lambda microVMs).
"""

import ast
import asyncio
import os
import shutil
import sys
import tempfile
import time
from typing import Optional
import logging

from app.schemas.compiler import CompilationRequest, CompilationResult

logger = logging.getLogger("codemate.compiler")

IS_SANDBOXED = False
SANDBOX_CLASSIFICATION = "UNSANDBOXED DEVELOPMENT RUNNER — NOT APPROVED FOR PUBLIC PRODUCTION CODE EXECUTION"


class CompilerRunner:
    """
    Restricted compilation and syntax verification runner.

    SECURITY CLASSIFICATION: UNSANDBOXED DEVELOPMENT RUNNER — NOT APPROVED FOR PUBLIC PRODUCTION CODE EXECUTION
    """
    IS_SANDBOXED: bool = False
    SECURITY_LEVEL: str = "LOCAL_SUBPROCESS_DEV_ONLY"

    @classmethod
    def _scrubbed_env(cls) -> dict:
        """Returns a minimal, clean environment dictionary without application secrets."""
        allowed_keys = [
            "PATH",
            "SYSTEMROOT",
            "TEMP",
            "TMP",
            "USERPROFILE",
            "HOME",
            "PYTHONPATH",
            "JAVA_HOME",
        ]
        clean_env = {}
        for k in allowed_keys:
            if k in os.environ:
                clean_env[k] = os.environ[k]
        return clean_env

    @classmethod
    async def validate_syntax_or_compile(cls, req: CompilationRequest) -> CompilationResult:
        """
        Executes isolated compile / syntax check.
        Dispatches based on normalized language.
        """
        lang = req.language.lower().strip()
        start_time = time.perf_counter()

        # Language normalizations
        if lang in ("python", "py", "python3"):
            return await cls._run_python(req, start_time)
        elif lang in ("java"):
            return await cls._run_java(req, start_time)
        elif lang in ("cpp", "c++", "c"):
            return await cls._run_cpp(req, start_time)
        elif lang in ("javascript", "js", "typescript", "ts"):
            return await cls._run_javascript(req, start_time)
        else:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            return CompilationResult(
                success=False,
                status="TOOL_UNAVAILABLE",
                error_type="UNSUPPORTED_LANGUAGE",
                stderr=f"Language '{req.language}' has no isolated compiler adapter registered.",
                duration_ms=elapsed,
            )

    @classmethod
    async def _run_python(cls, req: CompilationRequest, start_time: float) -> CompilationResult:
        """Validates Python via AST parsing first, then isolated py_compile subprocess."""
        # 1. Fast in-process AST syntax check (safe, does not execute code)
        try:
            ast.parse(req.source_code)
        except SyntaxError as e:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            return CompilationResult(
                success=False,
                status="SYNTAX_ERROR",
                returncode=1,
                stderr=f"SyntaxError on line {e.lineno}, col {e.offset}: {e.msg}",
                error_type="SYNTAX_ERROR",
                duration_ms=elapsed,
                compiler_used="python_ast",
            )

        # 2. Subprocess py_compile in clean tempdir
        with tempfile.TemporaryDirectory(prefix="cm_py_") as tmpdir:
            fname = req.entry_filename or "solution.py"
            fpath = os.path.join(tmpdir, fname)
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(req.source_code)

            cmd = [sys.executable, "-m", "py_compile", fname]
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    cwd=tmpdir,
                    env=cls._scrubbed_env(),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=req.timeout_seconds,
                )
                elapsed = (time.perf_counter() - start_time) * 1000.0
                returncode = proc.returncode or 0

                if returncode == 0:
                    return CompilationResult(
                        success=True,
                        status="COMPILED_OK",
                        returncode=0,
                        stdout=stdout.decode("utf-8", errors="replace"),
                        stderr=stderr.decode("utf-8", errors="replace"),
                        duration_ms=elapsed,
                        compiler_used="py_compile",
                    )
                else:
                    return CompilationResult(
                        success=False,
                        status="COMPILATION_ERROR",
                        returncode=returncode,
                        stdout=stdout.decode("utf-8", errors="replace"),
                        stderr=stderr.decode("utf-8", errors="replace"),
                        error_type="COMPILATION_ERROR",
                        duration_ms=elapsed,
                        compiler_used="py_compile",
                    )
            except asyncio.TimeoutError:
                elapsed = (time.perf_counter() - start_time) * 1000.0
                try:
                    proc.kill()
                except Exception:
                    pass
                return CompilationResult(
                    success=False,
                    status="TIMEOUT",
                    returncode=-1,
                    stderr=f"Compilation timed out after {req.timeout_seconds}s.",
                    error_type="TIMEOUT",
                    duration_ms=elapsed,
                    compiler_used="py_compile",
                )

    @classmethod
    async def _run_java(cls, req: CompilationRequest, start_time: float) -> CompilationResult:
        """Validates Java via javac if available on system, else basic lexical check."""
        javac_bin = shutil.which("javac")
        if not javac_bin:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            # Static check
            open_b = req.source_code.count("{")
            close_b = req.source_code.count("}")
            if open_b != close_b:
                return CompilationResult(
                    success=False,
                    status="SYNTAX_ERROR",
                    returncode=1,
                    stderr=f"Mismatched braces in Java source: {open_b} '{{' vs {close_b} '}}'.",
                    error_type="SYNTAX_ERROR",
                    duration_ms=elapsed,
                    compiler_used="static_scanner",
                )
            return CompilationResult(
                success=True,
                status="TOOL_UNAVAILABLE",
                stderr="System javac binary not found on host. Static structure verified.",
                duration_ms=elapsed,
                compiler_used="static_scanner",
            )

        with tempfile.TemporaryDirectory(prefix="cm_java_") as tmpdir:
            # Detect class name from source code
            import re
            m = re.search(r"\bpublic\s+(?:class|interface|enum|record)\s+([A-Za-z0-9_]+)\b", req.source_code)
            class_name = m.group(1) if m else "Solution"
            fname = f"{class_name}.java"
            fpath = os.path.join(tmpdir, fname)

            with open(fpath, "w", encoding="utf-8") as f:
                f.write(req.source_code)

            cmd = [javac_bin, "-d", tmpdir, fname]
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    cwd=tmpdir,
                    env=cls._scrubbed_env(),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=req.timeout_seconds,
                )
                elapsed = (time.perf_counter() - start_time) * 1000.0
                returncode = proc.returncode or 0

                if returncode == 0:
                    return CompilationResult(
                        success=True,
                        status="COMPILED_OK",
                        returncode=0,
                        stdout=stdout.decode("utf-8", errors="replace"),
                        stderr=stderr.decode("utf-8", errors="replace"),
                        duration_ms=elapsed,
                        compiler_used="javac",
                    )
                else:
                    return CompilationResult(
                        success=False,
                        status="COMPILATION_ERROR",
                        returncode=returncode,
                        stdout=stdout.decode("utf-8", errors="replace"),
                        stderr=stderr.decode("utf-8", errors="replace"),
                        error_type="COMPILATION_ERROR",
                        duration_ms=elapsed,
                        compiler_used="javac",
                    )
            except asyncio.TimeoutError:
                elapsed = (time.perf_counter() - start_time) * 1000.0
                try:
                    proc.kill()
                except Exception:
                    pass
                return CompilationResult(
                    success=False,
                    status="TIMEOUT",
                    returncode=-1,
                    stderr=f"Compilation timed out after {req.timeout_seconds}s.",
                    error_type="TIMEOUT",
                    duration_ms=elapsed,
                    compiler_used="javac",
                )

    @classmethod
    async def _run_cpp(cls, req: CompilationRequest, start_time: float) -> CompilationResult:
        """Validates C++ via g++ or clang++ -fsyntax-only if available."""
        cpp_bin = shutil.which("g++") or shutil.which("clang++")
        if not cpp_bin:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            open_b = req.source_code.count("{")
            close_b = req.source_code.count("}")
            if open_b != close_b:
                return CompilationResult(
                    success=False,
                    status="SYNTAX_ERROR",
                    returncode=1,
                    stderr=f"Mismatched braces in C++ source: {open_b} '{{' vs {close_b} '}}'.",
                    error_type="SYNTAX_ERROR",
                    duration_ms=elapsed,
                    compiler_used="static_scanner",
                )
            return CompilationResult(
                success=True,
                status="TOOL_UNAVAILABLE",
                stderr="System C++ compiler (g++/clang++) not found on host. Static structure verified.",
                duration_ms=elapsed,
                compiler_used="static_scanner",
            )

        with tempfile.TemporaryDirectory(prefix="cm_cpp_") as tmpdir:
            fname = req.entry_filename or "solution.cpp"
            fpath = os.path.join(tmpdir, fname)
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(req.source_code)

            cmd = [cpp_bin, "-fsyntax-only", "-std=c++17", fname]
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    cwd=tmpdir,
                    env=cls._scrubbed_env(),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=req.timeout_seconds,
                )
                elapsed = (time.perf_counter() - start_time) * 1000.0
                returncode = proc.returncode or 0

                if returncode == 0:
                    return CompilationResult(
                        success=True,
                        status="COMPILED_OK",
                        returncode=0,
                        stdout=stdout.decode("utf-8", errors="replace"),
                        stderr=stderr.decode("utf-8", errors="replace"),
                        duration_ms=elapsed,
                        compiler_used=os.path.basename(cpp_bin),
                    )
                else:
                    return CompilationResult(
                        success=False,
                        status="COMPILATION_ERROR",
                        returncode=returncode,
                        stdout=stdout.decode("utf-8", errors="replace"),
                        stderr=stderr.decode("utf-8", errors="replace"),
                        error_type="COMPILATION_ERROR",
                        duration_ms=elapsed,
                        compiler_used=os.path.basename(cpp_bin),
                    )
            except asyncio.TimeoutError:
                elapsed = (time.perf_counter() - start_time) * 1000.0
                try:
                    proc.kill()
                except Exception:
                    pass
                return CompilationResult(
                    success=False,
                    status="TIMEOUT",
                    returncode=-1,
                    stderr=f"Compilation timed out after {req.timeout_seconds}s.",
                    error_type="TIMEOUT",
                    duration_ms=elapsed,
                    compiler_used=os.path.basename(cpp_bin),
                )

    @classmethod
    async def _run_javascript(cls, req: CompilationRequest, start_time: float) -> CompilationResult:
        """Validates JS/TS via node --check if node is available."""
        node_bin = shutil.which("node")
        if not node_bin:
            elapsed = (time.perf_counter() - start_time) * 1000.0
            return CompilationResult(
                success=True,
                status="TOOL_UNAVAILABLE",
                stderr="Node binary not found on host for JavaScript syntax checking.",
                duration_ms=elapsed,
                compiler_used="static_scanner",
            )

        with tempfile.TemporaryDirectory(prefix="cm_js_") as tmpdir:
            fname = req.entry_filename or "solution.js"
            fpath = os.path.join(tmpdir, fname)
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(req.source_code)

            cmd = [node_bin, "--check", fname]
            try:
                proc = await asyncio.create_subprocess_exec(
                    *cmd,
                    cwd=tmpdir,
                    env=cls._scrubbed_env(),
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(),
                    timeout=req.timeout_seconds,
                )
                elapsed = (time.perf_counter() - start_time) * 1000.0
                returncode = proc.returncode or 0

                if returncode == 0:
                    return CompilationResult(
                        success=True,
                        status="COMPILED_OK",
                        returncode=0,
                        stdout=stdout.decode("utf-8", errors="replace"),
                        stderr=stderr.decode("utf-8", errors="replace"),
                        duration_ms=elapsed,
                        compiler_used="node",
                    )
                else:
                    return CompilationResult(
                        success=False,
                        status="SYNTAX_ERROR",
                        returncode=returncode,
                        stdout=stdout.decode("utf-8", errors="replace"),
                        stderr=stderr.decode("utf-8", errors="replace"),
                        error_type="SYNTAX_ERROR",
                        duration_ms=elapsed,
                        compiler_used="node",
                    )
            except asyncio.TimeoutError:
                elapsed = (time.perf_counter() - start_time) * 1000.0
                try:
                    proc.kill()
                except Exception:
                    pass
                return CompilationResult(
                    success=False,
                    status="TIMEOUT",
                    returncode=-1,
                    stderr=f"Syntax check timed out after {req.timeout_seconds}s.",
                    error_type="TIMEOUT",
                    duration_ms=elapsed,
                    compiler_used="node",
                )

