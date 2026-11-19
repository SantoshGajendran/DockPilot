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
