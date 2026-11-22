from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AlertRuleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = Field(None, max_length=256)
    rule_type: str = Field(..., max_length=64)
    scope_type: str = Field("all", max_length=32)
    scope_value: Optional[str] = Field(None, max_length=128)
    severity: str = Field("warning", max_length=32)
    threshold: Optional[float] = None
    duration_minutes: int = Field(0, ge=0)
    cooldown_minutes: int = Field(15, ge=1)
    enabled: bool = True


class AlertRuleCreate(AlertRuleBase):
    pass


class AlertRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=128)
    description: Optional[str] = Field(None, max_length=256)
    rule_type: Optional[str] = Field(None, max_length=64)
    scope_type: Optional[str] = Field(None, max_length=32)
    scope_value: Optional[str] = Field(None, max_length=128)
    severity: Optional[str] = Field(None, max_length=32)
    threshold: Optional[float] = None
    duration_minutes: Optional[int] = Field(None, ge=0)
    cooldown_minutes: Optional[int] = Field(None, ge=1)
    enabled: Optional[bool] = None


class AlertRuleResponse(AlertRuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class AlertRulesListResponse(BaseModel):
    rules: List[AlertRuleResponse]
    total: int


class AlertEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rule_id: int
    rule_name: str
    rule_type: str
    severity: str
    target_type: str
    target_id: Optional[str] = None
    target_name: Optional[str] = None
    status: str
    message: str
    value: Optional[float] = None
    threshold: Optional[float] = None
    started_at: datetime
    resolved_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    created_at: datetime


class AlertEventsListResponse(BaseModel):
    events: List[AlertEventResponse]
    total: int


class AlertEventAckRequest(BaseModel):
    acknowledged: bool = True


class AlertSilenceCreate(BaseModel):
    rule_id: Optional[int] = None
    container_id: Optional[str] = None
    duration_minutes: int = Field(60, ge=1)
    reason: Optional[str] = Field(None, max_length=256)


class AlertSilenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rule_id: Optional[int] = None
    container_id: Optional[str] = None
    silenced_until: datetime
    reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime


class AlertTargetMatch(BaseModel):
    target_id: Optional[str] = None
    target_name: Optional[str] = None
    would_fire: bool
    current_value: Optional[float] = None
    threshold: Optional[float] = None
    message: str


class AlertDryRunRequest(BaseModel):
    rule_type: str
    scope_type: str = "all"
    scope_value: Optional[str] = None
    threshold: Optional[float] = None
    duration_minutes: int = 0


class AlertDryRunResponse(BaseModel):
    rule_type: str
    matches_count: int
    targets: List[AlertTargetMatch]


class ActiveAlertsCountResponse(BaseModel):
    active_count: int
