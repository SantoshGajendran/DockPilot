# Design Specification: DockPilot Foundation (Prompt 00)

**Date:** 2026-11-18  
**Status:** Approved  
**Scope:** Master Prompt 00 — Foundation Skeleton

---

## 1. Overview & Goals

DockPilot is a standalone application to monitor and control Docker containers on an Ubuntu server.
The goal of Prompt 00 (Foundation) is to establish a running, verified skeleton comprising:
* A modular FastAPI backend running under Python 3.12+ with asynchronous SQLAlchemy 2 and Alembic.
* A decoupled Docker abstraction layer (`DockerGateway`) supporting both real Docker daemon communication and a testable in-memory fake (`FakeGateway`).
* An Angular 19 standalone frontend featuring an app shell, responsive sidebar loaded from configuration, top bar with connection health chip, theme tokens, and core services.
* A Docker Compose environment orchestrating the frontend, backend, PostgreSQL database, and a restricted `docker-socket-proxy`.
* Complete unit test coverage for health endpoints, gateway contracts, SSE auto-reconnect logic, and shell rendering.

---

## 2. Global Constraints & Standards

1. **Zero Hardcoded Domain Terms:** All threshold values, timeouts, route metadata, roles, colors, and intervals originate from `config/app.yaml`, database entries, or typed TypeScript/Python constants.
2. **Layered Backend Architecture:** Every feature implements a router, service layer, data schemas, and test suite. Docker interactions must pass through `DockerGateway`.
3. **Standalone Angular Architecture:** All components are standalone routes using Signals and RxJS where appropriate.
4. **Audit Requirement:** Audit log schema must be provisioned in the initial migration for subsequent prompt actions.
5. **Role System:** Roles (`viewer`, `operator`, `admin`) defined in backend constants and mirrored in frontend guards.
6. **Network Isolation:** Backend binds to `127.0.0.1` by default; Docker daemon accessed strictly through `docker-socket-proxy`.

---

## 3. Backend Specification

### 3.1 Project Layout
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py
│   │       └── health.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── constants.py
│   │   └── database.py
│   ├── docker/
│   │   ├── __init__.py
│   │   ├── interface.py
│   │   ├── engine.py
│   │   └── fake.py
│   ├── collectors/
│   │   └── __init__.py
│   ├── alerts/
│   │   └── __init__.py
│   └── models/
│       ├── __init__.py
│       ├── base.py
│       ├── user.py
│       └── audit.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_health.py
│   └── test_docker_gateway.py
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 0001_initial_users_and_audit.py
├── alembic.ini
├── Dockerfile
├── pyproject.toml
└── requirements.txt
```

### 3.2 Configuration (`app/core/config.py`)
Loads settings from `config/app.yaml` using Pydantic Settings:
* `app_name`: String (default `"DockPilot"`)
* `environment`: String (`development` / `production`)
* `host`: String (default `"127.0.0.1"`)
* `port`: Integer (default `8000`)
* `database_url`: Postgres connection string (default `postgresql+asyncpg://dockpilot:dockpilot@postgres:5432/dockpilot`)
* `docker_host`: String (default `tcp://socket-proxy:2375`)
* `cors_origins`: List of strings (default `["http://localhost:4200", "http://127.0.0.1:4200"]`)
* `collection_interval_seconds`: Integer (default `5`)
* `retention_days`: Integer (default `30`)
* `log_tail_default`: Integer (default `200`)
* `jwt_secret`: String
* `jwt_access_expire_minutes`: Integer (default `15`)
* `jwt_refresh_expire_days`: Integer (default `7`)

### 3.3 Database Models & Migrations
* **`app/models/base.py`:**
  * Defines `Base(AsyncAttrs, DeclarativeBase)` with automatic `created_at` and `updated_at` timestamps in UTC.
* **`app/models/user.py` (`users` table):**
  * `id`: `UUID` (PK, default `uuid4`).
  * `username`: `VARCHAR(64)` (unique, indexed).
  * `email`: `VARCHAR(255)` (nullable, unique).
  * `hashed_password`: `VARCHAR(255)` (Argon2 hash).
  * `role`: `VARCHAR(32)` (`viewer`, `operator`, `admin`).
  * `is_active`: `BOOLEAN` (default `True`).
  * `failed_login_attempts`: `INTEGER` (default `0`).
  * `locked_until`: `TIMESTAMP WITH TIME ZONE` (nullable).
