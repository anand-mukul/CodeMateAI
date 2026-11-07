"""
CodeMate AI — Models Module
Exports all SQLAlchemy ORM models.
"""

from app.models.user import User
from app.models.device import UserDevice
from app.models.session import UserSession
from app.models.subscription import (
    Plan,
    Subscription,
    Payment,
    WebhookEvent,
    UsageRecord,
    PromoCode,
    PromoRedemption,
)
from app.models.security_log import SecurityLog
from app.models.project import (
    Project,
    ProjectFile,
    ProjectSymbol,
    ProjectDependency,
    ProjectIndexJob,
    ProjectPatch,
    ProjectPatchFile,
    ProjectWorkflow,
)
from app.models.analytics import AnalyticsEvent, AnalyticsDailyAggregate, AnalyticsPreference
from app.models.admin import AdminAuditLog
from app.models.feedback import UserFeedback, FeatureRequest, FeatureRequestVote, FeatureRequestComment
from app.models.support import SupportTicket, SupportMessage, SupportAttachment
from app.models.feature_flag import FeatureFlag, FeatureFlagChange

__all__ = [
    "User",
    "UserDevice",
    "UserSession",
    "Plan",
    "Subscription",
    "Payment",
    "WebhookEvent",
    "UsageRecord",
    "PromoCode",
    "PromoRedemption",
    "SecurityLog",
    "Project",
    "ProjectFile",
    "ProjectSymbol",
    "ProjectDependency",
    "ProjectIndexJob",
    "ProjectPatch",
    "ProjectPatchFile",
    "ProjectWorkflow",
    "AnalyticsEvent",
    "AnalyticsDailyAggregate",
    "AnalyticsPreference",
    "AdminAuditLog",
    "UserFeedback",
    "FeatureRequest",
    "FeatureRequestVote",
    "FeatureRequestComment",
    "SupportTicket",
    "SupportMessage",
    "SupportAttachment",
    "FeatureFlag",
    "FeatureFlagChange",
]

