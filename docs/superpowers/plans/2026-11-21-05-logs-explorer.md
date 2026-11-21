# Implementation Plan: Prompt 05 — Logs Explorer

**Goal:** Implement real-time streaming, multiplexed/TTY demuxing, backpressure mitigation, search API, and an Angular virtual-scrolled ANSI log viewer for single and multi-container log exploration.

---

## Phase 1: Configuration & Docker Gateway
- [x] Task 1.1: Add log settings to `config/app.yaml` and `backend/app/core/config.py` (`log_search_max_bytes_scanned`, `log_stream_buffer_max_lines`, `log_backpressure_drop_threshold`).
- [x] Task 1.2: Add log streaming and historical fetch signatures to `DockerGateway` interface (`backend/app/docker/interface.py`).
- [x] Task 1.3: Implement 8-byte framing and raw TTY demuxing helper `demux_stream_data` in `backend/app/docker/demux.py`.
- [x] Task 1.4: Implement `get_container_logs` and `stream_container_logs` in `FakeGateway` and `EngineGateway`.

## Phase 2: Schemas & Service Layer
- [x] Task 2.1: Implement schemas in `backend/app/schemas/logs.py` (`LogEntry`, `LogSearchResponse`, `LogStreamParams`).
- [x] Task 2.2: Implement `backend/app/services/logs_service.py`:
  - `stream_logs_sse`: SSE generator with backpressure queue and skipped lines markers.
  - `search_logs`: Multi-container search with regex/plain-text filter and byte scan cap.

## Phase 3: API Router & Endpoints
- [x] Task 3.1: Add `GET /api/v1/containers/{id}/logs` (SSE or snapshot) to `backend/app/api/v1/containers.py`.
- [x] Task 3.2: Create `backend/app/api/v1/logs.py` with `GET /api/v1/logs/search` and register in router.

## Phase 4: Backend Tests
- [x] Task 4.1: Write unit tests in `backend/tests/test_logs_demux.py` (8-byte header demux, TTY, corrupted frames).
- [x] Task 4.2: Write service & API tests in `backend/tests/test_logs_service.py` and `backend/tests/test_logs_api.py` (streaming, backpressure marker, search limits, regex).
- [x] Task 4.3: Run `pytest` and verify 100% test pass.

## Phase 5: Frontend ANSI Parser & Log Viewer Component
- [x] Task 5.1: Create `frontend/src/app/core/models/logs.model.ts` and update `container.constants.ts`.
- [x] Task 5.2: Implement `AnsiParserService` (`frontend/src/app/core/services/ansi-parser.service.ts`) with unit tests.
- [x] Task 5.3: Build reusable standalone `LogViewerComponent` (`frontend/src/app/shared/components/log-viewer/`) with CDK Virtual Scroll, auto-scroll, wrap toggle, timestamp toggle, download, copy.
- [x] Task 5.4: Embed `LogViewerComponent` into `ContainerDetailComponent` **Logs** tab.

## Phase 6: Frontend Logs Explorer Page & Store
- [x] Task 6.1: Implement `LogsService` (`frontend/src/app/core/services/logs.service.ts`).
- [x] Task 6.2: Implement `LogsStore` (`frontend/src/app/features/logs/logs.store.ts`).
- [x] Task 6.3: Implement `LogsExplorerComponent` (`frontend/src/app/features/logs/logs-explorer.component.ts`) with multi-container picker and search toolbar.
- [x] Task 6.4: Add `/logs` route in `app.routes.ts` and sidebar navigation item.

## Phase 7: Frontend Tests & Production Build
- [x] Task 7.1: Unit tests for `LogViewerComponent`, `LogsExplorerComponent`, and `LogsStore`.
- [x] Task 7.2: Run `npm test` and verify 100% test pass.
- [x] Task 7.3: Run `ng build` and verify 0 warnings production build.

## Phase 8: Documentation & Commit
- [x] Task 8.1: Update `README.md` and `docs/progress.md`.
- [x] Task 8.2: Commit and push changes.
