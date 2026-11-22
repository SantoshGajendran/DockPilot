from datetime import datetime
from typing import List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field


class TerminalResizeMessage(BaseModel):
    type: str = "resize"
    cols: int = Field(ge=1, le=1000, default=80)
    rows: int = Field(ge=1, le=1000, default=24)


class TerminalStatusResponse(BaseModel):
    enabled: bool
    idle_timeout_seconds: int
    max_session_seconds: int
    max_concurrent_sessions: int
    active_sessions_count: int
    record_sessions: bool
    allowed_shells: List[str]


class TerminalSessionResponse(BaseModel):
    id: uuid.UUID
    container_id: str
    container_name: str
    username: str
    shell: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    status: str
    bytes_sent: int = 0
    bytes_received: int = 0
    ip_address: Optional[str] = None
    transcript: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TerminalSessionsListResponse(BaseModel):
    sessions: List[TerminalSessionResponse]
    total_count: int
