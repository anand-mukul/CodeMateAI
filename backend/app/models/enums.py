"""
CodeMate AI — Database & Domain Enums
Defines strongly-typed enumerations for user roles, account statuses,
device states, subscription intervals, and payment lifecycles.
"""

from enum import Enum


class UserRole(str, Enum):
    USER = "user"
    ANALYST = "analyst"
    SUPPORT_AGENT = "support_agent"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"


class AccountStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DISABLED = "disabled"


class AuthProvider(str, Enum):
    LOCAL = "local"
    GOOGLE = "google"


class DeviceStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class BillingInterval(str, Enum):
    LIFETIME = "lifetime"
    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    HALTED = "halted"
    EXPIRED = "expired"


class PaymentStatus(str, Enum):
    CREATED = "created"
    AUTHORIZED = "authorized"
    CAPTURED = "captured"
    FAILED = "failed"
    REFUNDED = "refunded"


class WebhookProcessingStatus(str, Enum):
    RECEIVED = "received"
    PROCESSED = "processed"
    FAILED = "failed"
    IGNORED = "ignored"


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