* **`app/models/audit.py` (`audit_log` table):**
  * `id`: `BIGINT` or `UUID` (PK).
  * `timestamp`: `TIMESTAMP WITH TIME ZONE` (default UTC now, indexed).
  * `user_id`: `UUID` (FK to `users.id`, nullable, on delete SET NULL).
  * `username`: `VARCHAR(64)` (indexed).
  * `action`: `VARCHAR(64)` (indexed).
  * `target_type`: `VARCHAR(64)`.
  * `target_id`: `VARCHAR(128)` (nullable).
  * `payload`: `JSONB` / `JSON` (sanitized inputs).
  * `result`: `VARCHAR(32)` (`pending`, `success`, `failure`).
  * `error_message`: `TEXT` (nullable).
  * `ip_address`: `VARCHAR(45)` (nullable).
* **Alembic:**
  * Configured for asynchronous migrations using `async_engine`.
  * Initial migration `0001_initial_users_and_audit.py` creating both tables with indexes.

### 3.4 Docker Gateway Layer
Defined in `app/docker/interface.py`:
```python
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, List, Any

class DockerGateway(ABC):
    @abstractmethod
    async def ping(self) -> bool:
        """Verify daemon connectivity."""
        pass

    @abstractmethod
    async def list_containers(self, all: bool = True) -> List[Dict[str, Any]]:
        """List containers."""
        pass

    @abstractmethod
    async def inspect_container(self, container_id: str) -> Dict[str, Any]:
        """Inspect specific container details."""
        pass

    @abstractmethod
    async def execute_action(self, container_id: str, action: str) -> bool:
        """Perform container lifecycle action."""
        pass

    @abstractmethod
    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream Docker engine events."""
        pass
```
* **`EngineGateway` (`app/docker/engine.py`):** Uses the `docker` SDK to connect to `socket-proxy:2375`.
* **`FakeGateway` (`app/docker/fake.py`):** In-memory fixture seeded with dummy containers for testing.

### 3.5 API Endpoints
* `GET /health`:
  * Returns `{"status": "ok", "database": "connected", "docker": "connected"}`.
  * Verifies DB connection via `SELECT 1` and Docker via `DockerGateway.ping()`.
* `GET /version`:
  * Returns `{"version": "0.1.0", "app": "DockPilot"}`.

---

## 4. Frontend Specification

### 4.1 Project Layout
```
frontend/
├── src/
│   ├── app/
│   │   ├── app.config.ts
│   │   ├── app.routes.ts
│   │   ├── app.component.ts
│   │   ├── core/
│   │   │   ├── config/
│   │   │   │   └── navigation.config.ts
│   │   │   ├── services/
│   │   │   │   ├── api-client.service.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── sse.service.ts
│   │   │   │   └── toast.service.ts
│   │   │   ├── interceptors/
│   │   │   │   ├── auth.interceptor.ts
│   │   │   │   └── error.interceptor.ts
│   │   │   ├── guards/
│   │   │   │   ├── auth.guard.ts
│   │   │   │   └── role.guard.ts
│   │   │   └── models/
│   │   │       ├── user.model.ts
│   │   │       ├── nav-item.model.ts
│   │   │       └── sse-status.model.ts
│   │   └── layout/
│   │       ├── shell.component.ts
│   │       ├── shell.component.html
│   │       └── shell.component.scss
│   ├── styles/
│   │   └── theme.scss
│   ├── environments/
│   │   ├── environment.ts
│   │   └── environment.prod.ts
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── angular.json
├── package.json
└── tsconfig.json
```

### 4.2 Core Services & Reactive Patterns
1. **`ApiClient` (`core/services/api-client.service.ts`):**
   * Uses Angular `HttpClient`.
   * Base URL sourced from `environment.apiUrl`.
   * Methods: `get<T>`, `post<T>`, `put<T>`, `delete<T>`.
2. **`AuthService` (`core/services/auth.service.ts`):**
   * Signal-driven state:
     * `currentUser = signal<User | null>(null)`
     * `isAuthenticated = computed(() => !!this.currentUser())`
     * `userRole = computed(() => this.currentUser()?.role ?? null)`
