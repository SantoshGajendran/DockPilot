# Design Specification: Master Prompt 15 - Settings

## 1. Overview
Master Prompt 15 delivers runtime application tuning without redeployment. It provides:
1. `GET/PUT /settings` for runtime-editable values: collection interval, retention days, default log tail, secret-masking patterns, alert defaults, and feature flags.
2. Field validation bounds and immutable audit logging for every configuration change.
3. Live runtime propagation: flag toggles and configuration values take effect immediately without restarting the backend process.
4. Automated and on-demand retention engine (`POST /settings/retention/run`) that aggregates/downsamples raw container telemetry into hourly rollups and purges expired records across metrics, events, audit logs, and terminal sessions.
5. Storage monitoring (`GET /settings/storage`): live database size and table row counts.
6. Angular `/settings` route: grouped form sections, field-level help text, restart-required vs hot-reload markers, unsaved-changes guard, and storage usage breakdown.

## 2. Global Rules & Constraints
- **Zero hardcoded domain terms**: all limits, defaults, intervals, table names, and labels come from `config/settings.yaml`, database, or typed constants.
- **Role checks**: `PUT /settings` and `POST /settings/retention/run` require `Role.ADMIN` (HTTP 403 for `operator`/`viewer`). `GET /settings` and `GET /settings/storage` are available to authenticated users.
- **Audit-first control**: every change writes an audit record (`settings.update`, `settings.retention_run`).
- **No external Public IP exposure**: binds strictly to `127.0.0.1`.

## 3. Database Architecture
### 3.1 `system_settings` Table
Stores runtime overrides persisted in PostgreSQL:
- `key`: VARCHAR(64) PK
- `value`: JSON (stores typed setting object or scalar)
- `updated_at`: TIMESTAMP WITH TIME ZONE
- `updated_by`: VARCHAR(64) nullable

### 3.2 `metric_rollups` Table
Stores downsampled hourly metrics:
- `id`: UUID PK
- `container_id`: VARCHAR(64) INDEX
- `bucket_time`: TIMESTAMP WITH TIME ZONE INDEX (truncated to hour)
- `cpu_percent_avg`: FLOAT
- `cpu_percent_max`: FLOAT
- `memory_bytes_avg`: BIGINT
- `memory_bytes_max`: BIGINT
- `sample_count`: INTEGER
- `created_at`: TIMESTAMP WITH TIME ZONE

## 4. Backend Architecture
### 4.1 Configuration & Bounds (`config/settings.yaml`)
Defines validation limits:
```yaml
validation_bounds:
  collection_interval_seconds: { min: 1, max: 60 }
  metrics_interval_seconds: { min: 1, max: 30 }
  container_detail_stats_interval_seconds: { min: 1, max: 10 }
  host_metrics_interval_seconds: { min: 1, max: 30 }
  log_tail_default: { min: 10, max: 1000 }
  retention_days: { min: 1, max: 365 }
  events_retention_days: { min: 1, max: 365 }
  audit_retention_days: { min: 7, max: 365 }
  terminal_transcript_retention_days: { min: 1, max: 365 }
  alert_eval_interval_seconds: { min: 5, max: 300 }
  alert_default_cooldown_minutes: { min: 1, max: 1440 }
  max_login_attempts: { min: 3, max: 20 }
  lockout_duration_minutes: { min: 1, max: 60 }
  metrics_rollup_age_hours: 24
```

### 4.2 Endpoints
- `GET /api/v1/settings` & `/settings`: Returns grouped settings, current values, and metadata.
- `PUT /api/v1/settings` & `/settings`: Updates settings, validates bounds, persists to `system_settings`, hot-patches in-memory settings, writes audit log.
- `GET /api/v1/settings/storage` & `/settings/storage`: Returns database size and per-table row counts.
- `POST /api/v1/settings/retention/run` & `/settings/retention/run`: Triggers retention downsampling and purges expired rows; returns summary.

## 5. Frontend Architecture
- Route: `/settings` (`SettingsComponent`).
- Sections:
  1. Telemetry & Collection
  2. Retention Policies
  3. Security & Secret Masking
  4. Alert Defaults
  5. Feature Flags
  6. Storage Usage & Retention Purge
- Form dirty detection and `canDeactivate` guard to warn user before discarding changes.
- Badges: `Hot-reloaded` (green) and `Restart required` (amber).
- One-click "Run Retention Now" with confirmation and result banner.
