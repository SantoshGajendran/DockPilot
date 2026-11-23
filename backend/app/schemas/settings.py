from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class TelemetrySettings(BaseModel):
    collection_interval_seconds: int = Field(default=5, ge=1, le=60)
    metrics_interval_seconds: int = Field(default=3, ge=1, le=30)
    container_detail_stats_interval_seconds: int = Field(default=2, ge=1, le=10)
    host_metrics_interval_seconds: int = Field(default=3, ge=1, le=30)
    log_tail_default: int = Field(default=200, ge=10, le=1000)


class RetentionSettings(BaseModel):
    retention_days: int = Field(default=30, ge=1, le=365)
    events_retention_days: int = Field(default=30, ge=1, le=365)
    audit_retention_days: int = Field(default=90, ge=7, le=365)
    terminal_transcript_retention_days: int = Field(default=30, ge=1, le=365)
    metrics_rollup_age_hours: int = Field(default=24, ge=1, le=168)


class SecuritySettings(BaseModel):
    secret_mask_patterns: List[str] = Field(
        default_factory=lambda: [
            "*PASSWORD*",
            "*SECRET*",
            "*TOKEN*",
            "*KEY*",
            "*AUTH*",
            "*CREDENTIAL*",
            "*PRIVATE*",
        ]
    )
    max_login_attempts: int = Field(default=5, ge=3, le=20)
    lockout_duration_minutes: int = Field(default=15, ge=1, le=60)


class AlertSettings(BaseModel):
    alert_eval_interval_seconds: int = Field(default=15, ge=5, le=300)
    alert_default_cooldown_minutes: int = Field(default=15, ge=1, le=1440)


class FeatureFlagSettings(BaseModel):
    terminal_enabled: bool = False
    metrics_collection_enabled: bool = True
    auto_prune_enabled: bool = False
    registration_enabled: bool = False


class FieldMetadata(BaseModel):
    hot_reload: bool
    restart_required: bool
    help_text: str
    min_value: Optional[float] = None
    max_value: Optional[float] = None


class SettingsResponse(BaseModel):
    telemetry: TelemetrySettings
    retention: RetentionSettings
    security: SecuritySettings
    alerts: AlertSettings
    features: FeatureFlagSettings
    metadata: Dict[str, FieldMetadata]


class SettingsUpdateRequest(BaseModel):
    collection_interval_seconds: Optional[int] = Field(default=None, ge=1, le=60)
    metrics_interval_seconds: Optional[int] = Field(default=None, ge=1, le=30)
    container_detail_stats_interval_seconds: Optional[int] = Field(default=None, ge=1, le=10)
    host_metrics_interval_seconds: Optional[int] = Field(default=None, ge=1, le=30)
    log_tail_default: Optional[int] = Field(default=None, ge=10, le=1000)

    retention_days: Optional[int] = Field(default=None, ge=1, le=365)
    events_retention_days: Optional[int] = Field(default=None, ge=1, le=365)
    audit_retention_days: Optional[int] = Field(default=None, ge=7, le=365)
    terminal_transcript_retention_days: Optional[int] = Field(default=None, ge=1, le=365)
    metrics_rollup_age_hours: Optional[int] = Field(default=None, ge=1, le=168)

    secret_mask_patterns: Optional[List[str]] = None
    max_login_attempts: Optional[int] = Field(default=None, ge=3, le=20)
    lockout_duration_minutes: Optional[int] = Field(default=None, ge=1, le=60)

    alert_eval_interval_seconds: Optional[int] = Field(default=None, ge=5, le=300)
    alert_default_cooldown_minutes: Optional[int] = Field(default=None, ge=1, le=1440)

    terminal_enabled: Optional[bool] = None
    metrics_collection_enabled: Optional[bool] = None
    auto_prune_enabled: Optional[bool] = None
    registration_enabled: Optional[bool] = None

    @field_validator("secret_mask_patterns")
    @classmethod
    def validate_patterns(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is not None:
            cleaned = [p.strip() for p in v if p and p.strip()]
            if not cleaned:
                raise ValueError("At least one secret mask pattern is required")
            return cleaned
        return v


class TableStorageItem(BaseModel):
    table_name: str
    row_count: int
    size_bytes: int
    size_human: str


class StorageUsageResponse(BaseModel):
    database_name: str
    database_size_bytes: int
    database_size_human: str
    tables: List[TableStorageItem]
    updated_at: datetime


class RetentionRunResponse(BaseModel):
    metrics_downsampled: int
    metrics_deleted: int
    events_deleted: int
    audit_logs_deleted: int
    terminal_sessions_deleted: int
    duration_seconds: float
    timestamp: datetime
    message: str
