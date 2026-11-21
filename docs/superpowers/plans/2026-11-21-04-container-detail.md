# Implementation Plan: Prompt 04 — Container Detail Page

**Goal:** Implement the single-container detail page with deep-linkable tabs (`overview`, `metrics`, `logs`, `config`, `events`), secret-masked environment inspection with audited admin-reveal, live/historical metrics charts with range selector, and full lifecycle controls.

---

## Phase 1: Database Model & Migration
- [x] Task 1.1: Create `backend/app/models/metrics.py` with `ContainerMetricRecord` model (`container_id`, `timestamp`, `cpu_percent`, `memory_bytes`, `memory_limit`, `network_rx_bytes`, `network_tx_bytes`, `block_read_bytes`, `block_write_bytes`).
- [x] Task 1.2: Generate Alembic migration script for `container_metrics` table.

## Phase 2: Configuration & Schemas
- [x] Task 2.1: Add `secret_mask_patterns` to `config/app.yaml` and `backend/app/core/config.py`.
- [x] Task 2.2: Implement schemas in `backend/app/schemas/container_detail.py`:
  - `EnvVarItem`, `MountItem`, `NetworkItem`, `HealthcheckInfo`, `ContainerDetailResponse`.
  - `ContainerLiveStats`, `ContainerMetricsHistoryResponse`, `EnvRevealResponse`.

## Phase 3: Service Layer & Background Sampling
- [x] Task 3.1: Enhance `FakeGateway` and `EngineGateway` to return rich inspection details (`Mounts`, `NetworkSettings`, `RestartPolicy`, `Health`, `HostConfig`).
- [x] Task 3.2: Implement `backend/app/services/container_detail_service.py`:
  - `get_container_details(container_id)` with secret pattern masking.
  - `reveal_container_env(container_id, user_id, username, ip, db)` with audit log recording.
  - `stream_container_stats(container_id, gateway, interval_seconds, once)`.
  - `get_container_metrics_history(container_id, range_str, db)` with downsampling.

## Phase 4: API Router & Endpoints
- [x] Task 4.1: Add endpoints to `backend/app/api/v1/containers.py`:
  - `GET /api/v1/containers/{id}` (`viewer`+)
  - `POST /api/v1/containers/{id}/env/reveal` (`admin`)
  - `GET /api/v1/containers/{id}/stats` (SSE, `viewer`+)
  - `GET /api/v1/containers/{id}/metrics` (`viewer`+, range parameter)

## Phase 5: Backend Tests
- [x] Task 5.1: Write unit tests in `backend/tests/test_container_detail_service.py` (inspection, secret masking, reveal auditing, downsampling).
- [x] Task 5.2: Write API tests in `backend/tests/test_container_detail_api.py` (endpoints, RBAC, SSE stats, reveal).
- [x] Task 5.3: Run `pytest` and verify 100% test pass.

## Phase 6: Frontend Models, Constants & Store
- [x] Task 6.1: Define TypeScript models in `frontend/src/app/core/models/container-detail.model.ts`.
- [x] Task 6.2: Add endpoints and constants in `frontend/src/app/core/constants/container.constants.ts`.
- [x] Task 6.3: Implement `ContainersDetailService` in `frontend/src/app/core/services/container-detail.service.ts`.
- [x] Task 6.4: Implement `ContainerDetailStore` in `frontend/src/app/features/containers/detail/container-detail.store.ts`.

## Phase 7: Frontend Tabs & UI Components
- [x] Task 7.1: Build `ContainerDetailComponent` with Material Tabs and query param synchronization (`?tab=overview|metrics|logs|config|events`).
- [x] Task 7.2: Build **Overview Tab** (header action buttons, key facts, live gauges).
- [x] Task 7.3: Build **Metrics Tab** (range selector, Chart.js line charts for CPU, Memory, Network, Disk).
- [x] Task 7.4: Build **Config Tab** (masked environment table, Admin reveal button, Mounts table, Networks table, Labels).
- [x] Task 7.5: Build **Events & Logs Tabs** (recent container events and log stream viewer).
- [x] Task 7.6: Wire up route in `app.routes.ts` (`/containers/:id`).

## Phase 8: Frontend Tests & Production Build
- [x] Task 8.1: Unit tests for store, service, and detail component.
- [x] Task 8.2: Run `npm test` and verify 100% test pass.
- [x] Task 8.3: Run `ng build` and verify production build.

## Phase 9: Documentation & Commit
- [x] Task 9.1: Update `README.md` and `docs/progress.md`.
- [x] Task 9.2: Commit and push changes.
