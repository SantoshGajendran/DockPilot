# Design Specification: Prompt 06 — Host / Server Page

**Author:** Antigravity  
**Date:** 2026-11-21  
**Status:** Approved  
**Prompt Target:** `docs/prompts/06-host-server.md`

---

## 1. Overview & Objective

Prompt 06 introduces full server-level visibility into the Ubuntu host executing DockPilot. It provides operators and administrators with deep telemetry about machine hardware, kernel, operating system, Docker disk footprint, per-core CPU, memory/swap, disk mounts (including inode exhaustion risk), network throughput per interface, disk I/O, temperatures, and top consuming host processes.

---

## 2. Global Constraints & Architecture Adherence

1. **No hardcoded domain terms**: Warning (80%) and critical (90%) thresholds, intervals, process limits, and colors come from `config/app.yaml` and typed frontend/backend constants.
2. **Layered backend**: Service layer (`HostService`), schemas (`app/schemas/host.py`), router (`app/api/v1/host.py`), and abstract Docker integration (`DockerGateway`).
3. **Stand-alone Angular architecture**: Standalone lazy-loaded route `/host` (`HostComponent`), lightweight signal store (`HostStore`), typed API service (`HostService`), error/empty/loading states, and full Jest test suite.
4. **Security & RBAC**: `viewer` role can view host info, live metrics, and history; `operator` and `admin` tiers inherit access. Backend enforces bind `127.0.0.1`.
5. **Database persistence & Downsampling**: Alembic migration `0003_host_metrics.py` creates `host_metrics` table; historical telemetry endpoint `GET /api/v1/host/metrics/history` downsamples time windows to max 100 data points.

---

## 3. Backend Architecture

### 3.1 Configuration (`config/app.yaml` & `backend/app/core/config.py`)
```yaml
host_metrics_interval_seconds: 3
host_top_processes_count: 10
host_cpu_warning_threshold: 80.0
host_cpu_critical_threshold: 90.0
host_memory_warning_threshold: 80.0
host_memory_critical_threshold: 90.0
host_disk_warning_threshold: 80.0
host_disk_critical_threshold: 90.0
```

### 3.2 Docker Gateway Extension (`app/docker/interface.py`)
```python
@abstractmethod
async def get_docker_info(self) -> Dict[str, Any]:
    """Return Docker daemon version, storage driver, and root dir."""
    pass

@abstractmethod
async def get_docker_disk_usage(self) -> Dict[str, Any]:
    """Return disk space usage breakdown (images, containers, volumes, build cache)."""
    pass
```
- `EngineGateway`: Wraps `client.version()`, `client.info()`, and `client.df()`.
- `FakeGateway`: Provides realistic mock structures for Docker info and system df stats.

### 3.3 Schemas (`app/schemas/host.py`)
- `HostInfoResponse`: `hostname`, `os_name`, `os_version`, `kernel_version`, `cpu_model`, `cpu_cores_physical`, `cpu_cores_logical`, `total_memory_bytes`, `docker_version`, `docker_storage_driver`.
- `HostCpuMetrics`: `overall_percent`, `cores_percent: List[float]`.
- `HostMemoryMetrics`: `total_bytes`, `used_bytes`, `available_bytes`, `percent`, `swap_total_bytes`, `swap_used_bytes`, `swap_percent`.
- `HostMountMetrics`: `mountpoint`, `device`, `fstype`, `total_bytes`, `used_bytes`, `free_bytes`, `percent`, `inodes_total`, `inodes_used`, `inodes_free`, `inodes_percent`.
- `HostDiskIoMetrics`: `read_bytes_sec`, `write_bytes_sec`, `read_count_sec`, `write_count_sec`.
- `HostNetworkMetrics`: `interface_name`, `rx_bytes_sec`, `tx_bytes_sec`, `rx_packets_sec`, `tx_packets_sec`, `rx_errors`, `tx_errors`.
- `HostTemperatureItem`: `sensor_name`, `label`, `current_celsius`, `high_celsius`, `critical_celsius`.
- `HostProcessItem`: `pid`, `name`, `username`, `cpu_percent`, `memory_percent`, `memory_rss_bytes`, `status`.
- `HostLiveMetricsResponse`: CPU, Memory, Mounts, Disk I/O, Network interfaces, Load averages (`load_1m`, `load_5m`, `load_15m`), Temperatures, and Top processes.
- `HostMetricPoint`: `timestamp`, `cpu_percent`, `memory_bytes`, `swap_bytes`, `disk_read_bytes`, `disk_write_bytes`, `network_rx_bytes`, `network_tx_bytes`.
- `HostHistoryResponse`: `range: str`, `points: List[HostMetricPoint]`.
- `DockerDiskUsageResponse`: Breakdown items (`images`, `containers`, `volumes`, `build_cache`) with `count`, `total_bytes`, `reclaimable_bytes`, `reclaimable_percent`.

