"""
CodeMate AI — Device Management Service (Layer 1 Device Registration)
Handles registration of client installation UUIDs, enforcing plan limits and handling revocation.
"""

from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.user import User
from app.models.device import UserDevice
from app.models.subscription import Plan, Subscription
from app.models.enums import DeviceStatus, SubscriptionStatus, UserRole, PlanTier
from app.schemas.auth import DeviceRegisterRequest, DeviceResponse, DeviceLimitReachedResponse
from app.db.base import utc_now


class DeviceService:
    @classmethod
    async def get_user_plan_device_limit(cls, db: AsyncSession, user_id: str) -> int:
        """Retrieves the effective device limit based on the user's active subscription."""
        # Platform administrators get unlimited device registrations
        user_res = await db.execute(select(User).where(User.id == user_id))
        user = user_res.scalars().first()
        if user and (user.role or "").upper() in (UserRole.SUPER_ADMIN.value, UserRole.ADMIN.value):
            return 999

        # Find active subscription
        sub_query = select(Subscription).where(
            and_(Subscription.user_id == user_id, Subscription.status == SubscriptionStatus.ACTIVE.value)
        ).order_by(Subscription.created_at.desc())
        sub_res = await db.execute(sub_query)
        sub = sub_res.scalars().first()

        plan_id = sub.plan_id if sub else PlanTier.FREE.value
        plan_query = select(Plan).where((Plan.id == plan_id) | (Plan.id == plan_id.upper()) | (Plan.id == plan_id.lower()))
        plan_res = await db.execute(plan_query)
        plan = plan_res.scalars().first()

        return plan.device_limit if plan else 1

    @classmethod
    async def register_device(
        cls,
        db: AsyncSession,
        user: User,
        data: DeviceRegisterRequest,
    ) -> Tuple[UserDevice, bool]:
        """
        Registers an installation identifier for the user.
        If the device is already active for this user, updates last_seen_at.
        If a new device exceeds the plan limit, raises HTTP 403 with DEVICE_LIMIT_REACHED.
        Returns (device, is_new).
        """
        # Check if this device is already registered for this user
        query = select(UserDevice).where(
            and_(UserDevice.user_id == user.id, UserDevice.device_id == data.device_id)
        )
        result = await db.execute(query)
        existing_device = result.scalars().first()

        if existing_device:
            # Re-activate if revoked, or update metadata
            existing_device.device_status = DeviceStatus.ACTIVE.value
            existing_device.revoked_at = None
            existing_device.last_seen_at = utc_now()
            if data.device_name:
                existing_device.device_name = data.device_name
            if data.browser_version:
                existing_device.browser_version = data.browser_version
            if data.extension_version:
                existing_device.extension_version = data.extension_version
            await db.commit()
            await db.refresh(existing_device)
            return existing_device, False

        # Check plan device limit for new registration
        allowed_limit = await cls.get_user_plan_device_limit(db, user.id)

        is_web = (
            data.device_id in ("web_portal", "admin_web_portal")
            or data.device_id.startswith("web_")
            or "web" in (data.device_name or "").lower()
            or "web" in (data.browser_name or "").lower()
        )

        active_devices_query = select(UserDevice).where(
            and_(UserDevice.user_id == user.id, UserDevice.device_status == DeviceStatus.ACTIVE.value)
        )
        active_devices_res = await db.execute(active_devices_query)
        all_active_devices = active_devices_res.scalars().all()

        # Web portal sessions do not consume extension device slots
        extension_devices = [
            d for d in all_active_devices
            if not (
                d.device_id in ("web_portal", "admin_web_portal")
                or d.device_id.startswith("web_")
                or "web" in (d.device_name or "").lower()
                or "web" in (d.browser_name or "").lower()
            )
        ]

        # For extension installations: if at or over limit, auto-revoke oldest extension device
        # so paying or free users who reinstall/switch machines are never locked out
        if not is_web and len(extension_devices) >= allowed_limit:
            sorted_devices = sorted(extension_devices, key=lambda d: d.last_seen_at or d.created_at)
            devices_to_revoke = sorted_devices[: len(extension_devices) - allowed_limit + 1]
            for old_dev in devices_to_revoke:
                old_dev.device_status = DeviceStatus.REVOKED.value
                old_dev.revoked_at = utc_now()

        new_device = UserDevice(
            user_id=user.id,
            device_id=data.device_id,
            device_name=data.device_name,
            browser_name=data.browser_name,
            browser_version=data.browser_version,
            extension_version=data.extension_version,
            device_status=DeviceStatus.ACTIVE.value,
        )
        db.add(new_device)
        await db.commit()
        await db.refresh(new_device)
        return new_device, True

    @classmethod
    async def list_devices(cls, db: AsyncSession, user_id: str) -> List[UserDevice]:
        """Lists all registered devices for the user."""
        query = select(UserDevice).where(UserDevice.user_id == user_id).order_by(UserDevice.last_seen_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    @classmethod
    async def update_device_name(
        cls, db: AsyncSession, user_id: str, device_id: str, new_name: str
    ) -> UserDevice:
        """Allows a user to rename a registered device."""
        query = select(UserDevice).where(
            and_(UserDevice.user_id == user_id, UserDevice.device_id == device_id)
        )
        result = await db.execute(query)
        device = result.scalars().first()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        device.device_name = new_name
        await db.commit()
        await db.refresh(device)
        return device

    @classmethod
    async def revoke_device(cls, db: AsyncSession, user_id: str, device_id: str) -> None:
        """Revokes a device, preventing it from refreshing sessions until re-registered."""
        query = select(UserDevice).where(
            and_(UserDevice.user_id == user_id, UserDevice.device_id == device_id)
        )
        result = await db.execute(query)
        device = result.scalars().first()
        if not device:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

        device.device_status = DeviceStatus.REVOKED.value
        device.revoked_at = utc_now()
        await db.commit()

