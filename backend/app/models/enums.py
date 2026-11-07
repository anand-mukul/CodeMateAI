"""
CodeMate AI — Database & Domain Enums
Defines strongly-typed enumerations for user roles, account statuses,
device states, subscription intervals, and payment lifecycles in UPPERCASE.
"""

from enum import Enum


class UserRole(str, Enum):
    USER = "USER"
    ANALYST = "ANALYST"
    SUPPORT_AGENT = "SUPPORT_AGENT"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class AccountStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DISABLED = "DISABLED"


class AuthProvider(str, Enum):
    LOCAL = "LOCAL"
    GOOGLE = "GOOGLE"


class DeviceStatus(str, Enum):
    ACTIVE = "ACTIVE"
    REVOKED = "REVOKED"


class SessionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class BillingInterval(str, Enum):
    LIFETIME = "LIFETIME"
    DAY = "DAY"
    WEEK = "WEEK"
    MONTH = "MONTH"


class SubscriptionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELLED = "CANCELLED"
    HALTED = "HALTED"
    EXPIRED = "EXPIRED"


class PaymentStatus(str, Enum):
    CREATED = "CREATED"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class WebhookProcessingStatus(str, Enum):
    RECEIVED = "RECEIVED"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    IGNORED = "IGNORED"


class TicketStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    WAITING_FOR_USER = "WAITING_FOR_USER"
    WAITING_FOR_SUPPORT = "WAITING_FOR_SUPPORT"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class TicketPriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class PlanTier(str, Enum):
    FREE = "FREE"
    PLAN_CORE_PASS = "PLAN_CORE_PASS"
    PLAN_AUTOPILOT_PASS = "PLAN_AUTOPILOT_PASS"


class ProjectIndexStatus(str, Enum):
    QUEUED = "QUEUED"
    INDEXING = "INDEXING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class PatchStatus(str, Enum):
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    APPLIED = "APPLIED"
    REJECTED = "REJECTED"
    ROLLED_BACK = "ROLLED_BACK"


class RepairWorkflowStatus(str, Enum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class FeedbackStatus(str, Enum):
    NEW = "NEW"
    REVIEW_IN_PROGRESS = "REVIEW_IN_PROGRESS"
    RESOLVED = "RESOLVED"
    ARCHIVED = "ARCHIVED"


class FeatureRequestStatus(str, Enum):
    NEW = "NEW"
    UNDER_REVIEW = "UNDER_REVIEW"
    PLANNED = "PLANNED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    DECLINED = "DECLINED"
    DUPLICATE = "DUPLICATE"
    ON_HOLD = "ON_HOLD"


class SupportCategory(str, Enum):
    ACCOUNT_ACCESS = "ACCOUNT_ACCESS"
    BILLING_PAYMENT = "BILLING_PAYMENT"
    AI_FUNCTIONALITY = "AI_FUNCTIONALITY"
    EDITOR_INTEGRATION = "EDITOR_INTEGRATION"
    PROJECT_INTELLIGENCE = "PROJECT_INTELLIGENCE"
    BUG_REPORT = "BUG_REPORT"
    GENERAL_SUPPORT = "GENERAL_SUPPORT"


class SecuritySeverity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

