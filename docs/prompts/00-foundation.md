# Master Prompt 0: Foundation

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** a running skeleton with auth plumbing, shared layout and a mockable Docker layer.

**Backend**

- Project layout: `app/api`, `app/core`, `app/docker`, `app/collectors`, `app/alerts`, `app/models`, `tests`.
- `core/config.py` loads `config/app.yaml` with Pydantic settings (collection interval, retention days, log tail default, CORS origins, JWT lifetimes).
- `docker/interface.py` defines `DockerGateway` (list, inspect, stats stream, logs stream, events stream, actions). Implement `EngineGateway` (real) and `FakeGateway` (tests).
- Alembic set up with the initial migration for `users` and `audit_log`.
- `GET /health` and `GET /version`.
- Docker Compose file with `backend`, `frontend`, `postgres`, `socket-proxy`.

**Frontend**

- Angular workspace, strict mode, Angular Material theme driven by CSS variables.
- App shell: collapsible sidebar (routes read from a config array), top bar with user menu and connection status chip, router outlet.
- Core services: `ApiClient` (base URL from environment), `AuthService` (signals), `SseService` (typed EventSource wrapper with auto-reconnect and backoff), `ToastService`.
- HTTP interceptors for auth header and error normalisation. Route guards: `authGuard`, `roleGuard`.

**Tests:** `/health` returns 200; `FakeGateway` contract test; `SseService` reconnect unit test; shell renders the sidebar from config.

**Done when:** `docker compose up` shows the empty shell and `/health` is green.