### 3.4 Service Layer (`app/services/host_service.py`)
- `get_host_info`: Reads platform, cpuinfo / processor model, physical & logical core count, total RAM, and Docker daemon info.
- `collect_live_metrics`: Gathers real-time snapshot via `psutil`:
  - `psutil.cpu_percent(percpu=True)`
  - `psutil.virtual_memory()` and `psutil.swap_memory()`
  - `psutil.disk_partitions()` + `psutil.disk_usage()` + `os.statvfs` (with cross-platform fallback for Windows dev)
  - Rate-calculated disk I/O and network I/O
  - `psutil.getloadavg()` (or `(0.0, 0.0, 0.0)` fallback)
  - `psutil.sensors_temperatures()` (with fallback)
  - `psutil.process_iter()` sorted by CPU %
- `get_metrics_history`: Queries `HostMetricRecord` with downsampling algorithm down to max 100 points for `1h`, `6h`, `24h`, and `7d`.
- `get_docker_disk_usage`: Formats Docker system df stats.

### 3.5 Database Model & Migration
- Model `HostMetricRecord` in `backend/app/models/metrics.py`.
- Alembic migration `0003_host_metrics.py`.

### 3.6 API Router (`app/api/v1/host.py`)
- `GET /api/v1/host/info`
- `GET /api/v1/host/metrics`
- `GET /api/v1/host/metrics/history?range=1h|6h|24h|7d`
- `GET /api/v1/host/docker-usage`

---

## 4. Frontend Architecture

### 4.1 Models & Constants
- `frontend/src/app/core/models/host.model.ts`: Matching TypeScript interfaces.
- `frontend/src/app/core/constants/host.constants.ts`: Threshold configs (`warning: 80`, `critical: 90`), refresh intervals, colors, and API endpoints.

### 4.2 Service & Store
- `HostService` (`frontend/src/app/core/services/host.service.ts`): Typed HTTP client calling host endpoints.
- `HostStore` (`frontend/src/app/features/host/host.store.ts`): Angular signals store managing host info, live metrics (auto-refreshed via polling/timer), history series with selected range, docker disk usage, loading, and error states.

### 4.3 UI Components (`frontend/src/app/features/host/`)
- `HostComponent` (`host.component.ts`):
  - **Info Header Card**: OS, kernel, hostname, CPU model, total RAM, Docker version, storage driver.
  - **Per-Core CPU Heatmap**: Grid of cores showing individual load % with color gradient (green -> yellow -> red).
  - **Memory & Swap Utilization**: Dual radial or progress bars showing RAM and Swap usage with warning badges.
  - **Mount Points & Inodes Table**: Mountpoint, device, filesystem, space usage bar (colored by threshold), and inode usage % with warning tags when near exhaustion.
  - **Host Telemetry History Charts**: Responsive line charts for CPU, Memory/Swap, Network I/O, and Disk I/O with range selector (`1h`, `6h`, `24h`, `7d`).
  - **Docker Disk Usage Breakdown**: Cards / progress bars for Images, Containers, Volumes, and Build Cache with reclaimable savings indicator.
  - **Top Processes Table**: Sortable table with PID, process name, user, CPU %, Memory %, and status.
  - **Sensors / Temperatures**: Thermal indicators when hardware sensors are available.

### 4.4 Routing
- Route `/host` registered in `app.routes.ts` pointing to `HostComponent`.

---

## 5. Testing & Verification

1. **Backend Tests**:
   - `test_host_service.py`: Collector mocked with `psutil` fixtures (CPU, memory, disk, network, inodes, processes, sensors).
   - `test_host_api.py`: FastAPI test client testing `/host/info`, `/host/metrics`, `/host/metrics/history`, and `/host/docker-usage` with RBAC checks.
2. **Frontend Tests**:
   - `host.service.spec.ts`: HTTP mocks for all endpoints.
   - `host.store.spec.ts`: Signal state updates, range switching, error handling.
   - `host.component.spec.ts`: Component rendering, per-core CPU grid, disk threshold styling, process table.
3. **Verification**:
   - 100% pytest passing.
   - 100% Jest tests passing.
   - Production build `ng build` passing with 0 warnings.
