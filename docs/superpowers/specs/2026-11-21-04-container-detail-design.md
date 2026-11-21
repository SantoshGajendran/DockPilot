# Design Specification: Prompt 04 — Container Detail Page

## 1. Objectives & Scope
Provide a comprehensive single-container inspection, telemetry, metrics history, and configuration management interface with deep-linkable tabs (`overview`, `metrics`, `logs`, `config`, `events`), secret-masked environment inspection with audited admin-reveal, live and historical Chart.js charts, and lifecycle controls.

---

## 2. Architecture & Data Flow

```
[ Angular /containers/:id?tab=... ]
   │
   ├── REST GET /api/v1/containers/{id} (detailed inspection + masked env)
   ├── SSE  GET /api/v1/containers/{id}/stats (live CPU, Mem, Net, Disk I/O)
   ├── REST GET /api/v1/containers/{id}/metrics?range=1h|6h|24h|7d (history)
   ├── POST /api/v1/containers/{id}/env/reveal (admin-only, audited)
   └── POST /api/v1/containers/{id}/{action} (lifecycle controls)
             │
      [ FastAPI Router /api/v1/containers ]
             │
      [ ContainersService, Security / Masking & MetricHistoryService ]
             │
      [ DockerGateway (inspect, stats) & PostgreSQL ]
```

---

## 3. Backend Specifications

### 3.1 Secret Masking & Configuration (`config/app.yaml` & `config.py`)
* `secret_mask_patterns`: `["*PASSWORD*", "*SECRET*", "*TOKEN*", "*KEY*", "*AUTH*", "*PRIVATE*", "*CREDENTIAL*"]`
* `metrics_history_retention_hours: 168` (7 days)
* Masking logic: If env key matches any pattern (case-insensitive glob/contains), mask value as `********` and set `is_masked: true`.

### 3.2 Database Model for Container Metrics History (`backend/app/models/metrics.py`)
* `ContainerMetricRecord`:
  - `id`: UUID (PK)
  - `container_id`: str (indexed)
  - `timestamp`: DateTime with timezone (indexed)
  - `cpu_percent`: float
  - `memory_bytes`: int
  - `memory_limit`: int
  - `network_rx_bytes`: int
  - `network_tx_bytes`: int
  - `block_read_bytes`: int
  - `block_write_bytes`: int

### 3.3 Schemas (`backend/app/schemas/container_detail.py`)
* `EnvVarItem`: `key: str, value: str, is_masked: bool`
* `MountItem`: `type: str, source: str, destination: str, mode: str, rw: bool`
* `NetworkItem`: `network_name: str, ip_address: str, gateway: str, mac_address: str`
* `HealthcheckInfo`: `status: str, failing_streak: int, log: List[Dict[str, Any]]`
* `ContainerDetailResponse`:
  - `id, name, image, command, created, state, status, health, restart_count`
  - `restart_policy: Dict[str, Any]`
  - `ports: Dict[str, Any]`
  - `mounts: List[MountItem]`
  - `networks: List[NetworkItem]`
  - `labels: Dict[str, str]`
  - `env: List[EnvVarItem]`
  - `limits: Dict[str, Any]`
  - `healthcheck: Optional[HealthcheckInfo]`
* `ContainerLiveStats`:
  - `container_id: str, timestamp: str, cpu_percent: float, memory_bytes: int, memory_limit: int, memory_percent: float, net_rx_bytes: int, net_tx_bytes: int, block_read_bytes: int, block_write_bytes: int`
* `ContainerMetricsHistoryResponse`:
  - `container_id: str, range: str, points: List[ContainerLiveStats]`
* `EnvRevealResponse`:
  - `env: List[EnvVarItem]`

### 3.4 Service Layer (`backend/app/services/container_detail_service.py`)
* `get_container_details(container_id, user_role)`:
  - Calls `gateway.inspect_container(container_id)`.
  - Parses mounts, networks, ports, restart policy, healthcheck, limits.
  - Applies secret masking to environment variables.
* `reveal_container_env(container_id, user_id, username, ip, db)`:
  - Checks user is admin.
  - Inspects container for raw env.
  - Audits `action="container.reveal_env"` with target container id and username.
  - Returns unmasked list.
* `stream_container_stats(container_id, gateway, interval_seconds)`:
  - SSE generator yielding live stats every 2-3s (calculating CPU %, memory, network RX/TX delta, block I/O delta).
* `get_container_metrics_history(container_id, time_range, db)`:
  - Queries `ContainerMetricRecord` within time range (1h, 6h, 24h, 7d).
  - Downsamples to at most 100 points for smooth charting.

---

## 4. Frontend Specifications

### 4.1 Route & Layout
* Lazy-loaded route: `/containers/:id` (`ContainerDetailComponent`).
* Synchronized `?tab=` query parameter (`overview`, `metrics`, `logs`, `config`, `events`).

### 4.2 Tab Views
1. **Overview**:
   - Header with status badges and lifecycle action buttons.
   - Key Facts card (image, command, created, restart policy, uptime).
   - Live CPU & Memory progress cards.
2. **Metrics**:
   - Range toggle: `Live`, `1h`, `6h`, `24h`, `7d`.
   - Chart.js line charts:
     - CPU % (live or historical)
     - Memory usage with container memory limit threshold line
     - Network I/O (Rx & Tx rates)
     - Disk/Block I/O (Read & Write rates)
3. **Logs**:
   - Terminal/monospace container log viewer with quick links and scrollable output.
4. **Config**:
   - Environment variables table with `********` masking and "Reveal Secrets" button for admins.
   - Mounts / Volumes table.
   - Network configuration table.
   - Labels dictionary.
5. **Events**:
   - Filtered timeline feed of Docker events for this specific container.

---

## 5. Security & RBAC Enforcement
* Secret masking: Enforced backend-side by default.
* Environment reveal: Strictly restricted to `admin` role with audit logging.
* Action controls: `viewer` read-only; `operator` lifecycle actions; `admin` delete.

---

## 6. Verification Plan
* Backend `pytest`:
  - Secret masking pattern matching.
  - Admin reveal auditing and non-admin denial (403).
  - CPU delta and network/block I/O calculation.
  - Historical range query & downsampling.
* Frontend `Jest`:
  - Tab routing and query-param synchronization.
  - Secret reveal button visibility and interaction.
  - Metrics range change and chart data binding.
  - Production `ng build` validation.
