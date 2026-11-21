# Progress

## Prompt 00: Foundation
- **Status:** Complete
- **Backend:** FastAPI running with Async SQLAlchemy 2 + Alembic initial migration for `users` and `audit_log`. `DockerGateway` interface with `EngineGateway` and `FakeGateway`. `/health` and `/version` endpoints passing unit tests.
- **Frontend:** Angular 19 workspace configured in strict mode. App shell with collapsible sidebar rendered from typed navigation config. `SseService` with exponential backoff and connection status signals.
- **Packaging:** Multi-container `docker-compose.yml` orchestrating `backend`, `frontend`, `postgres`, and `socket-proxy`.

## Prompt 01: Login Page & Authentication Subsystem
- **Status:** Complete
- **Backend:**
  - Full JWT authentication subsystem with Argon2id password hashing and dual-token lifecycle.
  - Endpoints implemented: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, and `GET /api/v1/auth/me`.
  - Brute-force lockout enforcement: 5 failed attempts locks user out for 15 minutes with dynamic remaining seconds response.
  - First-boot auto-bootstrap creating default administrator (`admin` / `dockpilot_admin_2026`) when database is empty.
  - RBAC dependency injection (`require_role`) supporting `viewer`, `operator`, and `admin` access tiers.
  - Audit logging for all authentication events: `login_success`, `login_failed`, `account_locked`, and `logout`.
  - 29 unit tests covering hashing, token lifecycles, auth flows, RBAC hierarchies, and admin bootstrapping.
- **Frontend:**
  - Standalone lazy-loaded `/login` component built with reactive forms, Angular Material, password visibility toggle, and error banner.
  - Reactive `AuthService` managing access token in-memory with signals (`currentUser`, `isAuthenticated`, `userRole`).
  - Silent token refresh on app startup via `APP_INITIALIZER` factory.
  - Functional routing guards: `authGuard` and `roleGuard`.
  - HTTP `authInterceptor` attaching Bearer tokens and `ErrorInterceptor` catching 401s to prompt a `SessionExpiredDialogComponent` re-auth modal.
  - 34 unit tests passing; production build verified with zero errors.

## Prompt 02: Overview Dashboard
- **Status:** Complete
- **Backend:**
  - REST snapshot endpoint `GET /api/v1/overview` returning host telemetry (CPU, RAM, disk, load averages, uptime), container counts grouped by state (running, exited, restarting, unhealthy, paused), top containers ranked by CPU and memory, recent Docker events, and active alert counts.
  - Real-time Server-Sent Events (SSE) streaming endpoint `GET /api/v1/overview/stream` pushing metrics at configured collection interval (`metrics.collection_interval: 2s`) with support for query-param token authentication for native browser `EventSource` and Bearer header authentication.
  - Background `OverviewCollector` service with thread-safe broadcast queues, bounded queue overflow protection, graceful error isolation on Docker errors, and snapshot caching.
  - 46 unit tests passing across all backend modules.
- **Frontend:**
  - Standalone lazy-loaded `/dashboard` component with Angular Material cards, grid layout, loading skeletons, error state with retry, and empty-server state.
  - Signal-based `DashboardStore` managing real-time metrics, connection status, stale data watchdog with timeout detection, and fallback polling.
  - Host resource gauges for CPU, Memory, Disk, and Load averages with color-coded warning thresholds.
  - Chart.js container status donut chart with interactive hover tooltips.
  - Top resource consumers widget with dual tabs (CPU % and Memory) and quick-action navigation.
  - Recent Docker events feed with formatted badges and relative timestamps.
  - 51 unit tests passing across 11 suites; production build verified with zero errors.


## Prompt 03: Containers List
- **Status:** Complete
- **Backend:**
  - `GET /api/v1/containers`: Pagination, search (`q`), multi-criteria filtering (`state`, `health`, `compose_project`, `label`), and sorting across container properties.
  - `GET /api/v1/containers/stream`: Multiplexed SSE stream delivering live CPU %, Memory bytes/%, state, and health.
  - `POST /api/v1/containers/{id}/{action}`: Individual container lifecycle control (`start`, `stop`, `restart`, `pause`, `unpause`, `kill`) with pre- and post-action audit logging. Enforced at `operator` tier and above.
  - `POST /api/v1/containers/bulk`: Bulk lifecycle operations with per-container execution, partial failure handling, and individual audit logs.
  - `POST /api/v1/containers/{id}/delete-token` & `DELETE /api/v1/containers/{id}`: Two-phase administrative deletion safety workflow using signed, expiring confirmation tokens.
  - 62 unit tests passing across backend suites (`pytest`).
- **Frontend:**
  - Standalone lazy-loaded `/containers` component with responsive Angular Material table.
  - Real-time CPU and Memory mini-progress-bars dynamically updated via SSE stream.
  - Filter bar supporting free-text search, state dropdown, health dropdown, project filter, and custom filter preset persistence in `localStorage`.
  - Multi-select row selection with floating bulk action toolbar for batch operations.
  - Action confirmation dialogs for destructive operations (`stop`, `kill`) and a typed-name confirmation dialog for container deletion.
  - Reactive `ContainersStore` using Angular signals with optimistic state transitions and automatic rollback on failure.
  - 68 unit tests passing across 14 suites (`npm test`); production build verified with 0 errors and 0 warnings.

## Prompt 04: Container Detail Page
- **Status:** Complete
- **Backend:**
  - `ContainerMetricRecord` model and Alembic migration `0002_container_metrics.py`.
  - Configurable `secret_mask_patterns` in `config/app.yaml` and `backend/app/core/config.py`.
  - Schemas in `backend/app/schemas/container_detail.py`: `ContainerDetailResponse`, `EnvVarItem`, `MountItem`, `NetworkItem`, `HealthcheckInfo`, `ContainerLiveStats`, `ContainerMetricsHistoryResponse`, `EnvRevealResponse`.
  - Detailed inspection in `backend/app/services/container_detail_service.py` with automatic secret masking.
  - Admin-only `POST /api/v1/containers/{id}/env/reveal` with immutable audit logging.
  - Real-time SSE stats stream in `GET /api/v1/containers/{id}/stats` pushing CPU %, Memory, Network Rx/Tx, and Block Read/Write.
  - Historical telemetry endpoint `GET /api/v1/containers/{id}/metrics?range=1h|6h|24h|7d` with smart downsampling to max 100 points.
  - 75 backend unit tests passing across all suites (`pytest`).
- **Frontend:**
  - Standalone lazy-loaded route `/containers/:id` (`ContainerDetailComponent`).
  - Five deep-linkable tabs synchronized via `?tab=` query parameter (`overview`, `metrics`, `logs`, `config`, `events`).
  - **Overview Tab:** Header status badges, lifecycle action buttons, Key Facts card, and live telemetry progress bars.
  - **Metrics Tab:** Range selector (`1h`, `6h`, `24h`, `7d`) with Chart.js line charts for CPU, Memory (with limit threshold line), Network I/O, Block I/O.
  - **Logs Tab:** Monospace terminal log container.
  - **Config Tab:** Masked environment variables table with Admin "Reveal Secrets" button, Mounts table, Network settings table, Labels key-value tags.
  - **Events Tab:** Chronological lifecycle events timeline.
  - `ContainersDetailService` and signal-based `ContainerDetailStore`.
  - Clickable link on container names in `ContainersListComponent` navigating to `/containers/:id`.
  - 85 frontend unit tests passing across 17 suites (`npm test`); production `ng build` passing with 0 errors and 0 warnings.

