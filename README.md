# DockPilot

Standalone web application to monitor and control Docker containers on an Ubuntu server.

## Overview

DockPilot provides real-time monitoring and management of Docker containers with a secure, responsive, and operator-friendly interface. Designed with a strict security posture:
- The backend binds by default to `127.0.0.1` and is never exposed directly.
- Docker socket access is mediated through a restricted, filtered proxy (`tecnativa/docker-socket-proxy`).
- Every control action writes an audit record before execution and updates it upon completion.
- Role-based access controls (`viewer`, `operator`, `admin`) are enforced in the backend first, then mirrored in the frontend.

## Stack

- **Frontend:** Angular 19 (strict mode, standalone components, signals, RxJS), Angular Material, Chart.js via ng2-charts, xterm.js, Jest, Playwright.
- **Backend:** Python 3.12, FastAPI, Docker SDK, psutil, SQLAlchemy 2 (asyncpg), Alembic, APScheduler, pytest.
- **Database:** PostgreSQL 16 Alpine.
- **Realtime:** Server-Sent Events (SSE) for metrics, logs, and container events; WebSocket for terminal sessions.
- **Packaging:** Docker Compose with restricted socket-proxy in front of `/var/run/docker.sock`.

## System Architecture

```
       Browser (Client)
             │
   ┌─────────┴─────────┐
   │                   │
   ▼ (Port 4200)       ▼ (Port 8000)
┌─────────────┐     ┌────────────────────────────────────────────────────────┐
│  Frontend   │     │                        Backend                         │
│ (Angular 19 │     │                       (FastAPI)                        │
│   Nginx)    │     └───────┬────────────────────────────┬───────────────────┘
└─────────────┘             │                            │
                            ▼                            ▼
                 ┌───────────────────────┐    ┌─────────────────────┐
                 │  PostgreSQL Database  │    │ Docker Socket Proxy │
                 │      (Port 5432)      │    │     (Port 2375)     │
                 │ Users, Audit Logs,    │    └──────────┬──────────┘
                 │ Alert Configurations  │               │ (ro socket)
                 └───────────────────────┘               ▼
                                                  /var/run/docker.sock
```

### Architectural Principles

1. **Abstract Gateway Layer:** `DockerGateway` interface abstracts all Docker Engine operations. Production uses `EngineGateway`, while unit tests use `FakeGateway` without external Docker dependencies.
2. **Configuration-Driven:** All intervals, thresholds, roles, colors, and navigation routes are defined in `config/app.yaml` or typed constants files—no hardcoded domain terms.
3. **Audit-First Control:** Database models enforce immutable audit logging for all container control actions.
4. **Security by Default:** Services bind to `127.0.0.1`. Docker socket is protected by `docker-socket-proxy`.

## Prerequisites

- Docker & Docker Compose (v2+)
- Python 3.12+ (for local backend development and test execution)
- Node.js 20+ & npm (for local frontend development and test execution)

## Running the Application

### Full Stack via Docker Compose

To start all services (`backend`, `frontend`, `postgres`, `socket-proxy`):

```bash
docker compose up --build
```

Services will be accessible at:
- **Frontend:** `http://127.0.0.1:4200`
- **Backend API:** `http://127.0.0.1:8000`
- **Health Check:** `http://127.0.0.1:8000/health`
- **API Documentation:** `http://127.0.0.1:8000/docs` (development mode only)

To stop services:

```bash
docker compose down
```

### Local Development

#### Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

#### Frontend
```bash
cd frontend
npm install
npm start
```

## Running Tests

### Backend Unit Tests
Execute the pytest suite (161 unit tests):
```bash
cd backend && pytest -v
```
Or from root:
```bash
python -m pytest backend/tests -v
```

### Frontend Unit Tests & Build
Execute the Jest unit test suite (231 unit tests across 50 suites):
```bash
cd frontend && npm test
```

Execute the production build:
```bash
cd frontend && npm run build
```

---

## Status & Progress

### Prompt 00: Foundation
- **Status:** Complete
- **Backend:** FastAPI foundation running with Async SQLAlchemy 2 + Alembic initial migration for `users` and `audit_log`. `DockerGateway` interface with `EngineGateway` and `FakeGateway`. `/health` and `/version` endpoints passing unit tests.
- **Frontend:** Angular 19 workspace configured in strict mode. App shell with collapsible sidebar rendered from typed navigation config. `SseService` with exponential backoff and connection status signals.
- **Packaging:** Multi-container `docker-compose.yml` orchestrating `backend`, `frontend`, `postgres`, and `socket-proxy`.

