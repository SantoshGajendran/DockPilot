from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class EventItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_id: str
    timestamp: datetime
    action: str
    container_id: str
    container_name: str
    image: Optional[str] = None
    exit_code: Optional[int] = None
    is_oom: bool = False
    is_unexpected_exit: bool = False
    is_restart_loop: bool = False
    attributes: Dict[str, Any] = {}


class EventsListResponse(BaseModel):
    items: List[EventItem]
    total: int
    next_cursor: Optional[str] = None
    has_more: bool = False


class EventsFilterParams(BaseModel):
    container_id: Optional[str] = None
    container_name: Optional[str] = None
    action: Optional[str] = None
    incidents_only: bool = False
    since: Optional[datetime] = None
    until: Optional[datetime] = None
    limit: int = 50
    cursor: Optional[str] = None
