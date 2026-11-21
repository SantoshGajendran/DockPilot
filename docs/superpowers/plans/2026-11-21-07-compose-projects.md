# Implementation Plan: Prompt 07 — Compose Projects

**Goal:** Provide multi-container stack orchestration by grouping containers under `com.docker.compose.project`, executing controlled compose actions with allow-list path verification, and streaming live subprocess job logs via SSE.

---

## Phase 1: Configuration & Gateway Extension
- [x] Task 1.1: Add Compose settings to `config/app.yaml` and `backend/app/core/config.py` (`compose_project_allow_paths`, `compose_project_paths`, `compose_job_timeout_seconds`).
- [x] Task 1.2: Add compose execution signatures to `DockerGateway` interface (`backend/app/docker/interface.py`).
- [x] Task 1.3: Implement compose execution in `backend/app/docker/fake.py` (simulated streaming output).
- [x] Task 1.4: Implement controlled subprocess execution in `backend/app/docker/engine.py` (safe arg list, no shell=True).

## Phase 2: Schemas & Job Subsystem
- [x] Task 2.1: Implement `backend/app/schemas/jobs.py` (`JobResponse`, `JobStatus`).
- [x] Task 2.2: Implement `backend/app/schemas/compose.py` (`ComposeServiceItem`, `ComposeProjectResponse`, `ComposeProjectsListResponse`).
- [x] Task 2.3: Implement `JobManager` in `backend/app/services/job_service.py` with subscriber queues and SSE stream generator.

## Phase 3: Compose Service Layer
- [x] Task 3.1: Implement `backend/app/services/compose_service.py`:
  - `list_projects`: groups containers by `com.docker.compose.project`, computes aggregate status (`running`, `partially_running`, `stopped`, `unhealthy`, `empty`), looks up compose file path and last audit record.
  - `execute_project_action`: enforces action whitelist (`up`, `down`, `restart`, `pull`, `stop`, `start`), validates path against allow-list, creates pre/post audit records, and registers job in `JobManager`.

## Phase 4: API Routers & Endpoints
- [x] Task 4.1: Create `backend/app/api/v1/jobs.py` (`GET /api/v1/jobs/{id}`, `GET /api/v1/jobs/{id}/stream`).
- [x] Task 4.2: Create `backend/app/api/v1/compose.py` (`GET /api/v1/compose/projects`, `POST /api/v1/compose/projects/{name}/{action}`).
- [x] Task 4.3: Register routers in `backend/app/api/v1/router.py`.

## Phase 5: Backend Tests
- [x] Task 5.1: Unit tests in `backend/tests/test_compose_service.py` (grouping, aggregate status, allow-list rejection, argument safety).
- [x] Task 5.2: Unit tests in `backend/tests/test_jobs_service.py` (job lifecycle, subscriber stream, error propagation).
- [x] Task 5.3: API tests in `backend/tests/test_compose_api.py` (endpoints, RBAC enforcement, audit log verification).
- [x] Task 5.4: Run `pytest` and verify 100% pass (107/107 passed).

## Phase 6: Frontend Models, Constants, & Service
- [x] Task 6.1: Define TypeScript interfaces in `frontend/src/app/core/models/compose.model.ts`.
- [x] Task 6.2: Create `frontend/src/app/core/constants/compose.constants.ts` with endpoints, actions, and status colors.
- [x] Task 6.3: Implement `ComposeService` in `frontend/src/app/core/services/compose.service.ts` with unit tests in `compose.service.spec.ts`.

## Phase 7: Frontend Component, Store, & Job Dialog
- [x] Task 7.1: Implement `ComposeStore` (`frontend/src/app/features/compose/compose.store.ts`) with unit tests in `compose.store.spec.ts`.
- [x] Task 7.2: Implement `JobOutputDialogComponent` (`frontend/src/app/features/compose/dialogs/job-output-dialog.component.ts`, `.html`, `.scss`) with unit tests in `job-output-dialog.component.spec.ts`.
- [x] Task 7.3: Implement `ComposeProjectsComponent` (`frontend/src/app/features/compose/compose-projects.component.ts`, `.html`, `.scss`):
  - Project cards with aggregate state badges and service counts.
  - Read-only Compose file path with copy button.
  - Last action details from audit log.
  - Action buttons (`Up`, `Down`, `Restart`, `Pull`, `Stop`, `Start`).
  - Expandable services table.
  - Launch live job dialog on action click.
- [x] Task 7.4: Unit tests in `compose-projects.component.spec.ts`.
- [x] Task 7.5: Register `/projects` route in `frontend/src/app/app.routes.ts`.

## Phase 8: Verification & Delivery
- [x] Task 8.1: Run full frontend test suite (`npm test --prefix frontend`) (130/130 passed across 29 suites).
- [x] Task 8.2: Run production build (`npm run build --prefix frontend`) and ensure 0 warnings.
- [x] Task 8.3: Update `README.md` and `docs/progress.md`.
- [x] Task 8.4: Update knowledge graph (`graphify update .`).
- [x] Task 8.5: Commit and push changes.