### Prompt 01: Login Page & Authentication Subsystem
- **Status:** Complete
- **Authentication Endpoints:**
  - `POST /api/v1/auth/login`: Authenticates credentials, returns short-lived JWT access token in JSON body, and sets httpOnly refresh token cookie.
  - `POST /api/v1/auth/refresh`: Issues a refreshed access token and rotates the refresh token cookie.
  - `POST /api/v1/auth/logout`: Clears authentication cookies and audits session termination.
  - `GET /api/v1/auth/me`: Returns current authenticated user profile (`id`, `username`, `email`, `role`, `created_at`).
- **Bootstrap Credentials:**
  - Default administrative account: `admin` / `dockpilot_admin_2026` (role: `admin`). Auto-bootstrapped on startup if user table is empty.
- **Security Features:**
  - Password hashing via Argon2id (`argon2-cffi`).
  - Dual-token lifecycle: 15-minute access token in JSON response, 7-day refresh token in secure `httpOnly`, `SameSite=Lax` cookie.
  - Brute-force protection: 5 consecutive failed attempts trigger a 15-minute account lockout with remaining lockout time reporting.
  - Audit logging: All login successes, failures, lockouts, and logouts record structured audit events.
  - RBAC authorization dependencies (`require_role`) enforcing viewer, operator, and admin hierarchies.
- **Frontend UI & State:**
  - Standalone lazy-loaded `/login` component styled with modern CSS cards and Angular Material.
  - Reactive form with client-side validation, visibility toggle for password, loading spinner, and alert banners.
  - Angular signals-driven `AuthService` with automatic silent token refresh on application boot (`APP_INITIALIZER`).
  - Functional router guards: `authGuard` redirecting unauthenticated users to `/login` with `returnUrl`, and `roleGuard` enforcing RBAC.
  - `ErrorInterceptor` catching 401 responses and triggering `SessionExpiredDialogComponent` with re-authentication modal dialog.

### Prompt 02: Overview Dashboard
- **Status:** Complete
- **Overview Endpoints:**
  - `GET /api/v1/overview`: Snapshot endpoint returning host resource metrics, container counts grouped by state, top CPU and memory consumers, recent Docker events, and active alert counts.
  - `GET /api/v1/overview/stream`: Real-time Server-Sent Events (SSE) streaming endpoint pushing updated system metrics at configured collection intervals (`2s`). Supports dual authentication via `Authorization: Bearer <token>` header or `?token=<token>` query parameter for standard browser `EventSource` clients.
- **Background Collector Service:**
  - `OverviewCollector` asynchronously samples host telemetry via `psutil` (CPU percent, memory, disk, load averages, uptime) and container stats via `DockerGateway` (`container_stats` and `container_events`).
  - Broadcasts metric frames to subscriber queues with bounded queue overflow protection and graceful error isolation.
  - Snapshot caching layer ensures fast responses on cold loads.
- **Frontend UI & State:**
  - Lazy-loaded `/dashboard` standalone component driven by a lightweight, reactive Angular signal store (`DashboardStore`).
  - Host resource gauges displaying CPU, Memory, Disk usage, and Load averages with calibrated threshold warnings.
  - Chart.js container status donut chart grouping containers into running, exited, restarting, unhealthy, and paused states.
  - Top resource consumers ranked by CPU (%) and Memory (MiB/GiB).
  - Live Docker events feed displaying recent container lifecycle events with relative timestamps.
  - Stale-data watchdog monitoring SSE heartbeat freshness and displaying a visual warning banner when connection drops or pauses.
  - Empty-server state and error recovery states with manual retry controls.

### Prompt 03: Containers List
- **Status:** Complete
- **Backend Endpoints:**
  - `GET /api/v1/containers`: Search (`q`), filter (`state`, `health`, `compose_project`, `label`), sort, and pagination.
  - `GET /api/v1/containers/stream`: Multiplexed SSE stream delivering live CPU %, Memory bytes/%, state, and health.
  - `POST /api/v1/containers/{id}/{action}`: Single container lifecycle execution (`start`, `stop`, `restart`, `pause`, `unpause`, `kill`) with pre- and post-audit tracking (requires `operator`+).
  - `POST /api/v1/containers/bulk`: Multi-select bulk action endpoint with individual container success/failure reports and per-container audit trail.
  - `POST /api/v1/containers/{id}/delete-token`: Generates signed temporary delete confirmation token (requires `admin`).
  - `DELETE /api/v1/containers/{id}?token=...`: Two-phase permanent removal of container with token validation and audit logging (requires `admin`).
