# Design Specification: Prompt 07 — Compose Projects

**Author:** Antigravity  
**Date:** 2026-11-21  
**Status:** Approved  
**Prompt Target:** `docs/prompts/07-compose-projects.md`

---

## 1. Overview & Objective

Prompt 07 introduces full stack-level orchestration by grouping Docker containers according to their Compose metadata (`com.docker.compose.project`). Operators and administrators can monitor aggregate stack health, inspect service topologies, review compose configuration file paths and audit history, and trigger multi-container stack lifecycles (`up`, `down`, `restart`, `pull`, `stop`, `start`) with real-time SSE job output streaming and strict directory allow-list security enforcement.

---

## 2. Global Constraints & Architecture Adherence

1. **No hardcoded domain terms**: Actions, statuses, intervals, paths, and route titles originate from `config/app.yaml` and typed frontend/backend constants.
2. **Layered backend**: Dedicated service (`ComposeService`, `JobService`), schemas (`app/schemas/compose.py`, `app/schemas/jobs.py`), and routers (`app/api/v1/compose.py`, `app/api/v1/jobs.py`).
3. **Security & Injection Prevention**:
   - Subprocess commands are executed via `asyncio.create_subprocess_exec` with explicit argument lists (no shell interpolation).
   - Project working directories and config files are validated against `compose_project_allow_paths` from `config/app.yaml`.
   - Control operations require `operator` or `admin` role and record pre- and post-action audit records.
4. **Asynchronous Jobs with Live Output**: Long-running compose commands return a Job ID; frontend streams real-time stdout/stderr via Server-Sent Events (`/api/v1/jobs/{id}/stream`).
5. **Standalone Angular Architecture**: Standalone `/projects` route, signal store (`ComposeStore`), typed API service, dialog for real-time terminal job output (`JobOutputDialogComponent`), loading/empty/error states, and comprehensive Jest unit tests.

---

## 3. Backend Architecture

### 3.1 Configuration (`config/app.yaml` & `backend/app/core/config.py`)
```yaml
compose_project_allow_paths:
  - "/opt/stacks"
  - "/home/ubuntu/dockpilot"
  - "/var/dockpilot/compose"
  - "c:/Santosh/Development/dockpilot"
  - "."
compose_project_paths:
  dockpilot: "."
  web: "/opt/stacks/web"
  worker: "/opt/stacks/worker"
  cache: "/opt/stacks/cache"
compose_job_timeout_seconds: 300
```

### 3.2 Docker Gateway Extension (`app/docker/interface.py`)
- Compose metadata extraction helper using standard labels:
  - `com.docker.compose.project`: Project name
  - `com.docker.compose.service`: Service name
  - `com.docker.compose.project.working_dir`: Working directory
  - `com.docker.compose.project.config_files`: Compose file path
- `execute_compose_action(project_name, action, working_dir, config_file)`:
  - In `EngineGateway`: executes `docker compose -f <config_file> <action>` or falls back to system subprocess.
  - In `FakeGateway`: mocks realistic compose stdout/stderr streams with exit code.

### 3.3 Schemas
- `app/schemas/compose.py`:
  - `ComposeServiceItem`: `service_name`, `container_id`, `container_name`, `state`, `status`, `health`, `image`.
  - `ComposeProjectResponse`: `name`, `status` (`running`, `partially_running`, `stopped`, `unhealthy`, `empty`), `containers_count`, `running_count`, `config_files`, `working_dir`, `services: List[ComposeServiceItem]`, `last_action: Optional[AuditLogSummary]`.
  - `ComposeProjectsListResponse`: `projects: List[ComposeProjectResponse]`, `total: int`.
  - `ComposeActionRequest`: `action: str`.
- `app/schemas/jobs.py`:
  - `JobResponse`: `id`, `project_name`, `action`, `status` (`pending`, `running`, `completed`, `failed`), `exit_code: Optional[int]`, `created_at`, `finished_at`, `logs: List[str]`, `error: Optional[str]`.

