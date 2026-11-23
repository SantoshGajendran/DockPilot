export interface TelemetrySettings {
  collection_interval_seconds: number;
  metrics_interval_seconds: number;
  container_detail_stats_interval_seconds: number;
  host_metrics_interval_seconds: number;
  log_tail_default: number;
}

export interface RetentionSettings {
  retention_days: number;
  events_retention_days: number;
  audit_retention_days: number;
  terminal_transcript_retention_days: number;
  metrics_rollup_age_hours: number;
}

export interface SecuritySettings {
  secret_mask_patterns: string[];
  max_login_attempts: number;
  lockout_duration_minutes: number;
}

export interface AlertSettings {
  alert_eval_interval_seconds: number;
  alert_default_cooldown_minutes: number;
}

export interface FeatureFlagSettings {
  terminal_enabled: boolean;
  metrics_collection_enabled: boolean;
  auto_prune_enabled: boolean;
  registration_enabled: boolean;
}

export interface FieldMetadata {
  hot_reload: boolean;
  restart_required: boolean;
  help_text: string;
  min_value?: number;
  max_value?: number;
}

export interface SettingsResponse {
  telemetry: TelemetrySettings;
  retention: RetentionSettings;
  security: SecuritySettings;
  alerts: AlertSettings;
  features: FeatureFlagSettings;
  metadata: Record<string, FieldMetadata>;
}

export interface SettingsUpdateRequest {
  collection_interval_seconds?: number;
  metrics_interval_seconds?: number;
  container_detail_stats_interval_seconds?: number;
  host_metrics_interval_seconds?: number;
  log_tail_default?: number;

  retention_days?: number;
  events_retention_days?: number;
  audit_retention_days?: number;
  terminal_transcript_retention_days?: number;
  metrics_rollup_age_hours?: number;

  secret_mask_patterns?: string[];
  max_login_attempts?: number;
  lockout_duration_minutes?: number;

  alert_eval_interval_seconds?: number;
  alert_default_cooldown_minutes?: number;

  terminal_enabled?: boolean;
  metrics_collection_enabled?: boolean;
  auto_prune_enabled?: boolean;
  registration_enabled?: boolean;
}

export interface TableStorageItem {
  table_name: string;
  row_count: number;
  size_bytes: number;
  size_human: string;
}

export interface StorageUsageResponse {
  database_name: string;
  database_size_bytes: number;
  database_size_human: string;
  tables: TableStorageItem[];
  updated_at: string;
}

export interface RetentionRunResponse {
  metrics_downsampled: number;
  metrics_deleted: number;
  events_deleted: number;
  audit_logs_deleted: number;
  terminal_sessions_deleted: number;
  duration_seconds: number;
  timestamp: string;
  message: string;
}
