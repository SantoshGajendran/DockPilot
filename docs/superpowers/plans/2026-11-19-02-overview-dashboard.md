# Master Prompt 02: Overview Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a real-time, one-glance overview dashboard monitoring host server health (CPU, RAM, disk, load, uptime) and Docker container states, top resource consumers, recent events, and active alerts via REST and Server-Sent Events (SSE).

**Architecture:** An asynchronous background collector (`OverviewCollectorService`) periodically caches host metrics (via `psutil`) and Docker container stats (via `DockerGateway`). Fast $O(1)$ reads serve both `GET /api/v1/overview` and the streaming `GET /api/v1/overview/stream` SSE endpoint. Angular 19 signals drive the frontend `DashboardStore` with an automatic stale-data watchdog, feeding host gauge cards, a container state donut chart, top-consumer bar charts, and an activity feed.

**Tech Stack:** Python 3.12, FastAPI, psutil, Docker SDK, Pydantic v2, pytest, Angular 19, Angular Material, ng2-charts / Chart.js, RxJS, Jest.

**Spec:** [docs/superpowers/specs/2026-11-19-02-overview-dashboard-design.md](file:///c:/Santosh/Development/dockpilot/docs/superpowers/specs/2026-11-19-02-overview-dashboard-design.md)

## Global Constraints

- **No hardcoded domain terms:** Intervals, limits, multipliers, route titles, and statuses come from `config/app.yaml` or typed constants.
- **Service layer architecture:** All calculation and collection logic sits in `app.services.overview_service`; endpoints only validate, route, and stream.
- **Docker client abstraction:** All Docker interaction sits behind abstract `DockerGateway`; tests use `FakeGateway`.
- **Role checks:** Require minimum `Role.VIEWER` on both REST and SSE endpoints.
- **Network binding:** Backend binds exclusively to `127.0.0.1`.
- **TDD:** Write tests first, observe failure (RED), implement (GREEN), and commit.

---

### Task 1: Backend Schemas, Config & Docker Gateway Extension

**Files:**
- Modify: `config/app.yaml`
- Modify: `backend/app/core/config.py`
- Create: `backend/app/schemas/overview.py`
- Modify: `backend/app/docker/interface.py`
- Modify: `backend/app/docker/fake.py`
- Modify: `backend/app/docker/engine.py`
- Create: `backend/tests/test_overview_schemas.py`
- Modify: `backend/tests/test_docker_gateway.py`

**Interfaces:**
- Consumes: `DockerGateway`, Pydantic `BaseModel`
- Produces: `HostMetrics`, `ContainerStateCounts`, `ContainerConsumerSummary`, `DockerEventSummary`, `OverviewResponse`, `DockerGateway.get_container_stats()`, `DockerGateway.get_recent_events()`.

- [ ] **Step 1: Write failing test for overview schemas and gateway extension**

Create `backend/tests/test_overview_schemas.py`:
```python
from datetime import datetime, timezone
import pytest
from app.schemas.overview import (
    HostMetrics,
    ContainerStateCounts,
    ContainerConsumerSummary,
    DockerEventSummary,
    OverviewResponse,
)
from app.docker.fake import FakeGateway

def test_overview_schemas_serialization():
    host = HostMetrics(
        cpu_percent=12.5,
        memory_percent=45.0,
        memory_used_bytes=4294967296,
        memory_total_bytes=17179869184,
        disk_percent=60.0,
        disk_used_bytes=107374182400,
        disk_total_bytes=214748364800,
        load_avg=[0.85, 1.10, 0.95],
        uptime_seconds=86400,
    )
    counts = ContainerStateCounts(
        total=5,
        running=3,
        exited=1,
        restarting=0,
        unhealthy=1,
        paused=0,
    )
    top_c = [
        ContainerConsumerSummary(
            id="c1",
            name="web-service",
            image="nginx:latest",
            cpu_percent=8.2,
            memory_bytes=104857600,
            memory_percent=1.2,
            status="running",
        )
    ]
    events = [
        DockerEventSummary(
            id="ev1",
            action="start",
            actor_type="container",
            actor_name="web-service",
            timestamp=datetime.now(timezone.utc),
        )
    ]
    resp = OverviewResponse(
        host=host,
        containers=counts,
        top_cpu=top_c,
        top_memory=top_c,
        recent_events=events,
        active_alerts_count=0,
        docker_connected=True,
        timestamp=datetime.now(timezone.utc),
    )
    data = resp.model_dump()
    assert data["host"]["cpu_percent"] == 12.5
    assert data["containers"]["total"] == 5
    assert data["docker_connected"] is True

@pytest.mark.asyncio
async def test_fake_gateway_stats_and_events():
    gateway = FakeGateway()
    stats = await gateway.get_container_stats("c1")
    assert "cpu_percent" in stats
    assert "memory_bytes" in stats

    events = await gateway.get_recent_events(limit=5)
    assert isinstance(events, list)
    assert len(events) >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_overview_schemas.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.schemas.overview'`

- [ ] **Step 3: Implement config keys, schemas, and gateway methods**

1. Update `config/app.yaml`:
```yaml
metrics_interval_seconds: 3
top_containers_limit: 5
recent_events_limit: 10
stale_threshold_multiplier: 2.0
```
2. Update `backend/app/core/config.py`:
Add fields to `Settings`:
```python
    metrics_interval_seconds: int = 3
    top_containers_limit: int = 5
    recent_events_limit: int = 10
    stale_threshold_multiplier: float = 2.0
```
3. Create `backend/app/schemas/overview.py`:
Implement `HostMetrics`, `ContainerStateCounts`, `ContainerConsumerSummary`, `DockerEventSummary`, and `OverviewResponse`.
4. Update `backend/app/docker/interface.py`:
Add abstract methods:
```python
    @abstractmethod
    async def get_container_stats(self, container_id: str) -> Dict[str, Any]:
        """Get live resource stats for a container."""
        pass

    @abstractmethod
    async def get_recent_events(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve the most recent Docker lifecycle events."""
        pass
```
5. Update `backend/app/docker/fake.py`:
Implement `get_container_stats` and `get_recent_events`.
6. Update `backend/app/docker/engine.py`:
Implement `get_container_stats` and `get_recent_events` using Docker SDK.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_overview_schemas.py backend/tests/test_docker_gateway.py -v`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add config/app.yaml backend/app/core/config.py backend/app/schemas/overview.py backend/app/docker/ backend/tests/test_overview_schemas.py
git commit -m "feat(backend): add overview schemas, config keys, and gateway stats methods"
```

---

### Task 2: Backend System & Docker Metrics Collector Service

**Files:**
- Create: `backend/app/services/overview_service.py`
- Create: `backend/tests/test_overview_service.py`

**Interfaces:**
- Consumes: `psutil`, `DockerGateway`, `Settings`, `OverviewResponse`
- Produces: `OverviewCollectorService` (`start()`, `stop()`, `get_snapshot()`, `subscribe()`, `unsubscribe()`, `collect_metrics()`)

- [ ] **Step 1: Write failing test for OverviewCollectorService**

Create `backend/tests/test_overview_service.py`:
```python
import pytest
from app.docker.fake import FakeGateway
from app.services.overview_service import OverviewCollectorService

@pytest.mark.asyncio
async def test_overview_collector_collect_metrics():
    gateway = FakeGateway()
    collector = OverviewCollectorService(docker_gateway=gateway)
    
    snapshot = await collector.collect_metrics()
    assert snapshot is not None
    assert snapshot.host.cpu_percent >= 0.0
    assert snapshot.host.memory_total_bytes > 0
    assert snapshot.containers.total == 1
    assert snapshot.containers.running == 1
    assert snapshot.docker_connected is True
    assert len(snapshot.top_cpu) <= 5
    assert len(snapshot.recent_events) >= 1

@pytest.mark.asyncio
async def test_overview_collector_broadcast_queue():
    gateway = FakeGateway()
    collector = OverviewCollectorService(docker_gateway=gateway)
    
    queue = collector.subscribe()
    snapshot = await collector.collect_metrics()
    await collector.broadcast(snapshot)
    
    received = await queue.get()
    assert received.host.memory_total_bytes == snapshot.host.memory_total_bytes
    collector.unsubscribe(queue)

@pytest.mark.asyncio
async def test_overview_collector_docker_error_graceful():
    class BrokenGateway(FakeGateway):
        async def list_containers(self, all: bool = True):
            raise RuntimeError("Docker daemon connection failed")

    collector = OverviewCollectorService(docker_gateway=BrokenGateway())
    snapshot = await collector.collect_metrics()
    assert snapshot.docker_connected is False
    assert snapshot.containers.total == 0
    assert snapshot.host.cpu_percent >= 0.0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_overview_service.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.overview_service'`

- [ ] **Step 3: Implement OverviewCollectorService**

Create `backend/app/services/overview_service.py`:
- Use `psutil` to sample CPU percent, memory, disk, load average, and boot time.
- Query `docker_gateway.list_containers()`, iterate over containers to group counts by status: `running`, `exited`, `restarting`, `unhealthy` (checking health status in inspect/labels), `paused`.
- Gather CPU/RAM consumption for running containers, sort top $N$ by `cpu_percent` descending and top $N$ by `memory_bytes` descending.
- Query `docker_gateway.get_recent_events(limit=recent_events_limit)`.
- Query `active_alerts_count` (returns 0 for now until Alerts subsystem is built).
- Build and cache `OverviewResponse`.
- Implement `start()` and `stop()` managing background `asyncio.Task` with sleep loop configured by `settings.metrics_interval_seconds`.
- Maintain list of subscriber `asyncio.Queue[OverviewResponse]` with safe broadcast.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_overview_service.py -v`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add backend/app/services/overview_service.py backend/tests/test_overview_service.py
git commit -m "feat(backend): implement overview metrics collector service and broadcast queues"
```

---

### Task 3: Backend REST and SSE Endpoints with App Lifespan Integration

**Files:**
- Create: `backend/app/api/v1/overview.py`
- Modify: `backend/app/api/v1/router.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_overview_api.py`

**Interfaces:**
- Consumes: `OverviewCollectorService`, `get_current_active_user`, `require_role(Role.VIEWER)`
- Produces: `GET /api/v1/overview`, `GET /api/v1/overview/stream`

- [ ] **Step 1: Write failing test for overview REST and SSE endpoints**

Create `backend/tests/test_overview_api.py`:
```python
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import create_app
from app.core.security import create_access_token
from app.core.constants import Role
import uuid

@pytest.mark.asyncio
async def test_get_overview_unauthorized():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/overview")
        assert resp.status_code == 401

@pytest.mark.asyncio
async def test_get_overview_authorized():
    app = create_app()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer_user", role=Role.VIEWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/api/v1/overview", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert "host" in data
        assert "containers" in data
        assert "docker_connected" in data

@pytest.mark.asyncio
async def test_overview_stream_sse():
    app = create_app()
    token = create_access_token(user_id=uuid.uuid4(), username="viewer_user", role=Role.VIEWER)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        async with client.stream(
            "GET",
            "/api/v1/overview/stream",
            headers={"Authorization": f"Bearer {token}"},
        ) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
            lines = []
            async for line in response.aiter_lines():
                if line:
                    lines.append(line)
                if len(lines) >= 2:
                    break
            assert any("data:" in l or ": ping" in l for l in lines)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_overview_api.py -v`
Expected: FAIL with 404 Not Found on `/api/v1/overview`

- [ ] **Step 3: Implement endpoints and lifespan collector**

1. Create `backend/app/api/v1/overview.py`:
   - `GET /`: validates viewer role, returns latest snapshot from collector. If snapshot is None, triggers an immediate collection.
   - `GET /stream`: validates viewer role (supporting token in `Authorization` header or query param `token` for EventSource compatibility), subscribes to collector queue, yields SSE formatted events (`data: <json>\n\n`) and keepalive comments (`: ping\n\n`), cleans up subscription upon client disconnect.
2. Update `backend/app/api/v1/router.py`:
   - `api_router.include_router(overview.router, prefix="/overview", tags=["overview"])`
3. Update `backend/app/main.py`:
   - In `lifespan(app: FastAPI)`: start `OverviewCollectorService` background task on startup; cancel/stop on shutdown. Provide dependency injection access for endpoints.

- [ ] **Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_overview_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add backend/app/api/v1/overview.py backend/app/api/v1/router.py backend/app/main.py backend/tests/test_overview_api.py
git commit -m "feat(backend): implement overview REST and SSE stream endpoints with lifespan management"
```

---

### Task 4: Frontend Chart Dependencies, Models & Overview Service

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/app/core/models/overview.model.ts`
- Create: `frontend/src/app/core/constants/overview.constants.ts`
- Create: `frontend/src/app/core/services/overview.service.ts`
- Create: `frontend/src/app/core/services/overview.service.spec.ts`

**Interfaces:**
- Consumes: `HttpClient`, `SseService`, `TokenResponse`, `OverviewResponse`
- Produces: `OverviewService` (`getOverview(): Observable<OverviewResponse>`, `getOverviewStream(): Observable<OverviewResponse>`)

- [ ] **Step 1: Install chart.js and ng2-charts**

Run in `frontend/`:
```bash
npm install chart.js@^4.4.0 ng2-charts@^6.0.1
```

- [ ] **Step 2: Write failing test for OverviewService**

Create `frontend/src/app/core/services/overview.service.spec.ts`:
```typescript
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { OverviewService } from './overview.service';
import { SseService } from './sse.service';
import { of } from 'rxjs';
import { OverviewResponse } from '../models/overview.model';

describe('OverviewService', () => {
  let service: OverviewService;
  let httpMock: HttpTestingController;
  let sseServiceSpy: jest.Mocked<SseService>;

  const mockOverview: OverviewResponse = {
    host: {
      cpu_percent: 10.5,
      memory_percent: 50.0,
      memory_used_bytes: 8589934592,
      memory_total_bytes: 17179869184,
      disk_percent: 40.0,
      disk_used_bytes: 42949672960,
      disk_total_bytes: 107374182400,
      load_avg: [0.5, 0.7, 0.6],
      uptime_seconds: 12000
    },
    containers: {
      total: 2,
      running: 2,
      exited: 0,
      restarting: 0,
      unhealthy: 0,
      paused: 0
    },
    top_cpu: [],
    top_memory: [],
    recent_events: [],
    active_alerts_count: 0,
    docker_connected: true,
    timestamp: '2026-11-19T10:00:00Z'
  };

  beforeEach(() => {
    sseServiceSpy = {
      connect: jest.fn().mockReturnValue(of(mockOverview)),
      disconnect: jest.fn()
    } as unknown as jest.Mocked<SseService>;

    TestBed.configureTestingModule({
      providers: [
        OverviewService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SseService, useValue: sseServiceSpy }
      ]
    });

    service = TestBed.inject(OverviewService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch overview snapshot via HTTP GET', () => {
    service.getOverview().subscribe(res => {
      expect(res.host.cpu_percent).toBe(10.5);
      expect(res.containers.running).toBe(2);
    });

    const req = httpMock.expectOne('/api/v1/overview');
    expect(req.request.method).toBe('GET');
    req.flush(mockOverview);
  });

  it('should receive overview stream from SseService', (done) => {
    service.getOverviewStream().subscribe(res => {
      expect(res.docker_connected).toBe(true);
      expect(sseServiceSpy.connect).toHaveBeenCalledWith('/api/v1/overview/stream');
      done();
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern=overview.service.spec.ts`
Expected: FAIL with `Cannot find module './overview.service'`

- [ ] **Step 4: Implement overview models, constants, and service**

1. Create `frontend/src/app/core/models/overview.model.ts`:
   Define TypeScript interfaces for `HostMetrics`, `ContainerStateCounts`, `ContainerConsumerSummary`, `DockerEventSummary`, and `OverviewResponse`.
2. Create `frontend/src/app/core/constants/overview.constants.ts`:
   Define API endpoints:
   ```typescript
   export const OVERVIEW_ENDPOINTS = {
     overview: '/api/v1/overview',
     stream: '/api/v1/overview/stream'
   } as const;
   ```
3. Create `frontend/src/app/core/services/overview.service.ts`:
   - `getOverview(): Observable<OverviewResponse>`: `this.http.get<OverviewResponse>(OVERVIEW_ENDPOINTS.overview)`.
   - `getOverviewStream(): Observable<OverviewResponse>`: `this.sseService.connect<OverviewResponse>(OVERVIEW_ENDPOINTS.stream)`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern=overview.service.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit changes**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/app/core/models/overview.model.ts frontend/src/app/core/constants/overview.constants.ts frontend/src/app/core/services/overview.service*
git commit -m "feat(frontend): add overview models, constants, and typed API service"
```

---

### Task 5: Frontend Signal-Based Dashboard Store

**Files:**
- Create: `frontend/src/app/features/dashboard/dashboard.store.ts`
- Create: `frontend/src/app/features/dashboard/dashboard.store.spec.ts`

**Interfaces:**
- Consumes: `OverviewService`, Angular signals, Chart.js types
- Produces: `DashboardStore` (`data`, `isLoading`, `isStale`, `error`, `hasContainers`, `containerStateChartData`, `topCpuChartData`, `topMemoryChartData`, `init()`, `destroy()`)

- [ ] **Step 1: Write failing test for DashboardStore**

Create `frontend/src/app/features/dashboard/dashboard.store.spec.ts`:
```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { DashboardStore } from './dashboard.store';
import { OverviewService } from '../../core/services/overview.service';
import { OverviewResponse } from '../../core/models/overview.model';

describe('DashboardStore', () => {
  let store: DashboardStore;
  let overviewServiceSpy: jest.Mocked<OverviewService>;

  const mockData: OverviewResponse = {
    host: {
      cpu_percent: 25.0,
      memory_percent: 60.0,
      memory_used_bytes: 6000000000,
      memory_total_bytes: 10000000000,
      disk_percent: 75.0,
      disk_used_bytes: 75000000000,
      disk_total_bytes: 100000000000,
      load_avg: [1.2, 0.9, 0.8],
      uptime_seconds: 3600
    },
    containers: {
      total: 3,
      running: 2,
      exited: 1,
      restarting: 0,
      unhealthy: 0,
      paused: 0
    },
    top_cpu: [
      { id: '1', name: 'app-web', image: 'node:18', cpu_percent: 15.0, memory_bytes: 200000000, memory_percent: 2.0, status: 'running' }
    ],
    top_memory: [
      { id: '2', name: 'app-db', image: 'postgres:16', cpu_percent: 5.0, memory_bytes: 500000000, memory_percent: 5.0, status: 'running' }
    ],
    recent_events: [],
    active_alerts_count: 1,
    docker_connected: true,
    timestamp: new Date().toISOString()
  };

  beforeEach(() => {
    overviewServiceSpy = {
      getOverview: jest.fn().mockReturnValue(of(mockData)),
      getOverviewStream: jest.fn().mockReturnValue(of(mockData))
    } as unknown as jest.Mocked<OverviewService>;

    TestBed.configureTestingModule({
      providers: [
        DashboardStore,
        { provide: OverviewService, useValue: overviewServiceSpy }
      ]
    });

    store = TestBed.inject(DashboardStore);
  });

  afterEach(() => {
    store.destroy();
  });

  it('should initialize and load data from stream', () => {
    store.init();
    expect(store.isLoading()).toBe(false);
    expect(store.data()?.host.cpu_percent).toBe(25.0);
    expect(store.hasContainers()).toBe(true);
    expect(store.isStale()).toBe(false);
  });

  it('should build donut chart dataset for container states', () => {
    store.init();
    const chart = store.containerStateChartData();
    expect(chart.labels).toContain('Running');
    expect(chart.labels).toContain('Exited');
    expect(chart.datasets[0].data).toEqual([2, 1, 0, 0, 0]);
  });

  it('should flag data as stale when watchdog timer detects missed heartbeats', fakeAsync(() => {
    store.init();
    expect(store.isStale()).toBe(false);

    // Advance time past stale threshold (default 6 seconds)
    tick(7000);
    expect(store.isStale()).toBe(true);
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern=dashboard.store.spec.ts`
Expected: FAIL with `Cannot find module './dashboard.store'`

- [ ] **Step 3: Implement DashboardStore**

Create `frontend/src/app/features/dashboard/dashboard.store.ts`:
- Define signals: `data = signal<OverviewResponse | null>(null)`, `isLoading = signal(true)`, `isStale = signal(false)`, `error = signal<string | null>(null)`, `lastReceivedAt = signal(0)`.
- Define computed signals:
  - `hasContainers = computed(() => (this.data()?.containers.total ?? 0) > 0)`
  - `containerStateChartData = computed(...)`: Doughnut chart data structure for Chart.js matching running, exited, restarting, unhealthy, paused counts and colors.
  - `topCpuChartData = computed(...)`: Horizontal bar chart data for top CPU containers.
  - `topMemoryChartData = computed(...)`: Horizontal bar chart data for top RAM containers.
- Methods:
  - `init()`: Fetches initial HTTP snapshot via `overviewService.getOverview()`, subscribes to `overviewService.getOverviewStream()`, starts watchdog timer checking every 1000ms.
  - `destroy()`: Unsubscribes stream and clears interval timers.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern=dashboard.store.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add frontend/src/app/features/dashboard/dashboard.store*
git commit -m "feat(frontend): create signal-based dashboard store with chart datasets and stale watchdog"
```

---

### Task 6: Frontend `/dashboard` Component, Widgets & Routes

**Files:**
- Create: `frontend/src/app/features/dashboard/dashboard.component.ts`
- Create: `frontend/src/app/features/dashboard/dashboard.component.html`
- Create: `frontend/src/app/features/dashboard/dashboard.component.scss`
- Create: `frontend/src/app/features/dashboard/dashboard.component.spec.ts`
- Modify: `frontend/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `DashboardStore`, `BaseChartDirective`, Angular Material components (`MatCardModule`, `MatProgressBarModule`, `MatIconModule`, `MatButtonModule`, `MatChipsModule`, `MatTabsModule`, `MatTooltipModule`)
- Produces: Standalone `/dashboard` route with live overview widgets, empty state, and alert indicators.

- [ ] **Step 1: Write unit test for DashboardComponent**

Create `frontend/src/app/features/dashboard/dashboard.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import { DashboardComponent } from './dashboard.component';
import { DashboardStore } from './dashboard.store';
import { OverviewResponse } from '../../core/models/overview.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let storeMock: Partial<DashboardStore>;

  const mockOverview: OverviewResponse = {
    host: {
      cpu_percent: 20.0,
      memory_percent: 40.0,
      memory_used_bytes: 4000000000,
      memory_total_bytes: 10000000000,
      disk_percent: 50.0,
      disk_used_bytes: 50000000000,
      disk_total_bytes: 100000000000,
      load_avg: [0.5, 0.4, 0.3],
      uptime_seconds: 7200
    },
    containers: { total: 2, running: 2, exited: 0, restarting: 0, unhealthy: 0, paused: 0 },
    top_cpu: [],
    top_memory: [],
    recent_events: [],
    active_alerts_count: 0,
    docker_connected: true,
    timestamp: '2026-11-19T10:00:00Z'
  };

  beforeEach(async () => {
    storeMock = {
      data: signal(mockOverview),
      isLoading: signal(false),
      isStale: signal(false),
      error: signal(null),
      hasContainers: signal(true),
      containerStateChartData: signal({ labels: ['Running'], datasets: [{ data: [2] }] } as any),
      topCpuChartData: signal({ labels: [], datasets: [] } as any),
      topMemoryChartData: signal({ labels: [], datasets: [] } as any),
      init: jest.fn(),
      destroy: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: DashboardStore, useValue: storeMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render host gauge cards with metrics', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('20.0%');
    expect(el.textContent).toContain('40.0%');
  });

  it('should show stale warning banner when store isStale is true', () => {
    (storeMock.isStale as any).set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Live updates paused');
  });

  it('should show empty container message when hasContainers is false', () => {
    (storeMock.hasContainers as any).set(false);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('No containers running');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --testPathPattern=dashboard.component.spec.ts`
Expected: FAIL with `Cannot find module './dashboard.component'`

- [ ] **Step 3: Implement DashboardComponent, template, styles, and route**

1. Create `frontend/src/app/features/dashboard/dashboard.component.ts`:
   - Standalone component importing `CommonModule`, `BaseChartDirective`, Angular Material components.
   - Inject `DashboardStore`, call `store.init()` on `ngOnInit()` and `store.destroy()` on `ngOnDestroy()`.
   - Provide helper methods for formatting bytes to GiB/MiB, and formatting uptime seconds to `Xd Xh Xm`.
2. Create `frontend/src/app/features/dashboard/dashboard.component.html`:
   - Top banner area: Active alerts alert badge + Stale stream reconnection toast.
   - Row 1: 4 Host cards (CPU, RAM, Disk, Uptime) with Material progress bars and load average indicators.
   - Row 2: Left column for Container Status donut chart with center total count; Right column for Top Consumers (CPU and RAM tabs).
   - Row 3: Recent Docker events activity feed table.
   - Empty state view when `!store.hasContainers()`.
3. Create `frontend/src/app/features/dashboard/dashboard.component.scss`:
   - Responsive grid layout (`grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`).
   - Use CSS custom properties (`--dp-surface`, `--dp-primary`, `--dp-border`, `--dp-status-running`, `--dp-status-warning`, etc.).
4. Update `frontend/src/app/app.routes.ts`:
   - Replace `PlaceholderComponent` for `path: 'dashboard'` with lazy-loaded `DashboardComponent`:
   ```typescript
   {
     path: 'dashboard',
     loadComponent: () =>
       import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
     data: { title: 'Dashboard' },
   }
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npm test -- --testPathPattern=dashboard.component.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit changes**

```bash
git add frontend/src/app/features/dashboard/ frontend/src/app/app.routes.ts
git commit -m "feat(frontend): implement dashboard component, responsive widgets, and route"
```

---

### Task 7: Full Stack Verification, Documentation & Progress Update

**Files:**
- Modify: `README.md`
- Modify: `docs/progress.md`

**Interfaces:**
- Consumes: Test suites across backend and frontend
- Produces: Updated documentation, README section for Overview Dashboard, and progress ledger entry.

- [ ] **Step 1: Run full backend test suite**

Run: `python -m pytest backend/tests -v`
Expected: ALL TESTS PASS (35+ tests)

- [ ] **Step 2: Run full frontend test suite and build**

Run: `cd frontend && npm test && npm run build`
Expected: ALL TESTS PASS (38+ tests), production build completes with 0 errors.

- [ ] **Step 3: Update README.md and docs/progress.md**

1. Add "Prompt 02: Overview Dashboard" section to `README.md` explaining:
   - System and Docker metrics collected via `psutil` and `DockerGateway`.
   - REST `GET /api/v1/overview` and SSE stream `GET /api/v1/overview/stream`.
   - UI widgets: host gauges, container status donut, top consumers, events feed, stale-data watchdog.
2. Update `docs/progress.md` logging Prompt 02 completion.

- [ ] **Step 4: Commit changes**

```bash
git add README.md docs/progress.md
git commit -m "docs: complete prompt 02 overview dashboard documentation and progress entry"
```
