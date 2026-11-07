"""
CodeMate AI — Device Management Endpoints (Layer 1)
Allows registration, listing, renaming, and revocation of browser installation identifiers.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import DeviceRegisterRequest, DeviceResponse, DeviceUpdateRequest
from app.services.device_service import DeviceService
from app.services.entitlement_service import get_current_user

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.post("/register", response_model=DeviceResponse)
async def register_device(
    payload: DeviceRegisterRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Registers a new browser installation UUID for the user.
    Enforces plan-level device limit.
    """
    device, _ = await DeviceService.register_device(db, user, payload)
    return device


@router.get("", response_model=List[DeviceResponse])
async def list_registered_devices(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists all registered installations for the current user."""
    devices = await DeviceService.list_devices(db, user.id)
    return devices


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: str,
    payload: DeviceUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allows user to give a friendly name to a registered device."""
    return await DeviceService.update_device_name(db, user.id, device_id, payload.device_name)


@router.delete("/{device_id}", status_code=status.HTTP_200_OK)
async def revoke_device(
    device_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revokes a registered installation."""
    await DeviceService.revoke_device(db, user.id, device_id)
    return {"success": True, "message": f"Device {device_id} revoked successfully."}