### 3.4 Job Manager (`app/services/job_service.py`)
- In-memory thread-safe `JobManager` maintaining active and completed jobs.
- Bounded subscriber queues (`asyncio.Queue`) for live SSE distribution.
- Emits output line-by-line; closes stream when job reaches terminal state.

### 3.5 Compose Service (`app/services/compose_service.py`)
- `list_projects(db: AsyncSession)`:
  - Queries containers from `DockerGateway.list_containers(all=True)`.
  - Groups by `com.docker.compose.project`.
  - Derives aggregate project state.
  - Attaches latest audit action from `AuditLog` table.
- `execute_project_action(project_name, action, current_user, db)`:
  - Verifies action is in allowed set: `['up', 'down', 'restart', 'pull', 'stop', 'start']`.
  - Resolves project directory and validates against allow-list.
  - Writes pending audit record.
  - Creates job in `JobManager`.
  - Spawns background worker task streaming subprocess output.
  - On exit, updates audit record with result and surfaces stderr if failed.

### 3.6 API Routers
- `app/api/v1/compose.py`:
  - `GET /api/v1/compose/projects`
  - `POST /api/v1/compose/projects/{name}/{action}`
- `app/api/v1/jobs.py`:
  - `GET /api/v1/jobs/{id}`
  - `GET /api/v1/jobs/{id}/stream` (SSE)

---

## 4. Frontend Architecture

### 4.1 Models & Constants
- `frontend/src/app/core/models/compose.model.ts`: `ComposeProject`, `ComposeServiceItem`, `ComposeJob`, `JobStreamEvent`.
- `frontend/src/app/core/constants/compose.constants.ts`: API endpoints, allowed actions, status colors, and refresh intervals.

### 4.2 Services & Store
- `ComposeService` (`frontend/src/app/core/services/compose.service.ts`):
  - `getProjects()`: HTTP GET `/api/v1/compose/projects`.
  - `executeAction(name, action)`: HTTP POST `/api/v1/compose/projects/{name}/{action}` returning `ComposeJob`.
  - `getJob(id)`: HTTP GET `/api/v1/jobs/{id}`.
  - `streamJob(id)`: SSE connection `/api/v1/jobs/{id}/stream`.
- `ComposeStore` (`frontend/src/app/features/compose/compose.store.ts`):
  - Angular signals: `projects`, `isLoading`, `error`, `activeJobId`.
  - Methods: `loadProjects()`, `triggerAction(project, action)`.

### 4.3 UI Components (`frontend/src/app/features/compose/`)
- `ComposeProjectsComponent` (`compose-projects.component.ts`, `.html`, `.scss`):
  - Registered under route `/projects`.
  - Project Cards:
    - Title, aggregate status badge, service count chip.
    - Compose file path (read-only) with copy button.
    - Last audit action chip.
    - Action buttons (`Up`, `Down`, `Restart`, `Pull`, `Stop`, `Start`).
    - Expandable accordion with services table.
- `JobOutputDialogComponent` (`dialogs/job-output-dialog.component.ts`, `.html`, `.scss`):
  - Angular Material Dialog modal.
  - Streams SSE logs line-by-line into a styled monospace dark terminal.
  - Shows progress spinner during execution and success/error status icon upon exit.
  - Closes with list refresh.

---

## 5. Testing & Verification

1. **Backend Tests**:
   - `test_compose_service.py`: Grouping logic, aggregate state calculation, allow-list rejection, command injection safety.
   - `test_jobs_service.py`: Job lifecycle, bounded queue subscriber, SSE event formatting.
   - `test_compose_api.py`: FastAPI endpoints, RBAC checks (`operator` requirement), job creation, error handling.
2. **Frontend Tests**:
   - `compose.service.spec.ts`: API calls and SSE stream handler.
   - `compose.store.spec.ts`: Projects state, job triggering, error handling.
   - `job-output-dialog.component.spec.ts`: Terminal rendering, status chips.
   - `compose-projects.component.spec.ts`: Component rendering, action buttons, dialog launch.
3. **Verification**:
   - 100% pytest pass.
   - 100% Jest pass.
   - Production build `ng build` with 0 warnings.
