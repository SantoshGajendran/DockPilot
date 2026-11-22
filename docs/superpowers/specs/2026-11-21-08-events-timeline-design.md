# Design Specification: Prompt 08 — Events Timeline

## 1. Objectives & Scope
Provide a comprehensive real-time and historical timeline of Docker container events with derived failure flags (restart loop, OOM kill, unexpected exit), full-featured filtering, cursor pagination, and SSE streaming.

### Key Capabilities
1. **Background Event Listener**:
   - Asynchronous daemon connected to Docker event stream.
   - Robust reconnection with exponential backoff / reconnect interval when stream drops or daemon restarts.
   - Deduplication using unique event keys (`(event_id, timeNano)`).
   - Event normalization into database records (`container_events`).
2. **Derived Incident Flags**:
   - `is_oom`: Detects OOM killer events (`action == 'oom'` or attribute `oom=True`).
   - `is_unexpected_exit`: Detects container terminations (`action == 'die'`) with non-zero exit codes (excluding clean stops or explicit kills if applicable).
   - `is_restart_loop`: Identifies flapping/restarting containers exceeding `restart_loop_threshold` (e.g., 3) failures within `restart_loop_window_seconds` (e.g., 300s).
3. **API Endpoints**:
   - `GET /api/v1/events`: Filter by `container_id`, `container_name`, `action`, `since`, `until`, `incident_only` (OOM/loop/crash), with cursor-based pagination.
   - `GET /api/v1/events/stream`: Real-time SSE streaming to active clients with dual-token auth (header or query parameter).
4. **Frontend Interface**:
   - Standalone `/events` page (`EventsComponent`):
     - Vertical timeline grouped by day (e.g., "Today", "Yesterday", "Nov 20, 2026").
     - Color-coded badges and icons per event action type.
     - Highlighted incident chips (Restart Loop, OOM, Exit Code).
     - Filter controls (container picker, event type filter, date range, incidents toggle).
     - Direct links to container detail page (`/containers/:id`).
   - Reusable Compact Timeline (`CompactEventsTimelineComponent`):
     - Embedded in Overview Dashboard (`/dashboard`) replacing basic event list.
     - Embedded in Container Detail (`/containers/:id?tab=events`).

---

## 2. Configuration & Constants

### `config/app.yaml` & `backend/app/core/config.py`
```yaml
events_retention_days: 30
events_reconnect_interval_seconds: 3
restart_loop_window_seconds: 300
restart_loop_threshold: 3
events_page_size_default: 50
events_page_size_max: 200
```

### Typed Constants: `frontend/src/app/core/constants/events.constants.ts`
- Event action types, display labels, Material icons, and CSS color classes.
- Incident badges and filter presets.

---

## 3. Database Schema: `container_events`

```python
class ContainerEventRecord(Base):
    __tablename__ = "container_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    container_id: Mapped[str] = mapped_column(String(64), index=True)
    container_name: Mapped[str] = mapped_column(String(128), index=True)
    image: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_oom: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_unexpected_exit: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    is_restart_loop: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Alembic Migration: `0004_container_events.py`.

---

## 4. Architecture & Data Flow

```
Docker Daemon / Proxy
       │ (stream_events)
       ▼
EventListenerService (background task in FastAPI lifespan)
       │
       ├─► Deduplication check (event_id in DB / cache)
       ├─► Extract exit_code, is_oom, is_unexpected_exit
       ├─► Check restart loop sliding window (DB query / cache)
       ├─► Persist to container_events table
       └─► Broadcast EventItem to SSE Subscribers
             │
             ▼
   Clients on GET /events/stream (SSE)
```

---

## 5. Security & RBAC
- Viewer, Operator, Admin can read events (`GET /api/v1/events`, `GET /api/v1/events/stream`).
- Authentication via Bearer token or SSE query param `?token=...`.
- Sensitive environment variables or secrets are excluded from event attributes.
