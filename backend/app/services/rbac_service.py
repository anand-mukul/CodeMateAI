"""
CodeMate AI — Phase 8 Role-Based Access Control (RBAC) & Administrative Governance
Enforces server-side permission checks, least privilege, and immutable audit logging.
"""

from enum import Enum
import json
from typing import Any, Dict, List, Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import logger
from app.db.base import utc_now
from app.db.session import get_db
from app.models.admin import AdminAuditLog
from app.models.user import User
from app.services.entitlement_service import get_current_user


class AdminRole(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    SUPPORT_AGENT = "SUPPORT_AGENT"
    ANALYST = "ANALYST"
    USER = "USER"


class AdminPermission(str, Enum):
    VIEW_ANALYTICS = "view_analytics"
    VIEW_USERS = "view_users"
    MANAGE_USERS = "manage_users"
    MANAGE_SUBSCRIPTIONS = "manage_subscriptions"
    MANAGE_SUPPORT_TICKETS = "manage_support_tickets"
    MANAGE_FEATURE_REQUESTS = "manage_feature_requests"
    MANAGE_FEATURE_FLAGS = "manage_feature_flags"
    MANAGE_ADMIN_ROLES = "manage_admin_roles"
    VIEW_AUDIT_LOGS = "view_audit_logs"


# Strict Role-to-Permissions Matrix
ROLE_PERMISSIONS: Dict[AdminRole, List[AdminPermission]] = {
    AdminRole.SUPER_ADMIN: [
        AdminPermission.VIEW_ANALYTICS,
        AdminPermission.VIEW_USERS,
        AdminPermission.MANAGE_USERS,
        AdminPermission.MANAGE_SUBSCRIPTIONS,
        AdminPermission.MANAGE_SUPPORT_TICKETS,
        AdminPermission.MANAGE_FEATURE_REQUESTS,
        AdminPermission.MANAGE_FEATURE_FLAGS,
        AdminPermission.MANAGE_ADMIN_ROLES,
        AdminPermission.VIEW_AUDIT_LOGS,
    ],
    AdminRole.ADMIN: [
        AdminPermission.VIEW_ANALYTICS,
        AdminPermission.VIEW_USERS,
        AdminPermission.MANAGE_USERS,
        AdminPermission.MANAGE_SUBSCRIPTIONS,
        AdminPermission.MANAGE_SUPPORT_TICKETS,
        AdminPermission.MANAGE_FEATURE_REQUESTS,
        AdminPermission.MANAGE_FEATURE_FLAGS,
        AdminPermission.VIEW_AUDIT_LOGS,
    ],
    AdminRole.SUPPORT_AGENT: [
        AdminPermission.VIEW_USERS,
        AdminPermission.MANAGE_SUPPORT_TICKETS,
        AdminPermission.MANAGE_FEATURE_REQUESTS,
    ],
    AdminRole.ANALYST: [
        AdminPermission.VIEW_ANALYTICS,
        AdminPermission.VIEW_AUDIT_LOGS,
    ],
    AdminRole.USER: [],
}


def require_admin_permission(permission: AdminPermission):
    """
    FastAPI dependency factory enforcing server-side permission checks.
    Rejects ordinary users, revoked sessions, and unauthorized roles.
    """
    async def _dependency(
        user: User = Depends(get_current_user),
    ) -> User:
        user_role_str = (user.role or "USER").upper()
        try:
            role = AdminRole(user_role_str)
        except ValueError:
            role = AdminRole.USER

        allowed_perms = ROLE_PERMISSIONS.get(role, [])
        if permission not in allowed_perms:
            logger.warning(
                f"[RBAC Denied] User '{user.email}' (role: {role.value}) attempted to access permission '{permission.value}'."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "INSUFFICIENT_ADMIN_PERMISSIONS",
                    "message": f"Action requires '{permission.value}' permission. Your assigned role is '{role.value}'.",
                    "required_permission": permission.value,
                    "user_role": role.value,
                },
            )
        return user

    return _dependency


def require_admin_role(*allowed_roles: AdminRole):
    """
    FastAPI dependency verifying that the caller holds one of the specified admin roles.
    """
    async def _dependency(
        user: User = Depends(get_current_user),
    ) -> User:
        user_role_str = (user.role or "USER").upper()
        try:
            role = AdminRole(user_role_str)
        except ValueError:
            role = AdminRole.USER

        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "ACCESS_DENIED_ROLE_RESTRICTED",
                    "message": f"Access restricted to {[r.value for r in allowed_roles]}. Your role is '{role.value}'.",
                },
            )
        return user

    return _dependency


class AuditService:
    @classmethod
    async def log_admin_action(
        cls,
        db: AsyncSession,
        admin_user: User,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
    ) -> AdminAuditLog:
        """
        Creates an immutable audit log entry for administrative modifications.
        """
        ip = None
        if request and request.client:
            ip = request.client.host

        audit_entry = AdminAuditLog(
            admin_user_id=admin_user.id,
            target_user_id=target_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details_json=json.dumps(details) if details else None,
            ip_address=ip,
            created_at=utc_now(),
        )
        db.add(audit_entry)
        await db.commit()
        await db.refresh(audit_entry)

        logger.info(
            f"[Admin Audit] Admin '{admin_user.email}' executed '{action}' on {resource_type}:{resource_id}."
        )
        return audit_entry

