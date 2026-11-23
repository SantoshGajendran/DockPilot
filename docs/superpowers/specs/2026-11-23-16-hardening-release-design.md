# Design Specification: Master Prompt 16 - Hardening and Release

## 1. Overview
Master Prompt 16 is the final milestone for DockPilot, ensuring the standalone container monitoring and management platform is production-ready, strictly secured, self-monitoring, and verifiable end-to-end.

Key Deliverables:
1. **Container & Process Hardening**: Non-root backend and frontend execution; locked-down Docker socket proxy allowing only necessary API endpoints.
2. **Application Security & Resilience**: Strict security headers, CORS origin verification, request body size limiters, structured JSON logging.
3. **Application Telemetry**: Prometheus `/metrics` endpoint exposing HTTP metrics, system metrics, container counts, active sessions, and alert states.
4. **Automated CI Security Pipeline**: GitHub Actions workflow running tests, `pip-audit`, `npm audit`, and container vulnerability scans (Trivy).
5. **Playwright End-to-End Test Suite**: Complete user scenarios covering authentication, dashboard telemetry, container restart control, log streams, alert rule creation, and RBAC rejection.
6. **Disaster Recovery & Operations**: Production backup and restore scripts (`scripts/backup.sh`, `scripts/restore.sh`) and a comprehensive one-page operations runbook (`docs/runbook.md`).
7. **Version 1.0 Release**: Tag version 1.0.0 across all manifests and documentation.

## 2. Security & Hardening Architecture
### 2.1 Non-Root Container Execution
- **Backend**: Python 3.12 slim, runs under UID 1001 (`dockpilot:dockpilot`) with no root capabilities.
- **Frontend**: Nginx unprivileged or static serving with security headers.
- **Docker Compose**: `security_opt: [no-new-privileges:true]` on all service definitions.

### 2.2 Docker Socket Proxy Scoping
Only endpoints required by DockPilot are enabled:
```yaml
environment:
  - CONTAINERS=1
  - IMAGES=1
  - VOLUMES=1
  - NETWORKS=1
  - EXEC=1
  - INFO=1
  - EVENTS=1
  - PING=1
  - VERSION=1
  - POST=1
  - DELETE=1
  - SYSTEM=1
  # Explicitly disabled attack surfaces:
  - BUILD=0
  - COMMIT=0
  - CONFIGS=0
  - DISTRIBUTION=0
  - NODES=0
  - PLUGINS=0
  - SECRETS=0
  - SERVICES=0
  - SESSION=0
  - SWARM=0
  - TASKS=0
```

### 2.3 Security Middleware
- **Security Headers**:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy`: strict directives restricting script/style/connect origins.
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- **Request Body Size Limiter**:
  - Configurable `request_max_body_bytes` (default: 10,485,760 bytes = 10MB).
  - Returns HTTP 413 Payload Too Large when violated.
- **Structured JSON Logging**:
  - Emits JSON logs in production with timestamp, log level, correlation ID, path, HTTP status, latency.

### 2.4 Prometheus `/metrics`
Exposes application telemetry in Prometheus text format (version 0.0.4):
- `dockpilot_http_requests_total{method, path, status}`
- `dockpilot_http_request_duration_seconds{method, path}`
- `dockpilot_monitored_containers_total{status}`
- `dockpilot_active_sessions_total`
- `dockpilot_active_alerts_total`
- `dockpilot_app_info{version="1.0.0"}`

## 3. End-to-End Testing (Playwright)
Playwright test suite in `e2e/`:
1. `auth.spec.ts`: Login with valid admin credentials, session cookie issuance, redirect to `/dashboard`.
2. `dashboard.spec.ts`: Verify overview KPI cards (containers, CPU, RAM, disk, events).
3. `containers.spec.ts`: Container restart action with audit logging confirmation.
4. `logs.spec.ts`: Container logs explorer, streaming/snapshot log lines.
5. `alerts.spec.ts`: Create new alert rule modal, verification in rules table.
6. `rbac.spec.ts`: Viewer role login and assertion of 403 Forbidden / disabled actions on container control and settings.

## 4. Disaster Recovery & Runbook
- `scripts/backup.sh` & `scripts/backup.ps1`: `pg_dump` with gzip compression and SHA256 checksum generation.
- `scripts/restore.sh` & `scripts/restore.ps1`: Validates file integrity and safely restores PostgreSQL schema and data.
- `docs/runbook.md`: Emergency manual admin password reset, secret rotation, container recovery, and operational checklist.
