# Implementation Plan: Prompt 03 — Containers List

**Goal:** Implement the Containers List feature with full filtering, sorting, pagination, live SSE telemetry streaming, single and bulk lifecycle operations, two-phase admin deletion token, and optimistic UI transitions.

---

## Phase 1: Gateway, Config & Schemas
- [ ] Task 1.1: Update `DockerGateway`, `FakeGateway`, and `EngineGateway` to support `remove_container` and rich container properties (`health`, `restart_count`, `ports`, `created`).
- [ ] Task 1.2: Add container pagination, stream interval, and delete token expiration configs to `config/app.yaml` and `backend/app/core/config.py`.
- [ ] Task 1.3: Enable `DELETE=1` on `socket-proxy` in `docker-compose.yml`.
- [ ] Task 1.4: Implement schemas in `backend/app/schemas/container.py` (`ContainerSummary`, `ContainerLiveMetrics`, `ContainersListResponse`, `BulkActionRequest`, `BulkActionResponse`, `DeleteTokenResponse`).

## Phase 2: Service Layer & Audit Logging
- [ ] Task 2.1: Create `backend/app/services/containers_service.py` with:
  - In-memory search, filtering (`state`, `health`, `project`, `label`), and sorting.
  - Pagination calculation (`items`, `total`, `page`, `page_size`, `total_pages`).
  - Pre-audit and post-audit lifecycle execution (`start`, `stop`, `restart`, `pause`, `unpause`, `kill`).
  - Two-phase delete token generation and verification with container removal.
  - Bulk action coordinator with per-container auditing and partial failure handling.
  - Real-time container metrics generator for SSE.

## Phase 3: API Router & Endpoints
- [ ] Task 3.1: Create `backend/app/api/v1/containers.py` with routes:
  - `GET /api/v1/containers` (`viewer`+)
  - `GET /api/v1/containers/stream` (`viewer`+, SSE with query-token & Bearer support)
  - `POST /api/v1/containers/{id}/{action}` (`operator`+)
  - `POST /api/v1/containers/{id}/delete-token` (`admin`)
  - `DELETE /api/v1/containers/{id}` (`admin`)
  - `POST /api/v1/containers/bulk` (`operator`+)
- [ ] Task 3.2: Register containers router in `backend/app/main.py`.

## Phase 4: Backend Tests
- [ ] Task 4.1: Write unit tests in `backend/tests/test_containers_service.py` (filtering, sorting, actions, bulk, delete-token).
- [ ] Task 4.2: Write unit tests in `backend/tests/test_containers_api.py` (RBAC enforcement, streaming, API contracts).
- [ ] Task 4.3: Run `pytest` and verify 100% test pass.

## Phase 5: Frontend Models, Constants, API Service & Store
- [ ] Task 5.1: Create TypeScript models in `frontend/src/app/core/models/container.model.ts`.
- [ ] Task 5.2: Create typed constants in `frontend/src/app/core/constants/container.constants.ts`.
- [ ] Task 5.3: Implement `ContainersService` in `frontend/src/app/core/services/containers.service.ts`.
- [ ] Task 5.4: Implement signal-based `ContainersStore` in `frontend/src/app/features/containers/containers.store.ts` with optimistic updates, rollback, filter presets, and SSE integration.

## Phase 6: Frontend Components & Dialogs
- [ ] Task 6.1: Create `ActionConfirmDialogComponent` and `DeleteContainerDialogComponent` (with name typing confirmation).
- [ ] Task 6.2: Create `ContainersFilterComponent` with search input, dropdowns, and preset saving/loading.
- [ ] Task 6.3: Create `ContainersListComponent` with Angular Material table, selection checkboxes, chips, mini-bars, and bulk action toolbar.
- [ ] Task 6.4: Wire up lazy-loaded `/containers` route in `app.routes.ts` and ensure shell sidebar links to it.

## Phase 7: Frontend Tests & Build
- [ ] Task 7.1: Write unit tests for `ContainersService`, `ContainersStore`, and `ContainersListComponent`.
- [ ] Task 7.2: Run `npm test` and verify all suites pass.
- [ ] Task 7.3: Run `ng build` and verify production build with 0 warnings.

## Phase 8: Documentation & Progress
- [ ] Task 8.1: Update `README.md` with Containers List documentation.
- [ ] Task 8.2: Update `docs/progress.md` with Prompt 03 summary.
- [ ] Task 8.3: Commit and push changes.
