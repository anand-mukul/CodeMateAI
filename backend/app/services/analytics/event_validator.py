"""
CodeMate AI — Phase 8 Analytics Event Validator
Enforces strict allowlists, rejects client-forged billing events, and enforces temporal validity.
"""

from datetime import timedelta
from typing import Tuple, Optional
from app.db.base import utc_now, ensure_utc
from app.services.analytics.event_schema import AnalyticsEventDTO


# Complete list of allowlisted event names
ALLOWLISTED_EVENTS = {
    # Account & Auth
    "user_registered",
    "user_login_success",
    "user_login_failed",
    "user_logout",
    "email_verified",
    # Product & Editor Interactions
    "extension_activated",
    "editor_detected",
    "feature_opened",
    "feature_used",
    # AI Features
    "ai_request_started",
    "ai_request_completed",
    "ai_request_failed",
    "code_generated",
    "code_explained",
    "code_analyzed",
    "code_optimized",
    "code_debugged",
    # Project Intelligence
    "project_imported",
    "project_index_started",
    "project_index_completed",
    "project_index_failed",
    "multi_file_plan_created",
    "patch_generated",
    "patch_applied",
    "patch_rolled_back",
    "ephemeral_blueprint_created",
    "ephemeral_file_completed",
    # Billing & Subscriptions (Server only)
    "subscription_started",
    "subscription_renewed",
    "subscription_cancelled",
    "payment_success",
    "payment_failed",
    # Customer Experience
    "feedback_submitted",
    "feature_request_created",
    "feature_request_voted",
    "support_ticket_created",
    "support_ticket_resolved",
}

# Events that can ONLY be recorded by server-side processes, NEVER accepted from client API
SERVER_ONLY_EVENTS = {
    "user_registered",
    "email_verified",
    "subscription_started",
    "subscription_renewed",
    "subscription_cancelled",
    "payment_success",
    "payment_failed",
}

# Allowlisted feature names
ALLOWLISTED_FEATURES = {
    "problem_analysis",
    "problem_explain",
    "solution_generation",
    "solution_optimization",
    "solution_diagnose_fix",
    "smart_clipboard",
    "editor_inspector",
    "reliability_telemetry",
    "project_workspace",
    "ephemeral_solving",
    "account_management",
    "feature_requests",
    "user_feedback",
    "customer_support",
}


class EventValidator:
    @classmethod
    def validate_client_event(cls, event: AnalyticsEventDTO) -> Tuple[bool, Optional[str]]:
        """
        Validates an incoming event from the client application.
        Rejects unlisted events, server-only events, and timestamp drifts.
        """
        # 1. Event Name Check
        if event.event_name not in ALLOWLISTED_EVENTS:
            return False, f"Event '{event.event_name}' is not in the allowlisted event taxonomy."

        # 2. Server-Only Check (Prevent forged billing/payment events)
        if event.event_name in SERVER_ONLY_EVENTS:
            return False, f"Event '{event.event_name}' is a server-only trusted metric and cannot be reported by client."

        # 3. Feature Name Check (if supplied)
        if event.feature_name and event.feature_name not in ALLOWLISTED_FEATURES:
            return False, f"Feature name '{event.feature_name}' is not in the allowlisted feature set."

        # 4. Temporal Validity
        now = utc_now()
        ts = ensure_utc(event.timestamp) or now
        if ts < now - timedelta(hours=48):
            return False, "Event timestamp is older than the allowed 48-hour ingestion window."
        if ts > now + timedelta(minutes=5):
            return False, "Event timestamp is in the future."

        return True, None

