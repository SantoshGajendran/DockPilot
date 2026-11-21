from typing import Optional
from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_docker_gateway, require_role
from app.core.config import get_settings
from app.core.constants import Role
from app.docker.interface import DockerGateway
from app.models.user import User
from app.schemas.container import (
    BulkActionRequest,
    BulkActionResponse,
    ContainersListResponse,
    DeleteTokenResponse,
)
from app.services.containers_service import (
    delete_container,
    execute_bulk_actions,
    execute_container_action,
    generate_delete_token,
    list_containers,
    stream_container_metrics,
)

router = APIRouter()


@router.get("", response_model=ContainersListResponse)
@router.get("/", response_model=ContainersListResponse, include_in_schema=False)
async def get_containers(
    q: Optional[str] = Query(None, description="Search by name, ID or image"),
    state: Optional[str] = Query(None, description="Filter by state (running, exited, etc.)"),
    health: Optional[str] = Query(None, description="Filter by health (healthy, unhealthy, starting, none)"),
    compose_project: Optional[str] = Query(None, description="Filter by docker compose project"),
    label: Optional[str] = Query(None, description="Filter by label key or key=value"),
    sort_by: str = Query("name", description="Field to sort by"),
    sort_order: str = Query("asc", description="Sort order: asc or desc"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, description="Items per page"),
    user: User = Depends(require_role(Role.VIEWER)),
    gateway: DockerGateway = Depends(get_docker_gateway),
) -> ContainersListResponse:
    return await list_containers(
        gateway=gateway,
        q=q,
        state=state,
        health=health,
        compose_project=compose_project,
        label=label,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        page_size=page_size,
    )


@router.get("/stream")
async def get_containers_stream(
    request: Request,
    once: bool = Query(False, include_in_schema=False),
    user: User = Depends(require_role(Role.VIEWER)),
    gateway: DockerGateway = Depends(get_docker_gateway),
) -> StreamingResponse:
    settings = get_settings()
    generator = stream_container_metrics(
        gateway=gateway,
        interval_seconds=settings.containers_stream_interval_seconds,
        once=once,
    )
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/bulk", response_model=BulkActionResponse)
async def bulk_action(
    request: Request,
    body: BulkActionRequest,
    user: User = Depends(require_role(Role.OPERATOR)),
    gateway: DockerGateway = Depends(get_docker_gateway),
    db: AsyncSession = Depends(get_db),
) -> BulkActionResponse:
    client_ip = request.client.host if request.client else None
    return await execute_bulk_actions(
        gateway=gateway,
        action=body.action,
        container_ids=body.container_ids,
        user_id=user.id,
        username=user.username,
        ip=client_ip,
        db=db,
    )


@router.post("/{container_id}/delete-token", response_model=DeleteTokenResponse)
async def get_delete_token(
    container_id: str,
    user: User = Depends(require_role(Role.ADMIN)),
    gateway: DockerGateway = Depends(get_docker_gateway),
) -> DeleteTokenResponse:
    return await generate_delete_token(
        gateway=gateway,
        container_id=container_id,
        user_id=user.id,
    )


@router.post("/{container_id}/{action}")
async def container_action(
    container_id: str,
    action: str,
    request: Request,
    user: User = Depends(require_role(Role.OPERATOR)),
    gateway: DockerGateway = Depends(get_docker_gateway),
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    await execute_container_action(
        gateway=gateway,
        container_id=container_id,
        action=action,
        user_id=user.id,
        username=user.username,
        ip=client_ip,
        db=db,
    )
    return {"message": f"Action '{action}' executed successfully on container {container_id}"}


@router.delete("/{container_id}")
async def remove_container_endpoint(
    container_id: str,
    request: Request,
    token: str = Query(..., description="Confirmation delete token"),
    user: User = Depends(require_role(Role.ADMIN)),
    gateway: DockerGateway = Depends(get_docker_gateway),
    db: AsyncSession = Depends(get_db),
):
    client_ip = request.client.host if request.client else None
    await delete_container(
        gateway=gateway,
        container_id=container_id,
        token=token,
        user_id=user.id,
        username=user.username,
        ip=client_ip,
        db=db,
    )
    return {"message": f"Container {container_id} removed successfully"}
