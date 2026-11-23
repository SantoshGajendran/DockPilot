from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user, get_settings_service, require_role
from app.core.constants import Role
from app.models.user import User
from app.schemas.settings import (
    RetentionRunResponse,
    SettingsResponse,
    SettingsUpdateRequest,
    StorageUsageResponse,
)
from app.services.settings_service import SettingsService

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings_endpoint(
    service: SettingsService = Depends(get_settings_service),
    current_user: User = Depends(get_current_user),
) -> SettingsResponse:
    """Get active application runtime settings and configuration metadata."""
    return await service.get_all_settings()


@router.put("", response_model=SettingsResponse)
async def update_settings_endpoint(
    updates: SettingsUpdateRequest,
    service: SettingsService = Depends(get_settings_service),
    current_user: User = Depends(require_role(Role.ADMIN)),
) -> SettingsResponse:
    """Update runtime configuration settings. Restricted to administrators."""
    return await service.update_settings(updates=updates, user=current_user)


@router.get("/storage", response_model=StorageUsageResponse)
async def get_storage_usage_endpoint(
    service: SettingsService = Depends(get_settings_service),
    current_user: User = Depends(get_current_user),
) -> StorageUsageResponse:
    """Get PostgreSQL database and table storage breakdown."""
    return await service.get_storage_usage()


@router.post("/retention/run", response_model=RetentionRunResponse)
async def run_retention_endpoint(
    service: SettingsService = Depends(get_settings_service),
    current_user: User = Depends(require_role(Role.ADMIN)),
) -> RetentionRunResponse:
    """Trigger manual data retention rollup and expired row purge. Restricted to administrators."""
    return await service.run_retention(user=current_user)