- **Frontend UI & State:**
  - Lazy-loaded `/containers` route with Angular Material sortable table, state/health chips, CPU/Memory visual mini-progress-bars, and ports mapping.
  - Filter bar supporting text search, state select, health select, compose project, and localStorage preset saving/loading.
  - Multi-select row selection with floating bulk action toolbar (`Start`, `Stop`, `Restart`, `Pause`, `Unpause`, `Kill`).
  - Lifecycle action confirmation dialogs, plus a high-friction destructive deletion dialog requiring typing the exact container name.
  - Reactive signal store (`ContainersStore`) with optimistic UI state transitions and automatic rollback on backend failure.

### Prompt 04: Container Detail Page
- **Status:** Complete
- **Backend Endpoints & Service:**
  - `GET /api/v1/containers/{id}`: Detailed container inspection returning image, command, created timestamp, restart policy, mounts, networks, ports, resource limits, healthcheck logs, and secret-masked environment variables.
  - `POST /api/v1/containers/{id}/env/reveal`: Admin-only secret unmasking endpoint with mandatory pre- and post-action audit logging.
  - `GET /api/v1/containers/{id}/stats`: Live Server-Sent Events (SSE) telemetry stream pushing live CPU utilization %, memory bytes/%, network Rx/Tx bytes, and disk block read/write rates.
  - `GET /api/v1/containers/{id}/metrics?range=1h|6h|24h|7d`: Historical container telemetry query with automated downsampling to at most 100 points for smooth charting.
  - Configurable `secret_mask_patterns` in `config/app.yaml` (`*PASSWORD*`, `*SECRET*`, `*TOKEN*`, `*KEY*`, etc.).
  - Database table `container_metrics` with Alembic migration `0002_container_metrics.py`.
- **Frontend UI & State:**
  - Standalone lazy-loaded route `/containers/:id` (`ContainerDetailComponent`) with five deep-linkable tabs (`?tab=overview|metrics|logs|config|events`).
  - **Overview Tab:** Header status badges, key facts card (image, command, restart policy, ports), and live telemetry gauges (CPU %, memory with limit, network I/O, block I/O).
  - **Metrics Tab:** Range selector (`1h`, `6h`, `24h`, `7d`) with four responsive Chart.js line charts (CPU %, Memory with limit line, Network I/O, Block I/O).
  - **Logs Tab:** Monospace terminal log container.
  - **Config Tab:** Environment variables table with `********` secret masking, "Reveal Secrets" action for admins, Mounts table, Network settings table, and Labels key-value tags.
  - **Events Tab:** Chronological lifecycle events timeline.
  - Reactive `ContainerDetailStore` using Angular signals and clean lifecycle cleanup.
  - All 75 backend tests (`pytest`) and 85 frontend tests across 17 suites (`npm test`) passing with 0 warnings in production `ng build`.

### Prompt 05: Logs Explorer
- **Status:** Complete
- **Backend Endpoints & Demuxing:**
  - `GET /api/v1/containers/{id}/logs`: Live Server-Sent Events (SSE) log stream with real-time backpressure drop threshold monitoring (`log_backpressure_drop_threshold: 500`), or historical snapshot retrieval (`follow=false`).
  - `GET /api/v1/logs/search`: Multi-container search over historical time windows (`since`, `until`, `limit`) with regex or substring filtering and a 10MB byte scan safety budget (`log_search_max_bytes_scanned: 10485760`).
  - 8-byte multiplex header demuxer (`demux_docker_stream`) handling Docker stdout/stderr frame decoding, raw TTY fallback, RFC3339 timestamp extraction, and log level tagging (`INFO`, `WARN`, `ERROR`, `DEBUG`).
  - Bounded async streaming queue with automatic backpressure markers (`[dockpilot warning: skipped X log lines due to slow consumer]`).
- **Frontend UI & State:**
  - Reusable `LogViewerComponent` (`cdk-virtual-scroll-viewport`) rendering thousands of log lines at 60 FPS with auto-scroll, manual scroll-up pause, line-wrap toggle, timestamp toggle, clipboard copy, and file download.
  - `AnsiParserService` converting standard ANSI color codes and text styling into sanitized HTML spans.
  - Container detail **Logs** tab integrated with `LogViewerComponent` for real-time live streaming.
  - Standalone `/logs` explorer page (`LogsExplorerComponent`) with multi-container picker, time-range presets (`Last 15m`, `Last 1h`, `Last 6h`, `Last 24h`, `Custom`), level filtering, and scan budget warnings.
  - All 86 backend tests (`pytest`) and 100 frontend tests across 22 suites (`npm test`) passing with 0 warnings in production `ng build`.

