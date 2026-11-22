from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class NotificationChannelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    channel_type: str = Field(..., max_length=32)
    enabled: bool = True
    config: Dict[str, Any] = Field(default_factory=dict)


class NotificationChannelCreate(NotificationChannelBase):
    secret: Optional[str] = Field(None, description="Write-only credential or secret token/webhook URL")


class NotificationChannelUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    enabled: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None
    secret: Optional[str] = Field(None, description="Write-only new credential if updating")


class NotificationChannelResponse(NotificationChannelBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    has_secret: bool = False
    created_at: datetime
    updated_at: datetime


class NotificationChannelsListResponse(BaseModel):
    channels: List[NotificationChannelResponse]
    total: int


class NotificationRouteBase(BaseModel):
    channel_id: int
    name: str = Field(..., min_length=1, max_length=128)
    min_severity: str = Field("warning", max_length=32)
    rule_type: Optional[str] = Field(None, max_length=64)
    scope_type: str = Field("all", max_length=32)
    scope_value: Optional[str] = Field(None, max_length=128)
    enabled: bool = True


class NotificationRouteCreate(NotificationRouteBase):
    pass


class NotificationRouteUpdate(BaseModel):
    channel_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    min_severity: Optional[str] = Field(None, max_length=32)
    rule_type: Optional[str] = Field(None, max_length=64)
    scope_type: Optional[str] = Field(None, max_length=32)
    scope_value: Optional[str] = Field(None, max_length=128)
    enabled: Optional[bool] = None


class NotificationRouteResponse(NotificationRouteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel_name: Optional[str] = None
    created_at: datetime


class NotificationRoutesListResponse(BaseModel):
    routes: List[NotificationRouteResponse]
    total: int


class NotificationDeliveryLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    channel_id: Optional[int] = None
    channel_name: str
    channel_type: str
    event_id: Optional[int] = None
    alert_title: str
    severity: str
    status: str
    attempts: int
    error_message: Optional[str] = None
    payload_preview: Optional[str] = None
    created_at: datetime


class DeliveryLogListResponse(BaseModel):
    logs: List[NotificationDeliveryLogResponse]
    total: int


class NotificationTestResult(BaseModel):
    success: bool
    message: str
    attempts: int = 1
