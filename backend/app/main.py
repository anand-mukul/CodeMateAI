"""
CodeMate AI — Hardened FastAPI Main Application Entry Point
Equipped with Idempotency Support, Adaptive Backoff Compliance, and Telemetry Tracing.
"""

import time
import uuid
from contextlib import asynccontextmanager
from typing import Dict, Tuple
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.logging import logger
from app.api.router import api_router
from app.api.routes.web_portal import router as web_portal_router, WEB_PORTAL_HTML
from app.db.session import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Initializes database schema and default subscription tiers on startup,
    and gracefully drains database connection pools on shutdown.
    """
    logger.info("CodeMate AI server starting up — initializing database & subscription engine...")
    await init_db()
    yield
    logger.info("CodeMate AI server shutting down — disposing database connection pool...")
    await close_db()


app = FastAPI(
    title=settings.SERVICE_NAME,
    version=settings.SERVICE_VERSION,
    description="Intelligent coding practice assistant backend powering CodeMate AI Chrome Extension.",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# Idempotency cache: key -> (timestamp, status_code, body_bytes, headers_dict)
_idempotency_cache: Dict[str, Tuple[float, int, bytes, Dict[str, str]]] = {}

# Configure CORS Middleware
# Allows localhost dev servers and Chrome Extension origins (chrome-extension://*)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"^chrome-extension://[a-z0-9]+$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "Content-Length", "Retry-After", "Idempotency-Key"],
)


@app.middleware("http")
async def security_and_tracing_middleware(request: Request, call_next):
    """
    1. Injects or forwards unique correlation ID (X-Request-ID).
    2. Enforces Idempotency-Key deduplication for safe retry pipelines.
    3. Logs incoming operations with timing and client metadata.
    4. Injects defensive HTTP security headers.
    """
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    request.state.request_id = request_id
    idempotency_key = request.headers.get("idempotency-key")

    start_time = time.time()
    path = request.url.path
    method = request.method

    # Check idempotency cache for duplicate POST requests
    if idempotency_key and method == "POST":
        cached = _idempotency_cache.get(idempotency_key)
        if cached:
            cached_time, cached_status, cached_body, cached_headers = cached
            if (time.time() - cached_time) < 15.0:
                logger.info(f"[{request_id}] Idempotent request hit for key: {idempotency_key}")
                resp_headers = dict(cached_headers)
                resp_headers["X-Request-ID"] = request_id
                resp_headers["X-Idempotent-Replay"] = "true"
                return Response(
                    content=cached_body,
                    status_code=cached_status,
                    headers=resp_headers,
                    media_type="application/json",
                )

    try:
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.info(f"[{request_id}] {method} {path} -> {response.status_code} ({duration_ms}ms)")

        # Inject standard security headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"

        if settings.ENVIRONMENT == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Cache successful idempotent responses and prune stale entries
        if idempotency_key and method == "POST" and response.status_code < 400:
            now_ts = time.time()
            if len(_idempotency_cache) > 500:
                stale_keys = [k for k, v in _idempotency_cache.items() if (now_ts - v[0]) > 30.0]
                for k in stale_keys:
                    _idempotency_cache.pop(k, None)

            # Consume and re-wrap response body for caching
            body_chunks = [chunk async for chunk in response.body_iterator]
            full_body = b"".join(body_chunks)
            _idempotency_cache[idempotency_key] = (
                now_ts,
                response.status_code,
                full_body,
                dict(response.headers),
            )
            return Response(
                content=full_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        return response
    except Exception as exc:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        logger.error(f"[{request_id}] {method} {path} -> Unhandled Exception after {duration_ms}ms: {exc}")
        raise exc


@app.exception_handler(StarletteHTTPException)
async def custom_http_exception_handler(request: Request, exc: StarletteHTTPException):
    """
    Returns uniform JSON error format for standard HTTP exceptions with request tracking.
    Injects Retry-After header for rate-limit protection.
    """
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        413: "PAYLOAD_TOO_LARGE",
        429: "RATE_LIMITED",
        500: "INTERNAL_SERVER_ERROR",
        503: "SERVICE_UNAVAILABLE",
        504: "GATEWAY_TIMEOUT",
    }
    error_code = code_map.get(exc.status_code, f"HTTP_{exc.status_code}")
    request_id = getattr(request.state, "request_id", "unknown")

    headers = {"X-Request-ID": request_id}
    if exc.status_code == 429:
        headers["Retry-After"] = "5"

    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content={
            "success": False,
            "error_code": error_code,
            "detail": exc.detail,
            "request_id": request_id,
            "retry_after": 5 if exc.status_code == 429 else None,
            "timestamp": time.time(),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Provides clear, readable field validation error messages without leaking stack traces.
    """
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    field_loc = " -> ".join(str(loc) for loc in first_error.get("loc", []))
    msg = first_error.get("msg", "Invalid field format")

    detail = f"Validation failed at '{field_loc}': {msg}"
    request_id = getattr(request.state, "request_id", "unknown")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        headers={"X-Request-ID": request_id},
        content={
            "success": False,
            "error_code": "VALIDATION_ERROR",
            "detail": detail,
            "request_id": request_id,
            "timestamp": time.time(),
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catches any unhandled server errors, logs securely, and returns safe 500 response.
    """
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{request_id}] Global unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        headers={"X-Request-ID": request_id},
        content={
            "success": False,
            "error_code": "INTERNAL_SERVER_ERROR",
            "detail": "An unexpected server error occurred while processing the request.",
            "request_id": request_id,
            "timestamp": time.time(),
        },
    )


# Mount versioned API routes
app.include_router(api_router)
app.include_router(web_portal_router)


@app.get("/", tags=["Root"])
async def root(request: Request):
    if "text/html" in request.headers.get("accept", ""):
        return HTMLResponse(content=WEB_PORTAL_HTML)
    return {
        "service": settings.SERVICE_NAME,
        "version": settings.SERVICE_VERSION,
        "environment": settings.ENVIRONMENT,
        "health_check": "/api/health",
        "readiness_check": "/api/ready",
    }