### Prompt 06: Host / Server Page
- **Status:** Complete
- **Backend Endpoints & Service:**
  - `GET /api/v1/host/info`: Host machine specs, OS release, kernel, CPU model, physical & logical core count, total memory, Docker version, and storage driver.
  - `GET /api/v1/host/metrics`: Real-time system telemetry via `psutil` covering per-core CPU %, RAM and Swap utilization, storage mounts with inode exhaustion tracking (`os.statvfs`), disk I/O rates (read/write bytes & operations/sec), network throughput per interface (Rx/Tx bytes & packets/sec), system load averages (1m, 5m, 15m), thermal sensors (when available), and top consuming host processes.
  - `GET /api/v1/host/metrics/history?range=1h|6h|24h|7d`: Historical time-series telemetry downsampled to at most 100 points.
  - `GET /api/v1/host/docker-usage`: Docker disk usage footprint (`docker system df`) breaking down images, containers, volumes, and build cache with reclaimable space estimates.
  - Database table `host_metrics` with Alembic migration `0003_host_metrics.py`.
- **Frontend UI & State:**
  - Standalone lazy-loaded route `/host` (`HostComponent`).
  - Host info header card with system badges and processor specifications.
  - Per-core CPU visual heatmap grid with color-coded warning/critical load levels.
  - Memory and Swap utilization progress bars with threshold styling.
  - Storage Mounts table displaying disk space utilization alongside inode usage counts and percentage alerts.
  - Docker Disk Footprint cards displaying total and reclaimable sizes for images, containers, volumes, and build cache.
  - 4-quadrant interactive Chart.js telemetry history charts with range picker (`1h`, `6h`, `24h`, `7d`).
  - Top Consuming Processes table with sorting by CPU % or Memory %.
  - All 96 backend tests (`pytest`) and 113 frontend tests across 25 suites (`npm test`) passing with 0 warnings in production `ng build`.

### Prompt 07: Compose Projects
- **Status:** Complete
- **Backend Endpoints & Safe Subprocess Execution:**
  - `GET /api/v1/compose/projects`: Aggregates active and stopped containers by `com.docker.compose.project` label, deriving composite project state (`running`, `partially_running`, `stopped`, `unhealthy`, `empty`), running container counts, config file paths, and last audit record.
  - `POST /api/v1/compose/projects/{name}/{action}`: Triggers controlled Compose stack actions (`up`, `down`, `restart`, `pull`, `stop`, `start`) restricted to `operator` and `admin` roles.
  - Directory Allow-list Security: Subprocess execution is strictly gated against configured allow-lists (`compose_project_allow_paths` and `compose_project_paths` in `config/app.yaml`). Unlisted directories return a 403 Forbidden with audit logging.
  - Async Job Subsystem: Subprocess jobs run asynchronously under `JobManager`, tracking execution status (`running`, `completed`, `failed`) and streaming line-by-line stdout/stderr logs via Server-Sent Events (`GET /api/v1/jobs/{id}/stream`).
  - Controlled Execution: Subprocess args are passed explicitly (`["docker", "compose", "-f", ...]` without `shell=True`) to prevent shell injection. Pre- and post-action audit logs record operator identity, target action, and execution outcome.
- **Frontend UI & State:**
  - Standalone lazy-loaded route `/projects` (`ComposeProjectsComponent`).
  - Responsive project cards displaying aggregate status badges, running service count chips, config file path with clipboard copy button, and last audit action record.
  - Action buttons (`Up`, `Down`, `Restart`, `Pull`, `Stop`, `Start`) with RBAC enforcement disabling actions for `viewer` accounts.
  - Expandable nested table detailing service names, container names, images, container runtime states, and health statuses.
  - Real-time `JobOutputDialogComponent` modal launched upon triggering an action, streaming live ANSI-formatted terminal output via SSE with autoscroll and status badges.
  - All 107 backend tests (`pytest`) and 130 frontend tests across 29 suites (`npm test`) passing with 0 warnings in production `ng build`.

