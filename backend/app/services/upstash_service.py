"""
CodeMate AI — Upstash Redis Ephemeral Context Service
Manages session-isolated, ephemeral working memory for stateful multi-step AI tasks.
Supports Upstash Redis REST API with seamless in-memory fallback when credentials are not configured.
Guarantees strict 15-minute TTL auto-expiration and immediate explicit eviction.
"""

import json
import time
import asyncio
from typing import Any, Dict, Optional, List
import httpx

from app.core.config import settings
from app.core.logging import logger

_in_memory_task_store: Dict[str, Dict[str, Any]] = {}
_store_lock = asyncio.Lock()


class UpstashRedisService:
    """
    Serverless key-value client for Ephemeral Task Contexts.
    """

    @classmethod
    def _has_upstash_credentials(cls) -> bool:
        return bool(
            settings.UPSTASH_REDIS_REST_URL
            and settings.UPSTASH_REDIS_REST_TOKEN
            and "upstash.io" in settings.UPSTASH_REDIS_REST_URL.lower()
        )

    @classmethod
    def _get_rest_headers(cls) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.UPSTASH_REDIS_REST_TOKEN}",
            "Content-Type": "application/json",
        }

    @classmethod
    async def init_task_context(
        cls,
        task_id: str,
        user_id: str,
        problem_title: str,
        problem_statement: str,
        target_framework: str,
        dependency_order: List[str],
        raw_files: Dict[str, str],
        ttl_seconds: int = 900,
    ) -> Dict[str, Any]:
        """Initializes an isolated task execution state."""
        now = time.time()
        initial_state: Dict[str, Any] = {
            "task_id": task_id,
            "user_id": user_id,
            "created_at": now,
            "expires_at": now + ttl_seconds,
            "status": "IN_PROGRESS",
            "problem_title": problem_title,
            "problem_statement": problem_statement,
            "target_framework": target_framework,
            "dependency_order": dependency_order,
            "raw_files": raw_files,
            "current_step_index": 0,
            "completed_files": {},
            "shared_contracts": {
                "entities": {},
                "endpoints": [],
                "service_methods": {},
                "dependencies": [],
            },
            "step_summaries": [],
        }

        if cls._has_upstash_credentials():
            try:
                base_url = settings.UPSTASH_REDIS_REST_URL.rstrip("/")
                key = f"cm:task:{task_id}:state"
                payload = json.dumps(initial_state)
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        f"{base_url}/set/{key}",
                        content=payload,
                        params={"ex": ttl_seconds},
                        headers=cls._get_rest_headers(),
                    )
                    if resp.status_code == 200:
                        logger.info(f"[Upstash Redis] Initialized ephemeral task context: {task_id} (TTL={ttl_seconds}s)")
                        return initial_state
            except Exception as e:
                logger.warning(f"[Upstash Redis] REST call failed, falling back to memory store: {e}")

        # In-memory store fallback
        async with _store_lock:
            cls._clean_expired_memory_tasks()
            _in_memory_task_store[task_id] = initial_state
            logger.info(f"[Task Memory] Initialized ephemeral task in memory: {task_id} (TTL={ttl_seconds}s)")

        return initial_state

    @classmethod
    async def get_task_state(cls, task_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves active task state, returning None if expired or evicted."""
        if cls._has_upstash_credentials():
            try:
                base_url = settings.UPSTASH_REDIS_REST_URL.rstrip("/")
                key = f"cm:task:{task_id}:state"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.get(
                        f"{base_url}/get/{key}",
                        headers=cls._get_rest_headers(),
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        result = data.get("result")
                        if result:
                            return json.loads(result) if isinstance(result, str) else result
            except Exception as e:
                logger.warning(f"[Upstash Redis] Failed to fetch task {task_id}: {e}")

        async with _store_lock:
            state = _in_memory_task_store.get(task_id)
            if not state:
                return None
            if time.time() > state.get("expires_at", 0):
                _in_memory_task_store.pop(task_id, None)
                return None
            return state

    @classmethod
    async def commit_step(
        cls,
        task_id: str,
        step_index: int,
        target_file: str,
        code: str,
        extracted_contracts: Optional[Dict[str, Any]] = None,
        ttl_seconds: int = 900,
    ) -> Optional[Dict[str, Any]]:
        """
        Commits a completed file step:
        - Updates completed_files[target_file] = code
        - Merges newly discovered interfaces into shared_contracts
        - Increments current_step_index
        - Resets the 15-minute TTL timer for contextual freshness
        """
        state = await cls.get_task_state(task_id)
        if not state:
            return None

        state["completed_files"][target_file] = code
        state["current_step_index"] = step_index + 1
        state["expires_at"] = time.time() + ttl_seconds
        state["step_summaries"].append(f"Step {step_index + 1}: Implemented {target_file}")

        # Merge domain contracts
        if extracted_contracts:
            current_contracts = state.setdefault("shared_contracts", {
                "entities": {},
                "endpoints": [],
                "service_methods": {},
                "dependencies": [],
            })
            if "entities" in extracted_contracts:
                current_contracts["entities"].update(extracted_contracts["entities"])
            if "endpoints" in extracted_contracts:
                current_contracts["endpoints"].extend(extracted_contracts["endpoints"])
            if "service_methods" in extracted_contracts:
                for k, v in extracted_contracts["service_methods"].items():
                    if k in current_contracts["service_methods"]:
                        current_contracts["service_methods"][k] = list(
                            set(current_contracts["service_methods"][k] + v)
                        )
                    else:
                        current_contracts["service_methods"][k] = v

        if cls._has_upstash_credentials():
            try:
                base_url = settings.UPSTASH_REDIS_REST_URL.rstrip("/")
                key = f"cm:task:{task_id}:state"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        f"{base_url}/set/{key}",
                        content=json.dumps(state),
                        params={"ex": ttl_seconds},
                        headers=cls._get_rest_headers(),
                    )
                    return state
            except Exception as e:
                logger.warning(f"[Upstash Redis] Failed to commit step for task {task_id}: {e}")

        async with _store_lock:
            _in_memory_task_store[task_id] = state

        return state

    @classmethod
    async def purge_task(cls, task_id: str) -> bool:
        """
        Explicit immediate deletion of task working memory once execution terminates.
        Ensures strict ephemeral lifecycle with zero residual cross-task contamination.
        """
        success = True
        if cls._has_upstash_credentials():
            try:
                base_url = settings.UPSTASH_REDIS_REST_URL.rstrip("/")
                key = f"cm:task:{task_id}:state"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    await client.post(
                        f"{base_url}/del/{key}",
                        headers=cls._get_rest_headers(),
                    )
                    logger.info(f"[Upstash Redis] Purged ephemeral task keys: {task_id}")
            except Exception as e:
                logger.warning(f"[Upstash Redis] Failed to purge {task_id}: {e}")
                success = False

        async with _store_lock:
            popped = _in_memory_task_store.pop(task_id, None)
            if popped:
                logger.info(f"[Task Memory] Purged ephemeral working memory for task: {task_id}")

        return success

    @classmethod
    def _clean_expired_memory_tasks(cls) -> None:
        """Removes stale tasks exceeding TTL from memory store."""
        now = time.time()
        stale_ids = [tid for tid, s in _in_memory_task_store.items() if s.get("expires_at", 0) < now]
        for tid in stale_ids:
            _in_memory_task_store.pop(tid, None)

