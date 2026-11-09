"""
CodeMate AI — Ephemeral Multi-File Tasks Router
Provides API endpoints for task-scoped multi-step agent execution on CodeChef.
"""

from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.ephemeral_task import (
    TaskInitRequest,
    TaskInitResponse,
    TaskStepRequest,
    TaskStepResponse,
    TaskCommitRequest,
    TaskStatusResponse,
)
from app.services.entitlement_service import (
    get_current_user,
    require_verified_email,
    require_feature_entitlement,
    enforce_daily_quota,
    get_authorized_provider,
)
from app.ai.provider import AIProvider
from app.services.upstash_service import UpstashRedisService
from app.services.ephemeral_task_service import EphemeralTaskService
from app.core.logging import logger

router = APIRouter(prefix="/tasks", tags=["Ephemeral Multi-File Tasks"])


@router.post(
    "/init",
    response_model=TaskInitResponse,
    dependencies=[
        Depends(require_verified_email),
        Depends(require_feature_entitlement("generate")),
        Depends(enforce_daily_quota("generate")),
    ],
)
async def init_task(
    payload: TaskInitRequest,
    user: User = Depends(get_current_user),
    provider: AIProvider = Depends(get_authorized_provider),
):
    """
    Initializes an isolated, ephemeral task context for multi-file project execution.
    Analyzes project files, determines framework, and establishes the dependency execution DAG.
    """
    if not payload.files or len(payload.files) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one file must be provided to initialize a project task.",
        )

    task_id = f"task_{uuid4().hex[:16]}"
    framework, dependency_order, summary = await EphemeralTaskService.create_task_plan(
        problem_title=payload.problem_title,
        problem_statement=payload.problem_statement,
        files=payload.files,
        provider=provider,
        target_framework=payload.target_framework,
    )

    # Initialize Ephemeral Memory with 15-minute TTL
    await UpstashRedisService.init_task_context(
        task_id=task_id,
        user_id=user.id,
        problem_title=payload.problem_title,
        problem_statement=payload.problem_statement,
        target_framework=framework,
        dependency_order=dependency_order,
        raw_files=payload.files,
        ttl_seconds=900,
    )

    logger.info(f"[Tasks] Initialized task {task_id} for user {user.email} ({len(dependency_order)} files)")

    return TaskInitResponse(
        task_id=task_id,
        target_framework=framework,
        dependency_order=dependency_order,
        total_steps=len(dependency_order),
        summary=summary,
    )


@router.post(
    "/{task_id}/step",
    response_model=TaskStepResponse,
    dependencies=[
        Depends(require_verified_email),
    ],
)
async def execute_task_step(
    task_id: str,
    payload: TaskStepRequest,
    user: User = Depends(get_current_user),
    provider: AIProvider = Depends(get_authorized_provider),
):
    """
    Executes a single file implementation step using accumulated working memory contracts.
    """
    task_state = await UpstashRedisService.get_task_state(task_id)
    if not task_state:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Task session has expired (15-minute TTL) or does not exist. Please re-initialize the task.",
        )

    # Strict multi-tenant isolation
    if task_state.get("user_id") != user.id and (user.role or "").upper() != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized access to isolated task execution context.",
        )

    code, explanation, extracted_contracts = await EphemeralTaskService.synthesize_file_with_context(
        task_state=task_state,
        target_file=payload.target_file,
        step_index=payload.step_index,
        provider=provider,
    )

    dependency_order = task_state.get("dependency_order", [])
    is_last = payload.step_index >= len(dependency_order) - 1

    return TaskStepResponse(
        task_id=task_id,
        step_index=payload.step_index,
        target_file=payload.target_file,
        code=code,
        explanation=explanation,
        extracted_contracts=extracted_contracts,
        is_last_step=is_last,
    )


@router.post(
    "/{task_id}/commit",
    dependencies=[
        Depends(require_verified_email),
    ],
)
async def commit_task_step(
    task_id: str,
    payload: TaskCommitRequest,
    user: User = Depends(get_current_user),
):
    """
    Commits a completed file step to working memory, updating interface contracts and resetting TTL.
    """
    task_state = await UpstashRedisService.get_task_state(task_id)
    if not task_state:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Task session has expired. Unable to commit step.",
        )

    updated = await UpstashRedisService.commit_step(
        task_id=task_id,
        step_index=payload.step_index,
        target_file=payload.target_file,
        code=payload.code,
        extracted_contracts=payload.extracted_contracts,
        ttl_seconds=900,
    )

    return {"success": True, "task_id": task_id, "current_step_index": updated.get("current_step_index") if updated else payload.step_index + 1}


@router.delete(
    "/{task_id}",
    dependencies=[
        Depends(require_verified_email),
    ],
)
async def terminate_task(
    task_id: str,
    user: User = Depends(get_current_user),
):
    """
    Terminates task execution and immediately purges all ephemeral working memory.
    """
    purged = await UpstashRedisService.purge_task(task_id)
    return {"success": purged, "task_id": task_id, "message": "Ephemeral working memory successfully discarded."}