### Prompt 08: Events Timeline
- **Status:** Complete
- **Backend Event Ingestion & Incident Detection:**
  - Database table `container_events` with Alembic migration `0004_container_events.py`.
  - Asynchronous background listener `EventListenerService` connected to Docker event stream with exponential backoff / reconnect interval and deduplication by event key.
  - Derived failure flags:
    - OOM Kill (`is_oom`): `action == 'oom'` or `attributes.oom == 'true'`.
    - Unexpected Exit (`is_unexpected_exit`): `action == 'die'` with non-zero exit code.
    - Restart Loop Detection (`is_restart_loop`): counts container crashes/restarts within configurable sliding window (`restart_loop_window_seconds: 300`) and flags flapping containers exceeding `restart_loop_threshold: 3`.
  - Endpoints:
    - `GET /api/v1/events`: Multi-criteria filtering (container, action, incidents_only, date range) with efficient cursor-based pagination.
    - `GET /api/v1/events/stream`: Real-time Server-Sent Events (SSE) event feed with keepalive heartbeats.
- **Frontend UI & Reusable Timeline Component:**
  - Standalone lazy-loaded route `/events` (`EventsComponent`):
    - Filter controls for container name search, action selection, and incidents-only toggle.
    - Real-time SSE toggle button (Live / Paused) and manual refresh.
    - Cursor-based "Load More Events" pagination.
  - Reusable `EventsTimelineComponent` (`<dp-events-timeline>`):
    - Vertical timeline grouped by day ("Today", "Yesterday", and formatted dates).
    - Color-coded icons and badges per event action.
    - High-visibility incident tags for Restart Loops, OOM Kills, and non-zero exit codes.
    - Compact mode (`[compact]="true"`) embedded in Overview Dashboard (`/dashboard`) and Container Detail Events tab (`/containers/:id?tab=events`).
  - All 116 backend tests (`pytest`) and 147 frontend tests across 33 suites (`npm test`) passing with 0 warnings in production `ng build`.

### Prompt 09: Alerts Engine & Management
- **Status:** Complete
- **Backend Alert Evaluation & Rule Engine:**
  - Seed alert rules automatically bootstrapped from `config/alerts.yaml` into database tables `alert_rules`, `alert_events`, `alert_silences` via Alembic migration `0005_alerts.py`.
  - Background `AlertEvaluatorService` running scheduled evaluation loops:
    - Scope matching (`all`, `label`, `container`).
    - Rule types supported: `container_down`, `restart_loop`, `health_failing`, `cpu_high`, `memory_high`, `disk_high`, `host_load`, `container_missing`.
    - Sustained threshold detection over historical sliding windows (`duration_minutes`) queryable via metrics tables.
    - Automatic state transitions between `firing` and `resolved` with resolution timestamps.
    - Silence suppression matching rules or targets before expiration (`alert_silences`).
    - Flapping cooldown suppression preventing refiring within `cooldown_minutes` of resolution.
  - Endpoints (`/api/v1/alerts`):
    - Rules CRUD: `GET/POST /rules`, `GET/PUT/DELETE /rules/{id}` with role-based restrictions (admin only for mutations).
    - Dry-run testing: `POST /rules/test` and `POST /rules/{id}/test` evaluating matches against live containers and host without writing DB records.
    - Events & Ack: `GET /events` with filtering by status/severity/rule and `POST /events/{id}/ack` for operator acknowledgment.
    - Silences: `POST /silence` with target and duration specifications.
    - Active count: `GET /active-count` returning current firing alert count.
- **Frontend Management UI & Bell Notification:**
  - Standalone lazy-loaded route `/alerts` (`AlertsComponent`):
    - **Active & History Tab:** Firing and historical alert events table with status pills, severity icons, condition messages, acknowledge action, and silence action. Status and severity filter chips.
    - **Rules Tab:** Configured rules table with enabled toggle switches, condition metadata, scope tags, thresholds, cooldowns, dry-run test action, edit modal, and delete action.
  - Dialogs:
    - `RuleDialogComponent`: Reactive form dynamically adapting threshold inputs to selected rule type, scope selector, and live dry-run testing preview table.
    - `SilenceDialogComponent`: Duration picker and optional reason input for target suppression.
  - Header Alert Bell:
    - Notification icon in `ShellComponent` toolbar with reactive badge displaying firing alert count, linking directly to `/alerts`.
  - All 128 backend tests (`pytest`) and 169 frontend tests across 38 suites (`npm test`) passing with 0 warnings in production `ng build`.

