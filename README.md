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
Execute the pytest suite (29 unit tests):
```bash
cd backend && pytest -v
```
Or from root:
```bash
python -m pytest backend/tests -v
```

### Frontend Unit Tests & Build
Execute the Jest unit test suite (34 unit tests):
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
