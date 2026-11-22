from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_resource_service, require_role
from app.core.constants import Role
from app.models.user import User
from app.schemas.jobs import JobResponse
from app.schemas.resources import (
    ImagesListResponse,
    NetworksListResponse,
    PruneConfirmRequest,
    PrunePreviewResponse,
    PruneResultResponse,
    PullImageRequest,
    VolumesListResponse,
)
from app.services.job_service import JobManager, get_job_manager
from app.services.resource_service import ResourceService

router = APIRouter()


# --- Images ---

@router.get("/images", response_model=ImagesListResponse)
async def list_images(
    current_user: User = Depends(require_role(Role.VIEWER)),
    resource_service: ResourceService = Depends(get_resource_service),
) -> ImagesListResponse:
    """List Docker images with metadata, usage, and protected status."""
    return await resource_service.list_images()


@router.delete("/images/{id:path}")
async def remove_image(
    id: str,
    request: Request,
    current_user: User = Depends(require_role(Role.OPERATOR)),
    db: AsyncSession = Depends(get_db),
    resource_service: ResourceService = Depends(get_resource_service),
):
    """Remove a Docker image by ID or tag with safety checks."""
    client_ip = request.client.host if request.client else None
    await resource_service.remove_image(
        image_id=id,
        current_user=current_user,
        ip=client_ip,
        db=db,
    )
    return {"ok": True, "message": f"Image '{id}' removed successfully."}


@router.post("/images/pull", response_model=JobResponse)
async def pull_image(
    payload: PullImageRequest,
    request: Request,
    current_user: User = Depends(require_role(Role.OPERATOR)),
    db: AsyncSession = Depends(get_db),
    resource_service: ResourceService = Depends(get_resource_service),
) -> JobResponse:
    """Initiate an image pull background job."""
    client_ip = request.client.host if request.client else None
    return await resource_service.start_pull_image(
        image_name=payload.image_name,
        current_user=current_user,
        ip=client_ip,
        db=db,
    )


@router.post("/images/prune/preview", response_model=PrunePreviewResponse)
async def preview_prune_images(
    current_user: User = Depends(require_role(Role.OPERATOR)),
    resource_service: ResourceService = Depends(get_resource_service),
) -> PrunePreviewResponse:
    """Preview dangling images to be pruned and generate a confirmation token."""
    return await resource_service.preview_prune_images()


@router.post("/images/prune", response_model=PruneResultResponse)
async def confirm_prune_images(
    payload: PruneConfirmRequest,
    request: Request,
    current_user: User = Depends(require_role(Role.OPERATOR)),
    db: AsyncSession = Depends(get_db),
    resource_service: ResourceService = Depends(get_resource_service),
) -> PruneResultResponse:
    """Execute image pruning using a valid confirmation token."""
    client_ip = request.client.host if request.client else None
    return await resource_service.confirm_prune(
        resource_type="images",
        confirmation_token=payload.confirmation_token,
        current_user=current_user,
        ip=client_ip,
        db=db,
    )


# --- Volumes ---

@router.get("/volumes", response_model=VolumesListResponse)
async def list_volumes(
    current_user: User = Depends(require_role(Role.VIEWER)),
    resource_service: ResourceService = Depends(get_resource_service),
) -> VolumesListResponse:
    """List Docker volumes with metadata, usage, and protected status."""
    return await resource_service.list_volumes()


@router.delete("/volumes/{name:path}")
async def remove_volume(
    name: str,
    request: Request,
    current_user: User = Depends(require_role(Role.OPERATOR)),
    db: AsyncSession = Depends(get_db),
    resource_service: ResourceService = Depends(get_resource_service),
):
    """Remove a Docker volume by name with safety checks."""
    client_ip = request.client.host if request.client else None
    await resource_service.remove_volume(
        volume_name=name,
        current_user=current_user,
        ip=client_ip,
        db=db,
    )
    return {"ok": True, "message": f"Volume '{name}' removed successfully."}


@router.post("/volumes/prune/preview", response_model=PrunePreviewResponse)
async def preview_prune_volumes(
    current_user: User = Depends(require_role(Role.OPERATOR)),
    resource_service: ResourceService = Depends(get_resource_service),
) -> PrunePreviewResponse:
    """Preview unused volumes to be pruned and generate a confirmation token."""
    return await resource_service.preview_prune_volumes()


@router.post("/volumes/prune", response_model=PruneResultResponse)
async def confirm_prune_volumes(
    payload: PruneConfirmRequest,
    request: Request,
    current_user: User = Depends(require_role(Role.OPERATOR)),
    db: AsyncSession = Depends(get_db),
    resource_service: ResourceService = Depends(get_resource_service),
) -> PruneResultResponse:
    """Execute volume pruning using a valid confirmation token."""
    client_ip = request.client.host if request.client else None
    return await resource_service.confirm_prune(
        resource_type="volumes",
        confirmation_token=payload.confirmation_token,
        current_user=current_user,
        ip=client_ip,
        db=db,
    )


# --- Networks ---

@router.get("/networks", response_model=NetworksListResponse)
async def list_networks(
    current_user: User = Depends(require_role(Role.VIEWER)),
    resource_service: ResourceService = Depends(get_resource_service),
) -> NetworksListResponse:
    """List Docker networks with metadata, connected containers, and protected status."""
    return await resource_service.list_networks()


@router.delete("/networks/{id:path}")
async def remove_network(
    id: str,
    request: Request,
    current_user: User = Depends(require_role(Role.OPERATOR)),
    db: AsyncSession = Depends(get_db),
    resource_service: ResourceService = Depends(get_resource_service),
):
    """Remove a Docker network by ID or name with safety checks."""
    client_ip = request.client.host if request.client else None
    await resource_service.remove_network(
        network_id=id,
        current_user=current_user,
        ip=client_ip,
        db=db,
    )
    return {"ok": True, "message": f"Network '{id}' removed successfully."}


@router.post("/networks/prune/preview", response_model=PrunePreviewResponse)
async def preview_prune_networks(
    current_user: User = Depends(require_role(Role.OPERATOR)),
    resource_service: ResourceService = Depends(get_resource_service),
) -> PrunePreviewResponse:
    """Preview unused networks to be pruned and generate a confirmation token."""
    return await resource_service.preview_prune_networks()


@router.post("/networks/prune", response_model=PruneResultResponse)
async def confirm_prune_networks(
    payload: PruneConfirmRequest,
    request: Request,
    current_user: User = Depends(require_role(Role.OPERATOR)),
    db: AsyncSession = Depends(get_db),
    resource_service: ResourceService = Depends(get_resource_service),
) -> PruneResultResponse:
    """Execute network pruning using a valid confirmation token."""
    client_ip = request.client.host if request.client else None
    return await resource_service.confirm_prune(
        resource_type="networks",
        confirmation_token=payload.confirmation_token,
        current_user=current_user,
        ip=client_ip,
        db=db,
    )


# --- Jobs Stream Helper ---

@router.get("/jobs/{job_id}/stream")
async def stream_resource_job(
    job_id: str,
    current_user: User = Depends(require_role(Role.VIEWER)),
    job_mgr: JobManager = Depends(get_job_manager),
) -> StreamingResponse:
    """Stream live output for a resource pull job."""
    job = job_mgr.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found.",
        )
    generator = job_mgr.stream_job_sse(job_id)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