### Prompt 10: Notification Channels
- **Status:** Complete
- **Backend Transports, Encryption & Dispatch Engine:**
  - Multi-channel notification subsystem supporting:
    - **Email:** SMTP with STARTTLS/SSL, authenticated credentials, formatted HTML body and plain-text fallback.
    - **Telegram:** Bot API message dispatch via `httpx.AsyncClient` with HTML formatting.
    - **Generic Webhook:** Configurable JSON HTTP POST payload with optional custom headers.
    - **Slack:** Incoming Webhook dispatch with Block Kit / attachment styling.
  - Symmetric encryption at rest for secrets (passwords, bot tokens, webhook URLs) using AES-Fernet with key derived from environment or settings.
  - Secrets write-only guarantee: `encrypted_secret` is never exposed; API responses only return `has_secret: bool`.
  - Exponential backoff retry loop (up to 3 attempts with 2s, 4s, 8s backoff) isolating transport failures.
  - Notification routing matrix linking alert severity (`info`, `warning`, `critical`), rule types, and container/label scopes to target channels.
  - Delivery audit log tracking every dispatch attempt, attempt counts, status (`delivered`, `failed`, `testing`), and error diagnostic traces.
  - Direct integration into `AlertEvaluatorService`: alert firing and resolution automatically match active routes and queue notifications.
  - Endpoints (`/api/v1/alerts`):
    - Channels: `GET/POST /channels`, `GET/PUT/DELETE /channels/{id}`, `POST /channels/{id}/test`.
    - Routes: `GET/POST /routes`, `PUT/DELETE /routes/{id}`.
    - Delivery Log: `GET /delivery-log` with channel/status filtering and limit controls.
- **Frontend Management UI:**
  - Standalone lazy-loaded route `/alerts/channels` (`NotificationChannelsComponent`):
    - **Channel Cards:** Grid display showing channel type icon, status chips, configuration summaries, inline "Send Test" action with result status pill, and edit/delete actions.
    - **Routing Matrix:** Responsive table listing rule type, minimum severity, scope conditions, destination channel badges, and enable/disable toggle switches.
    - **Delivery Log:** Paginated history table displaying event timestamp, target channel, event type, attempt counters, status pills, and expandable error message traces.
  - Dialogs:
    - `ChannelDialogComponent`: Per-channel dynamic configuration fields (SMTP host/port/TLS, bot tokens, chat IDs, webhook URLs, headers) with write-only secret indicators.
    - `RouteDialogComponent`: Channel selection, severity dropdown, rule type selector, and optional container/label scope filters.
  - Direct navigation button linking `/alerts` to `/alerts/channels`.
  - All 138 backend tests (`pytest`) and 187 frontend tests across 43 suites (`npm test`) passing with 0 warnings in production `ng build`.

### Prompt 11: Images, Volumes, and Networks
- **Status:** Complete
- **Backend Docker Housekeeping Subsystem:**
  - Resource inspection endpoints:
    - `GET /api/v1/resources/images`: Lists Docker images with size, age, tags, dangling status, and container in-use references.
    - `GET /api/v1/resources/volumes`: Lists Docker volumes with driver, mountpoint, size, and container in-use references.
    - `GET /api/v1/resources/networks`: Lists Docker networks with driver, scope, internal flag, built-in flag, and container in-use references.
  - Protected resources policy from `config/resources.yaml`:
    - Wildcard pattern matching (`dockpilot*`, `postgres*`, `redis*`, `bridge`, `host`, `none`).
    - Protected resources cannot be deleted or pruned (rejection with `400 Bad Request`).
  - Safe resource deletion:
    - `DELETE /api/v1/resources/images/{id}`: Blocks deletion if image is protected (400) or in use by running/stopped containers (409).
    - `DELETE /api/v1/resources/volumes/{name}`: Blocks deletion if volume is protected (400) or mounted in containers (409).
    - `DELETE /api/v1/resources/networks/{id}`: Blocks deletion if network is built-in (400), protected (400), or attached to containers (409).
  - Two-step prune workflow with dry-run preview and confirmation token:
    - `POST /api/v1/resources/{images|volumes|networks}/prune/preview`: Computes prunable candidates, estimates reclaimable bytes, and returns a time-limited confirmation token.
    - `POST /api/v1/resources/{images|volumes|networks}/prune`: Executes prune with valid token, reclaiming space and updating audit logs. Tokens cannot be reused.
  - Image pull background job:
    - `POST /api/v1/resources/images/pull`: Starts async pull job managed by `JobManager`.
    - `GET /api/v1/jobs/{id}/stream`: Real-time SSE streaming of download/extract progress layers and terminal status.
  - Pre- and post-action audit logging for all resource deletions, prunes, and pull jobs.
  - Extended `DockerGateway` interface with complete implementations in `EngineGateway` (Docker SDK) and `FakeGateway`.
