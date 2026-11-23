import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, field_validator


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: datetime
    user_id: Optional[str] = None
    username: str
    action: str
    target_type: str
    target_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    result: str
    error_message: Optional[str] = None
    ip_address: Optional[str] = None

    @field_validator("id", mode="before")
    @classmethod
    def serialize_id(cls, v: Any) -> str:
        if isinstance(v, uuid.UUID):
            return str(v)
        return str(v)

    @field_validator("user_id", mode="before")
    @classmethod
    def serialize_user_id(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if isinstance(v, uuid.UUID):
            return str(v)
        return str(v)


class AuditLogsListResponse(BaseModel):
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuditLogFilterParams(BaseModel):
    user: Optional[str] = None
    action: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[str] = None
    result: Optional[str] = None
    since: Optional[datetime] = None
    until: Optional[datetime] = None
    page: int = 1
    page_size: int = 50
    sort_order: str = "desc"
