"""
CodeMate AI — Main API Router
Mounts all versioned API endpoints under the /api prefix.
"""

from fastapi import APIRouter
from app.api.routes import (
    health,
    analyze,
    explain,
    generate,
    optimize,
    fix,
    auth,
    devices,
    sessions,
    subscriptions,
    payments,
    projects,
    analytics,
    admin,
    feedback,
    feature_requests,
    support,
    feature_flags,
)

api_router = APIRouter(prefix="/api")

# System & status endpoints
api_router.include_router(health.router)

# Phase 6: Authentication, Devices & Sessions
api_router.include_router(auth.router)
api_router.include_router(devices.router)
api_router.include_router(sessions.router)

# Phase 6: Subscriptions, Entitlements & Payments
api_router.include_router(subscriptions.router)
api_router.include_router(payments.router)

# Phase 7: Multi-File Project Intelligence & Spring Boot Agent
api_router.include_router(projects.router)

# Phase 8: Analytics, Admin Governance, Feedback, Feature Requests & Support
api_router.include_router(analytics.router)
api_router.include_router(admin.router)
api_router.include_router(feedback.router)
api_router.include_router(feature_requests.router)
api_router.include_router(support.router)
api_router.include_router(feature_flags.router)

# Problem understanding endpoints
api_router.include_router(analyze.router)
api_router.include_router(explain.router)

# Solution generation, optimization & error diagnosis endpoints
api_router.include_router(generate.router)
api_router.include_router(optimize.router)
api_router.include_router(fix.router)