- **Frontend Management UI:**
  - Standalone lazy-loaded route `/resources` (`ResourcesComponent`):
    - **Images Tab:** Image tags/repository, short ID, disk size, creation date, container in-use chips or prominent amber `Unused` warning chip, protected chip, and delete action.
    - **Volumes Tab:** Volume name, driver, mountpoint, creation date, size, container in-use chips or `Unused` warning chip, protected chip, and delete action.
    - **Networks Tab:** Network name, driver, scope, internal badge, connected containers chips, built-in chip, protected chip, and delete action.
    - Search filter toolbar filtering across names, tags, drivers, and connected containers.
    - Header stats pill showing total space and unused item counts.
  - Dialogs:
    - `PruneWizardDialogComponent`: Three-step modal (Preview candidates & reclaimable space -> Confirm warning -> Success summary).
    - `PullImageDialogComponent`: Image repository/tag input with live monospace terminal displaying streaming progress lines and layer status.
  - All 151 backend tests (`pytest`) and 216 frontend tests across 48 suites (`npm test`) passing with 0 warnings in production `ng build`.

### Prompt 12: Web Terminal
- **Status:** Complete
- **Backend Interactive Container Shell:**
  - Configurable terminal settings in `config/terminal.yaml` and `backend/app/core/config.py`:
    - `terminal_enabled: false`: Off by default; returns 404 when disabled.
    - `terminal_idle_timeout_seconds: 300`: Inactivity watchdog closes socket after timeout.
    - `terminal_max_session_seconds: 3600`: Hard session duration limit.
    - `terminal_max_concurrent_sessions: 5`: Concurrency limiter rejecting excess sessions with 429.
    - `terminal_record_sessions: true`: Transcript capture enabled.
    - `terminal_session_retention_days: 30`: Retention policy for session history.
    - `terminal_allowed_shells: ["/bin/sh", "/bin/bash", "sh", "bash"]`: Shell security whitelist.
  - Role-based security: Strictly restricted to administrators (`Role.ADMIN`); non-admins receive 403 Forbidden.
  - Database model in `backend/app/models/terminal.py`: `TerminalSession` recording user, container, shell, timestamps, duration, status, I/O byte counts, client IP, and full transcript.
  - Alembic migration `0007_terminal_sessions.py`.
  - DockerGateway extensions (`create_exec`, `start_exec`, `resize_exec`) implemented in `interface.py`, `engine.py`, and `fake.py` (with interactive mock TTY command loop).
  - Bidirectional relay in `TerminalService` with real-time TTY dimension resizing (`{"type": "resize", "cols": int, "rows": int}`).
  - Immutable pre- and post-action audit logging (`terminal.session_start` and `terminal.session_end`).
  - Endpoints:
    - WebSocket: `/api/v1/containers/{id}/exec` & `/containers/{id}/exec`.
    - REST: `GET /api/v1/containers/{id}/terminal/status`, `GET /api/v1/containers/{id}/terminal/sessions`, `GET /api/v1/containers/terminal/sessions/{id}`.
- **Frontend xterm.js Terminal:**
  - Integrated `@xterm/xterm` and `@xterm/addon-fit` with custom dark theme.
  - Standalone `ContainerTerminalComponent` on Container Detail page (`/containers/:id?tab=terminal`), only visible to administrators.
  - Shell selector dropdown (`/bin/sh`, `/bin/bash`) with automatic reconnect.
  - Security recording banner (`[REC] Session Recorded`) when audit recording is active.
  - Live connection state indicators (Connected, Connecting, Disconnected, Error) and disconnect reason banner.
  - Window and container resize observer auto-fitting terminal and synchronizing TTY dimensions with Docker exec backend.
  - All 161 backend tests (`pytest`) and 231 frontend tests across 50 suites (`npm test`) passing with 0 warnings in production `ng build`.

### Prompt 13: Audit Log
- **Status:** Complete
- **Backend Append-Only Audit Subsystem:**
  - Configurable audit settings in `config/audit.yaml` and `backend/app/core/config.py`:
    - `audit_page_size_default: 50`, `audit_page_size_max: 200`, `audit_export_max_rows: 5000`, `audit_retention_days: 90`.
  - Append-only architecture: Strictly read-only API with zero `POST`, `PUT`, `PATCH`, or `DELETE` endpoints exposed (405 Method Not Allowed).
  - Role-based security: Strictly restricted to administrators (`Role.ADMIN`); 401 Unauthorized for unauthenticated, 403 Forbidden for viewer/operator.
  - Streaming CSV export via `GET /api/v1/audit/export` and `GET /audit/export` using chunked asynchronous generator with bounded maximum rows and dynamic header `Content-Disposition`.
  - Comprehensive filtering and pagination on `GET /api/v1/audit` and `GET /audit`: actor (`user`), `action`, `target_type`, `target_id`, `result` (`success`, `failure`, `pending`), `since`, `until`, `sort_order`, `page`, and `page_size`.
  - Detail endpoint `GET /api/v1/audit/{id}` returning full audit record including formatted JSON payload and error traces.
  - All 168 backend tests (`pytest -q`) passing across all suites.
