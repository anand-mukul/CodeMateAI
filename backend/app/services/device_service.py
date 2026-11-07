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
from app.schemas.auth import DeviceRegisterRequest, DeviceResponse, DeviceLimitReachedResponse
from app.db.base import utc_now


class DeviceService:
    @classmethod
    async def get_user_plan_device_limit(cls, db: AsyncSession, user_id: str) -> int:
        """Retrieves the effective device limit based on the user's active subscription."""
        # Find active subscription
        sub_query = select(Subscription).where(
            and_(Subscription.user_id == user_id, Subscription.status == "active")
        ).order_by(Subscription.created_at.desc())
        sub_res = await db.execute(sub_query)
        sub = sub_res.scalars().first()

        plan_id = sub.plan_id if sub else "free"
        plan_query = select(Plan).where(Plan.id == plan_id)
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
            existing_device.device_status = "active"
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

        active_devices_query = select(UserDevice).where(
            and_(UserDevice.user_id == user.id, UserDevice.device_status == "active")
        )
        active_devices_res = await db.execute(active_devices_query)
        active_devices = active_devices_res.scalars().all()

        if len(active_devices) >= allowed_limit:
            # Plan device limit reached
            device_dtos = [DeviceResponse.model_validate(d) for d in active_devices]
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "detail": f"Device limit reached. Your plan allows up to {allowed_limit} registered device(s).",
                    "code": "DEVICE_LIMIT_REACHED",
                    "allowed_limit": allowed_limit,
                    "registered_devices": [d.model_dump(mode="json") for d in device_dtos],
                },
            )

        new_device = UserDevice(
            user_id=user.id,
            device_id=data.device_id,
            device_name=data.device_name,
            browser_name=data.browser_name,
            browser_version=data.browser_version,
            extension_version=data.extension_version,
            device_status="active",
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

        device.device_status = "revoked"
        device.revoked_at = utc_now()
        await db.commit()

