from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_host_service, require_role
from app.core.constants import Role
from app.models.user import User
from app.schemas.host import (
    DockerDiskUsageResponse,
    HostHistoryResponse,
    HostInfoResponse,
    HostLiveMetricsResponse,
)
from app.services.host_service import HostService

router = APIRouter()


@router.get("/info", response_model=HostInfoResponse)
async def get_host_info(
    host_service: HostService = Depends(get_host_service),
    current_user: User = Depends(require_role(Role.VIEWER)),
) -> HostInfoResponse:
    """Retrieve host machine specs, OS, CPU cores, RAM, and Docker version."""
    return await host_service.get_host_info()


@router.get("/metrics", response_model=HostLiveMetricsResponse)
async def get_host_live_metrics(
    host_service: HostService = Depends(get_host_service),
    current_user: User = Depends(require_role(Role.VIEWER)),
) -> HostLiveMetricsResponse:
    """Retrieve live CPU, RAM, swap, mounts/inodes, disk I/O, network rates, temperatures, and top processes."""
    return host_service.collect_live_metrics()


@router.get("/metrics/history", response_model=HostHistoryResponse)
async def get_host_metrics_history(
    range: str = Query("1h", pattern="^(1h|6h|24h|7d)$", description="Time window for metrics history"),
    db: AsyncSession = Depends(get_db),
    host_service: HostService = Depends(get_host_service),
    current_user: User = Depends(require_role(Role.VIEWER)),
) -> HostHistoryResponse:
    """Retrieve downsampled historical host metrics."""
    return await host_service.get_metrics_history(db=db, range_str=range)


@router.get("/docker-usage", response_model=DockerDiskUsageResponse)
async def get_docker_disk_usage(
    host_service: HostService = Depends(get_host_service),
    current_user: User = Depends(require_role(Role.VIEWER)),
) -> DockerDiskUsageResponse:
    """Retrieve Docker disk usage breakdown for images, containers, volumes, and build cache."""
    return await host_service.get_docker_disk_usage()
