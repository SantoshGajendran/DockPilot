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
Execute the pytest suite (96 unit tests):
```bash
cd backend && pytest -v
```
Or from root:
```bash
python -m pytest backend/tests -v
```

### Frontend Unit Tests & Build
Execute the Jest unit test suite (113 unit tests across 25 suites):
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

