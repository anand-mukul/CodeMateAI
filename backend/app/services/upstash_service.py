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

    _http_client: Optional[httpx.AsyncClient] = None

    @classmethod
    def _get_http_client(cls) -> httpx.AsyncClient:
        if cls._http_client is None or cls._http_client.is_closed:
            cls._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(5.0, connect=2.0),
                limits=httpx.Limits(max_keepalive_connections=10, max_connections=20),
            )
        return cls._http_client

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

        # Always store in high-performance local memory store first
        async with _store_lock:
            cls._clean_expired_memory_tasks()
            _in_memory_task_store[task_id] = initial_state
            logger.info(f"[Task Memory] Initialized ephemeral task in memory: {task_id} (TTL={ttl_seconds}s)")

        if cls._has_upstash_credentials():
            try:
                base_url = settings.UPSTASH_REDIS_REST_URL.rstrip("/")
                key = f"cm:task:{task_id}:state"
                payload = json.dumps(initial_state)
                client = cls._get_http_client()
                await client.post(
                    f"{base_url}/set/{key}",
                    content=payload,
                    params={"ex": ttl_seconds},
                    headers=cls._get_rest_headers(),
                )
            except Exception as e:
                logger.debug(f"[Upstash Redis] Background sync skipped: {e}")

        return initial_state

    @classmethod
    async def get_task_state(cls, task_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves active task state, returning None if expired or evicted."""
        # 1. Fast path: check local memory store first (0ms latency)
        async with _store_lock:
            state = _in_memory_task_store.get(task_id)
            if state:
                if time.time() > state.get("expires_at", 0):
                    _in_memory_task_store.pop(task_id, None)
                    return None
                return state

        # 2. Remote Upstash fallback
        if cls._has_upstash_credentials():
            try:
                base_url = settings.UPSTASH_REDIS_REST_URL.rstrip("/")
                key = f"cm:task:{task_id}:state"
                client = cls._get_http_client()
                resp = await client.get(
                    f"{base_url}/get/{key}",
                    headers=cls._get_rest_headers(),
                )
                if resp.status_code == 200:
                    data = resp.json()
                    result = data.get("result")
                    if result:
                        parsed = json.loads(result) if isinstance(result, str) else result
                        async with _store_lock:
                            _in_memory_task_store[task_id] = parsed
                        return parsed
            except Exception as e:
                logger.debug(f"[Upstash Redis] Fetch fallback skipped: {e}")

        return None

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
                client = cls._get_http_client()
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
                client = cls._get_http_client()
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
    async def clear_all_task_contexts(cls) -> bool:
        """
        Purges all active ephemeral working memory across memory stores and Redis.
        Called when problem statement changes or page reloads.
        """
        async with _store_lock:
            _in_memory_task_store.clear()
            logger.info("[Task Memory] Cleared all local ephemeral task stores.")

        if cls._has_upstash_credentials():
            try:
                base_url = settings.UPSTASH_REDIS_REST_URL.rstrip("/")
                client = cls._get_http_client()
                # Scan and delete task keys
                scan_res = await client.get(
                    f"{base_url}/keys/cm:task:*",
                    headers=cls._get_rest_headers(),
                )
                if scan_res.status_code == 200:
                    keys = scan_res.json().get("result", [])
                    if keys:
                        for k in keys:
                            await client.post(f"{base_url}/del/{k}", headers=cls._get_rest_headers())
                        logger.info(f"[Upstash Redis] Flushed {len(keys)} task context keys.")
            except Exception as e:
                logger.warning(f"[Upstash Redis] Error flushing task keys: {e}")

        # Also flush Redis client if configured
        client = cls.get_redis_client()
        if client:
            try:
                keys = client.keys("cm:task:*")
                if keys:
                    client.delete(*keys)
                    logger.info(f"[Redis Client] Flushed {len(keys)} task context keys.")
            except Exception as e:
                logger.debug(f"[Redis Client] Flush task keys error: {e}")

        return True

    @classmethod
    def _clean_expired_memory_tasks(cls) -> None:
        """Removes stale tasks exceeding TTL from memory store."""
        now = time.time()
        stale_ids = [tid for tid, s in _in_memory_task_store.items() if s.get("expires_at", 0) < now]
        for tid in stale_ids:
            _in_memory_task_store.pop(tid, None)

    _redis_client: Optional[Any] = None

    @classmethod
    def get_redis_client(cls) -> Optional[Any]:
        """
        Returns a thread-safe redis-py Redis client when REDIS_URL is configured.
        Lazily initialized with automatic TLS handling for Upstash endpoints.
        """
        if cls._redis_client is None:
            redis_url = getattr(settings, "redis_url_normalized", None) or settings.REDIS_URL
            if redis_url:
                try:
                    import redis
                    cls._redis_client = redis.from_url(
                        redis_url,
                        decode_responses=True,
                        socket_timeout=5.0,
                        socket_connect_timeout=5.0,
                        health_check_interval=30,
                    )
                    logger.info("[Redis] Initialized redis-py client pool")
                except Exception as exc:
                    logger.warning(f"[Redis] Could not initialize redis-py client: {exc}")
        return cls._redis_client

    @classmethod
    async def check_connection(cls) -> Dict[str, Any]:
        """
        Verifies connectivity and latency against Upstash Redis.
        Tries REST ping first (native to serverless), falls back to TCP ping if available.
        """
        if not cls._has_upstash_credentials() and not settings.REDIS_URL:
            return {
                "available": False,
                "provider": "in_memory_fallback",
                "message": "Upstash Redis credentials not configured. Using in-memory fallback.",
            }

        start_time = time.time()
        # 1. Probe via Upstash REST API
        if cls._has_upstash_credentials():
            try:
                base_url = settings.UPSTASH_REDIS_REST_URL.rstrip("/")
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(
                        f"{base_url}/ping",
                        headers=cls._get_rest_headers(),
                    )
                    latency_ms = round((time.time() - start_time) * 1000, 2)
                    if resp.status_code == 200:
                        data = resp.json()
                        if data.get("result") == "PONG":
                            return {
                                "available": True,
                                "provider": "upstash",
                                "protocol": "rest",
                                "latency_ms": latency_ms,
                                "endpoint": base_url,
                                "error": None,
                            }
                        return {
                            "available": False,
                            "provider": "upstash",
                            "protocol": "rest",
                            "latency_ms": latency_ms,
                            "error": f"Unexpected ping response: {resp.text}",
                        }
                    return {
                        "available": False,
                        "provider": "upstash",
                        "protocol": "rest",
                        "latency_ms": latency_ms,
                        "error": f"HTTP {resp.status_code}: {resp.text}",
                    }
            except Exception as exc:
                logger.warning(f"[Upstash Redis] REST health probe error: {exc}")

        # 2. Probe via standard TCP client if REST fails or not configured
        client = cls.get_redis_client()
        if client:
            try:
                t0 = time.time()
                is_pong = client.ping()
                latency_ms = round((time.time() - t0) * 1000, 2)
                return {
                    "available": bool(is_pong),
                    "provider": "upstash" if "upstash.io" in (settings.REDIS_URL or "") else "redis",
                    "protocol": "tcp_tls",
                    "latency_ms": latency_ms,
                    "error": None if is_pong else "Ping did not return True",
                }
            except Exception as exc:
                return {
                    "available": False,
                    "provider": "redis",
                    "protocol": "tcp_tls",
                    "error": str(exc),
                }

        return {
            "available": False,
            "provider": "upstash",
            "error": "Failed to connect to Upstash Redis endpoint",
        }

