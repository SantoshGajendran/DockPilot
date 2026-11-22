from datetime import datetime
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from app.api.deps import get_events_service, require_role
from app.core.constants import Role
from app.models.user import User
from app.schemas.events import EventsFilterParams, EventsListResponse
from app.services.events_service import EventsService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=EventsListResponse)
@router.get("/", response_model=EventsListResponse, include_in_schema=False)
async def list_events(
    user: User = Depends(require_role(Role.VIEWER)),
    service: EventsService = Depends(get_events_service),
    container_id: Optional[str] = Query(None, description="Filter by container ID"),
    container_name: Optional[str] = Query(None, description="Filter by container name"),
    action: Optional[str] = Query(None, description="Filter by action"),
    incidents_only: bool = Query(False, description="Filter only incidents (OOM, restart loop, non-zero exit)"),
    since: Optional[datetime] = Query(None, description="Filter events after timestamp"),
    until: Optional[datetime] = Query(None, description="Filter events before timestamp"),
    limit: int = Query(50, ge=1, le=200, description="Page size limit"),
    cursor: Optional[str] = Query(None, description="Cursor for pagination"),
) -> EventsListResponse:
    filters = EventsFilterParams(
        container_id=container_id,
        container_name=container_name,
        action=action,
        incidents_only=incidents_only,
        since=since,
        until=until,
        limit=limit,
        cursor=cursor,
    )
    return await service.list_events(filters)


@router.get("/stream")
async def stream_events(
    user: User = Depends(require_role(Role.VIEWER)),
    service: EventsService = Depends(get_events_service),
) -> StreamingResponse:
    generator = service.stream_events()
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
