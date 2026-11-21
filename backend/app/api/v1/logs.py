from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request

from app.api.deps import get_docker_gateway, require_role
from app.core.constants import Role
from app.docker.interface import DockerGateway
from app.models.user import User
from app.schemas.logs import LogSearchResponse
from app.services.logs_service import search_logs

router = APIRouter()


@router.get("/search", response_model=LogSearchResponse)
async def search_logs_endpoint(
    request: Request,
    container_ids: List[str] = Query(default=[], description="List or comma-separated container IDs"),
    q: Optional[str] = Query(None, description="Search term or regex pattern"),
    regex: bool = Query(False, description="Whether q is a regular expression"),
    since: Optional[int] = Query(None, description="Unix timestamp start"),
    until: Optional[int] = Query(None, description="Unix timestamp end"),
    tail: int = Query(500, ge=1, le=2000, description="Max lines to inspect per container"),
    user: User = Depends(require_role(Role.VIEWER)),
    gateway: DockerGateway = Depends(get_docker_gateway),
) -> LogSearchResponse:
    # Handle comma-separated IDs if provided as a single item
    parsed_ids: List[str] = []
    for item in container_ids:
        for cid in item.split(","):
            cleaned = cid.strip()
            if cleaned and cleaned not in parsed_ids:
                parsed_ids.append(cleaned)

    # If no containers explicitly specified, default to all running/known containers
    if not parsed_ids:
        containers = await gateway.list_containers(all=True)
        parsed_ids = [c["id"] for c in containers if "id" in c]

    return await search_logs(
        gateway=gateway,
        container_ids=parsed_ids,
        q=q,
        regex=regex,
        since=since,
        until=until,
        tail=tail,
    )
