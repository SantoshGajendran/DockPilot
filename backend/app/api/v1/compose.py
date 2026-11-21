from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_compose_service, get_db, require_role
from app.core.constants import Role
from app.models.user import User
from app.schemas.compose import ComposeActionResponse, ComposeProjectsListResponse
from app.services.compose_service import ComposeService

router = APIRouter()


@router.get("/projects", response_model=ComposeProjectsListResponse)
async def list_compose_projects(
    current_user: User = Depends(require_role(Role.VIEWER)),
    db: AsyncSession = Depends(get_db),
    compose_service: ComposeService = Depends(get_compose_service),
) -> ComposeProjectsListResponse:
    """List Docker Compose projects with aggregate status and services."""
    return await compose_service.list_projects(db=db)


@router.post("/projects/{name}/{action}", response_model=ComposeActionResponse)
async def execute_compose_action_endpoint(
    name: str,
    action: str,
    request: Request,
    current_user: User = Depends(require_role(Role.OPERATOR)),
    db: AsyncSession = Depends(get_db),
    compose_service: ComposeService = Depends(get_compose_service),
) -> ComposeActionResponse:
    """Execute a controlled docker compose lifecycle action."""
    client_ip = request.client.host if request.client else None
    return await compose_service.execute_project_action(
        project_name=name,
        action=action,
        current_user=current_user,
        ip=client_ip,
        db=db,
    )