- **Frontend Management UI:**
  - Standalone lazy-loaded route `/audit` (`AuditComponent` in `frontend/src/app/features/audit/`):
    - Filter toolbar (actor search, action category dropdown, target type selector, result filter, date presets dropdown).
    - Relative vs Absolute UTC timestamp display toggle (`5m ago` vs `2026-11-23 10:00:00 UTC`).
    - Color-coded result badges (green for success, red for failure, amber for pending).
    - Interactive slide-out detail drawer displaying full record metadata, execution failure alert trace, and syntax-highlighted JSON payload with one-click copy button.
    - One-click CSV export button with loading spinner state.
    - Material table with pagination controls.
    - Navigation link in sidebar restricted to administrators (`minRole: 'admin'`) and route guarded by `roleGuard`.
  - All 252 frontend tests across 53 suites (`npm test`) passing with 0 warnings in production `ng build`.

### Prompt 14: Users and Roles
- **Status:** Complete
- **Backend Identity & Access Management:**
  - Configurable settings in `config/users.yaml` and `backend/app/core/config.py`:
    - `users_page_size_default: 20`, `users_page_size_max: 100`, `totp_issuer: "DockPilot"`, `totp_window: 1`, `session_max_age_days: 7`.
  - Database schema changes with Alembic migration `0008_users_roles_totp_sessions.py`:
    - `User`: Added `force_password_change`, `totp_secret`, `totp_enabled`.
    - `UserSession`: Added session model tracking `user_id`, `token_id`, `ip_address`, `user_agent`, `created_at`, `last_seen_at`, `is_revoked`.
  - Zero-dependency RFC 6238 TOTP implementation in `backend/app/core/totp.py` with standard HMAC-SHA1 and `+/- 1` step window tolerance.
  - User management service in `backend/app/services/users_service.py`:
    - Admin-only CRUD operations (`viewer`, `operator`, `admin` roles).
    - Last-admin protection: guards against deleting, demoting, or deactivating the last active administrator (400 Bad Request).
    - Administrative password reset with `force_password_change` flag and audit logging (`user.password_reset`).
  - Authentication and session service in `backend/app/services/auth_service.py`:
    - Two-factor login flow with temporary verification tokens.
    - User self-service TOTP enrolment, activation verification, and disablement.
    - Active session tracking with client IP, User-Agent, and instant token revocation check on refresh.
    - Self-service password change.
  - Endpoints:
    - User management: `GET /api/v1/users`, `POST /api/v1/users`, `GET /api/v1/users/{id}`, `PUT /api/v1/users/{id}`, `DELETE /api/v1/users/{id}`, `POST /api/v1/users/{id}/reset-password`.
    - Auth & Profile: `POST /api/v1/auth/2fa/login`, `POST /api/v1/auth/2fa/enrol`, `POST /api/v1/auth/2fa/verify`, `POST /api/v1/auth/2fa/disable`, `POST /api/v1/auth/change-password`, `GET /api/v1/auth/sessions`, `POST /api/v1/auth/sessions/{id}/revoke`, `POST /api/v1/auth/sessions/revoke-all`.
  - All 175 backend tests (`pytest -q`) passing across all suites.
- **Frontend Management UI:**
  - Standalone route `/users` (`UsersComponent` in `frontend/src/app/features/users/`):
    - User table with username, role badge, email, active status, 2FA status, and creation date.
    - Create/edit user modal (`UserDialogComponent`) with role selection and activation toggle.
    - Reset password modal (`ResetPasswordDialogComponent`) with generated secure temporary password and forced password change toggle.
    - Delete user confirmation with last-admin error banner.
  - Standalone route `/profile` (`ProfileComponent` in `frontend/src/app/features/profile/`):
    - Account overview card displaying role badge and security status.
    - Change password form with current password validation and mismatch check.
    - Two-factor authentication setup with rendered SVG/Canvas QR code (`otpauth://`), manual secret key copy, and 6-digit activation test.
    - Active sessions card with current session indicator, device info, IP, last seen time, and per-session or revoke-all-others actions.
  - Navigation: `/users` restricted to `admin` in sidebar and `roleGuard`; profile link in header toolbar.
  - All frontend unit tests passing across all suites (`npm test`) with 0 warnings in production `ng build`.








