# Design Specification: Prompt 03 — Containers List

## 1. Objectives & Scope
Provide a fast, responsive, and secure interface to monitor, filter, search, and perform single/bulk lifecycle operations on Docker containers with real-time SSE telemetry, strict RBAC enforcement (`viewer`, `operator`, `admin`), optimistic UI transitions, and audit logging.

---

## 2. Architecture & Data Flow

```
[ Angular /containers ] 
   │
   ├── REST GET /api/v1/containers (filter, sort, paginate)
   ├── SSE  GET /api/v1/containers/stream (live CPU %, Mem %, state updates)
   ├── REST POST /api/v1/containers/{id}/{action} (operator+)
   ├── REST POST /api/v1/containers/bulk (operator+)
   ├── REST POST /api/v1/containers/{id}/delete-token (admin)
   └── REST DELETE /api/v1/containers/{id}?token=... (admin)
             │
      [ FastAPI Router /api/v1/containers ]
             │
      [ ContainersService & AuditService ]
             │
      [ DockerGateway (EngineGateway / FakeGateway) ]
             │
      [ Docker Daemon via socket-proxy ]
```

---

## 3. Backend Specifications

### 3.1 Docker Gateway Updates
* Add `remove_container(container_id: str, force: bool = False)` to `DockerGateway`, `FakeGateway`, and `EngineGateway`.
* Enhance `FakeGateway` and `EngineGateway` to support `ports`, `health`, `restart_count`, and `created` formatting in container inspection/listing.

### 3.2 Configuration (`config/app.yaml` & `backend/app/core/config.py`)
* `containers_page_size_default: 20`
* `containers_page_size_max: 100`
* `delete_token_expire_seconds: 60`
* `containers_stream_interval_seconds: 3`

### 3.3 Schemas (`backend/app/schemas/container.py`)
* `ContainerPortMapping`: HostIp, HostPort, ContainerPort, Protocol.
* `ContainerSummary`: id, name, image, state, status, health, created, uptime_seconds, ports, labels, compose_project, restart_count.
* `ContainerLiveMetrics`: container_id, name, cpu_percent, memory_bytes, memory_limit, memory_percent, state, health.
* `ContainersListResponse`: items: List[ContainerSummary], total: int, page: int, page_size: int, total_pages: int.
* `BulkActionRequest`: action: str (`start`, `stop`, `restart`, `pause`, `unpause`, `kill`), container_ids: List[str].
* `BulkActionResultItem`: container_id: str, action: str, success: bool, message: Optional[str].
* `BulkActionResponse`: results: List[BulkActionResultItem], total_success: int, total_failed: int.
* `DeleteTokenResponse`: token: str, expires_at: datetime.

### 3.4 Service Layer (`backend/app/services/containers_service.py`)
* `list_containers(q, state, health, compose_project, label, sort_by, sort_order, page, page_size)`: In-memory filter/sort across Docker gateway output with pagination.
* `execute_container_action(container_id, action, user_id, username, ip)`:
  - Validates action against allowed actions (`start`, `stop`, `restart`, `pause`, `unpause`, `kill`).
  - Pre-audit: writes `AuditLog` entry in pending/started state.
  - Calls `gateway.execute_action(container_id, action)`.
  - Post-audit: updates audit record with `AuditResult.SUCCESS` or `AuditResult.FAILURE`.
* `execute_bulk_actions(action, container_ids, user_id, username, ip)`:
  - Iterates containers, executes action, records individual audit records, aggregates results.
* `generate_delete_token(container_id, user_id)`:
  - Issues signed short-lived token (60s) verifying container ID and admin user ID.
* `delete_container(container_id, token, user_id, username, ip)`:
  - Validates delete token signature and expiry.
  - Pre-audit & post-audit.
  - Calls `gateway.remove_container(container_id, force=True)`.
* `stream_container_metrics()`:
  - Background loop yielding SSE messages every 3s containing `List[ContainerLiveMetrics]`.

### 3.5 API Endpoints (`backend/app/api/v1/containers.py`)
* `GET /api/v1/containers` (`viewer`+)
* `GET /api/v1/containers/stream` (`viewer`+, token auth via query or header)
* `POST /api/v1/containers/{id}/{action}` (`operator`+)
* `POST /api/v1/containers/bulk` (`operator`+)
* `POST /api/v1/containers/{id}/delete-token` (`admin`)
* `DELETE /api/v1/containers/{id}` (`admin`)

---

## 4. Frontend Specifications

### 4.1 Constants & Models
* `CONTAINER_ACTIONS`: `start`, `stop`, `restart`, `pause`, `unpause`, `kill`, `delete`.
* `CONTAINER_FILTER_PRESETS`: Storage key for user presets in `localStorage`.
* TypeScript models matching backend schemas.

### 4.2 State Management (`ContainersStore`)
* Signals: `containers`, `total`, `page`, `pageSize`, `sortBy`, `sortOrder`, `filters`, `loading`, `error`, `selectedIds`, `liveMetrics` (map of `container_id -> ContainerLiveMetrics`).
* Optimistic mutations: `optimisticUpdateState(id, nextState)` with rollback on error.
* Real-time metrics merge: SSE events update live CPU/Memory signals without re-rendering entire table.

### 4.3 UI Components (`/containers`)
* **Filter Bar**:
  - Search input (debounced `q`).
  - Dropdowns: State, Health, Compose Project.
  - Saved Presets: Save current filter, Load preset, Delete preset (persisted in `localStorage`).
* **Table View**:
  - Checkbox selection header & rows.
  - Columns: Select, State & Health chips, Name, Image, Project, Ports, CPU mini-bar, Memory mini-bar, Uptime, Restart Count, Actions.
* **Bulk Action Toolbar**:
  - Sticky/floating banner when `selectedIds.length > 0`.
  - Actions: Start, Stop, Restart, Pause, Unpause, Kill.
  - Displays selected count and Clear button.
* **Dialogs**:
  - `ActionConfirmDialogComponent`: Standard action confirmation with warning details.
  - `DeleteContainerDialogComponent`: Destructive action requiring typing exact container name before enabling Delete button, requesting delete-token and executing removal.

---

## 5. Security & RBAC Enforcement
* UI mirrors backend RBAC:
  - `viewer`: Actions menu and bulk toolbar hidden/disabled.
  - `operator`: Can trigger lifecycle actions (`start`, `stop`, `restart`, `pause`, `unpause`, `kill`), delete option hidden.
  - `admin`: Full access including container deletion.
* Socket-proxy permissions: enable `DELETE=1` in `docker-compose.yml`.

---

## 6. Verification Plan
* Backend pytest:
  - Filtering, pagination, sorting edge cases.
  - Single action audit logging and failure rollback.
  - Bulk action partial failure execution and auditing.
  - Delete token generation, expiry, and wrong-container prevention.
  - RBAC verification (`viewer` gets 403 on action, `operator` gets 403 on delete).
* Frontend Jest:
  - Store signal state transitions and optimistic rollback.
  - Filter preset persistence in `localStorage`.
  - Table selection and bulk action triggers.
  - Confirmation dialog flows and name verification input.
  - Production `ng build` validation.