3. **`SseService` (`core/services/sse.service.ts`):**
   * Wraps `EventSource`.
   * Typed reconnect handler with exponential backoff (`minReconnectDelayMs: 1000`, `maxReconnectDelayMs: 30000`, factor `1.5`).
   * Exposes connection status signal: `connectionState = signal<'connected' | 'reconnecting' | 'disconnected'>('disconnected')`.
4. **`ToastService` (`core/services/toast.service.ts`):**
   * Integrates Angular Material `MatSnackBar` for error, warning, and info notifications.

### 4.3 App Shell Layout (`layout/shell.component.ts`)
* Built with `MatSidenavContainer`, `MatSidenav`, `MatToolbar`, and `MatNavList`.
* Navigation items loaded from `navigation.config.ts`:
  * Array: Overview (`/dashboard`), Containers (`/containers`), Logs (`/logs`), Host (`/host`), Projects (`/projects`), Events (`/events`), Alerts (`/alerts`), Resources (`/resources`), Audit Log (`/audit`), Users (`/users`), Settings (`/settings`).
* Responsive sidebar toggle stored in signal (`isCollapsed = signal<boolean>(false)`).
* Header displays connection status chip linked to `sseService.connectionState` and current user profile icon.

### 4.4 Theming (`styles.scss` & `styles/theme.scss`)
* Angular Material 19 theming powered by CSS custom properties:
  * `--dp-bg`, `--dp-surface`, `--dp-border`
  * `--dp-primary`, `--dp-accent`
  * `--dp-status-ok`, `--dp-status-warn`, `--dp-status-error`

---

## 5. Orchestration & Packaging (`docker-compose.yml`)

1. **`socket-proxy` Service:**
   * Image: `tecnativa/docker-socket-proxy:latest`
   * Socket mount: `/var/run/docker.sock:/var/run/docker.sock:ro`
   * Environment permissions: `CONTAINERS=1`, `INFO=1`, `EVENTS=1`, `POST=1`
   * Network: `dockpilot-net` (no host port publication).
2. **`postgres` Service:**
   * Image: `postgres:16-alpine`
   * Environment: `POSTGRES_USER=dockpilot`, `POSTGRES_PASSWORD=dockpilot`, `POSTGRES_DB=dockpilot`
   * Healthcheck: `pg_isready -U dockpilot`
   * Volume: `dockpilot_pgdata:/var/lib/postgresql/data`
3. **`backend` Service:**
   * Context: `./backend`
   * Binds to: `127.0.0.1:8000:8000`
   * Depends on: `postgres` (condition `service_healthy`), `socket-proxy`
   * Runs Alembic migrations on startup, then launches `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
4. **`frontend` Service:**
   * Context: `./frontend`
   * Binds to: `127.0.0.1:4200:80`
   * Multi-stage build producing static assets served via Nginx with reverse proxy to backend `/api/`.

---

## 6. Testing Strategy

1. **Backend Unit & Contract Tests (`pytest`):**
   * `tests/test_health.py`:
     * Verifies `GET /health` returns HTTP 200 with JSON payload `{"status": "ok", ...}`.
     * Verifies `GET /version` returns HTTP 200 with valid version string.
   * `tests/test_docker_gateway.py`:
     * Tests `FakeGateway` against `DockerGateway` interface methods (`list_containers`, `inspect_container`, `ping`).
2. **Frontend Unit Tests (`npm test`):**
   * `shell.component.spec.ts`:
     * Tests that the sidebar accurately iterates and renders navigation items from `navigation.config.ts`.
     * Tests sidebar toggle state changes.
   * `sse.service.spec.ts`:
     * Validates connection failure handling and exponential backoff retry scheduling.
3. **Build Validation:**
   * Frontend: `npm run build` succeeds under TypeScript strict mode.
   * Docker: `docker compose build` succeeds with zero errors.

---

## 7. Acceptance Criteria

* [ ] `backend/app` conforms to directory structure with `DockerGateway` interface, `EngineGateway`, and `FakeGateway`.
* [ ] Database migration `0001_initial_users_and_audit.py` successfully provisions `users` and `audit_log`.
* [ ] `GET /health` and `GET /version` are implemented and passing unit tests.
* [ ] `frontend` has Angular 19 workspace with working shell, sidebar config, Material theming, and core services.
* [ ] `FakeGateway` contract test and `SseService` reconnect tests pass.
* [ ] `docker-compose.yml` orchestrates backend, frontend, postgres, and socket-proxy cleanly.
