# Implementation Plan: Prompt 08 — Events Timeline

**Goal:** Implement real-time Docker events ingestion, persistence with deduplication, derived incident detection (restart loop, OOM, unexpected exit), cursor pagination, SSE streaming, and a responsive vertical timeline component reused across `/events`, `/dashboard`, and `/containers/:id`.

---

## Phase 1: Configuration, Model & Alembic Migration
- [x] Task 1.1: Add settings to `config/app.yaml` and `backend/app/core/config.py`:
  - `events_retention_days: 30`
  - `events_reconnect_interval_seconds: 3.0`
  - `restart_loop_window_seconds: 300`
  - `restart_loop_threshold: 3`
  - `events_page_size_default: 50`
  - `events_page_size_max: 200`
- [x] Task 1.2: Create `ContainerEventRecord` model in `backend/app/models/event.py` and register in `backend/app/models/__init__.py`.
- [x] Task 1.3: Create Alembic migration `0004_container_events.py` for `container_events` table with indexes.

## Phase 2: Gateway & Background Event Listener
- [x] Task 2.1: Extend `DockerGateway` interface in `backend/app/docker/interface.py` with `stream_events(since: Optional[int | datetime] = None)`.
- [x] Task 2.2: Implement `stream_events(since)` in `backend/app/docker/engine.py` and `backend/app/docker/fake.py`.
- [x] Task 2.3: Implement `EventListenerService` in `backend/app/services/event_listener_service.py`:
  - Background loop subscribing to `DockerGateway.stream_events`.
  - Reconnection on drop with exponential backoff / reconnect interval.
  - Event normalization and deduplication.
  - Derived incident detection:
    - OOM (`is_oom`): `action == 'oom'` or `attributes.oom == 'true'`.
    - Unexpected exit (`is_unexpected_exit`): `action == 'die'` and `exit_code != 0`.
    - Restart loop (`is_restart_loop`): count of crash/restart events for `container_id` within `restart_loop_window_seconds` >= `restart_loop_threshold`.
  - DB persistence and SSE broadcast queues.
- [x] Task 2.4: Wire `EventListenerService` in `backend/app/main.py` lifespan (start on boot, stop on shutdown).

## Phase 3: Schemas, Events Service & API Endpoints
- [x] Task 3.1: Define Pydantic schemas in `backend/app/schemas/events.py`:
  - `EventItem`, `EventsListResponse`, `EventsFilterParams`.
- [x] Task 3.2: Implement `EventsService` in `backend/app/services/events_service.py`:
  - `list_events`: filtering by container, action, date range, incidents, with cursor-based pagination.
  - `subscribe_stream`: SSE subscription queue.
- [x] Task 3.3: Implement endpoints in `backend/app/api/v1/events.py`:
  - `GET /api/v1/events` (filters, cursor pagination).
  - `GET /api/v1/events/stream` (SSE).
- [x] Task 3.4: Register router in `backend/app/api/v1/router.py`.

## Phase 4: Backend Tests
- [x] Task 4.1: Unit tests for model and migration.
- [x] Task 4.2: Unit tests for `EventListenerService` in `backend/tests/test_event_listener.py`:
  - Event persistence.
  - Deduplication on repeated event ID.
  - Reconnect behavior after stream drop.
  - Restart loop sliding window detection using config values.
  - OOM and unexpected exit flag computation.
- [x] Task 4.3: API tests in `backend/tests/test_events_api.py`:
  - `GET /api/v1/events` filtering, pagination, and cursor navigation.
  - `GET /api/v1/events/stream` SSE streaming.
  - RBAC verification.
- [x] Task 4.4: Run `pytest` and verify 100% pass (116/116 passed).

## Phase 5: Frontend Models, Constants, & Service
- [x] Task 5.1: Create TypeScript models in `frontend/src/app/core/models/events.model.ts`.
- [x] Task 5.2: Create constants in `frontend/src/app/core/constants/events.constants.ts` (action icons, colors, labels, incident chips).
- [x] Task 5.3: Implement `EventsService` in `frontend/src/app/core/services/events.service.ts` with unit tests in `events.service.spec.ts`.

## Phase 6: Frontend Components & Stores
- [x] Task 6.1: Implement `EventsStore` in `frontend/src/app/features/events/events.store.ts` with unit tests.
- [x] Task 6.2: Implement reusable `EventsTimelineComponent` (`frontend/src/app/features/events/components/events-timeline.component.ts`, `.html`, `.scss`):
  - Vertical timeline with day grouping ("Today", "Yesterday", date strings).
  - Colored icons per event action.
  - Container link to `/containers/:id`.
  - Exit code and incident badges (Restart loop, OOM, crash).
  - Compact mode input property (`compact: boolean`) for dashboard and detail embed.
- [x] Task 6.3: Implement standalone `/events` page (`frontend/src/app/features/events/events.component.ts`, `.html`, `.scss`):
  - Filter bar (container picker, event type select, date range, incidents-only toggle).
  - Live SSE stream indicator and pause/resume button.
  - Pagination controls ("Load More" cursor button).
- [x] Task 6.4: Integrate compact timeline into:
  - Dashboard (`/dashboard`) replacing simple events list.
  - Container Detail page (`/containers/:id?tab=events`).
- [x] Task 6.5: Write unit tests in `events-timeline.component.spec.ts` and `events.component.spec.ts`.
- [x] Task 6.6: Register `/events` route in `frontend/src/app/app.routes.ts`.

## Phase 7: Verification & Delivery
- [x] Task 7.1: Run full frontend test suite (`npm test --prefix frontend`) (147/147 passed across 33 suites).
- [x] Task 7.2: Run production build (`npm run build --prefix frontend`) and ensure 0 warnings.
- [x] Task 7.3: Run backend test suite (`python -m pytest -q backend`) (116/116 passed).
- [x] Task 7.4: Update `README.md` and `docs/progress.md`.
- [x] Task 7.5: Update knowledge graph (`graphify update .`).
- [x] Task 7.6: Commit and push changes.
