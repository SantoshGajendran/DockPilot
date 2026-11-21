# Design Specification: Prompt 05 — Logs Explorer

## 1. Objectives & Scope
Provide high-performance, real-time searchable log exploration across single or multiple containers:
- Streaming logs with SSE (`tail`, `since`, `until`, `timestamps`, `follow`).
- Multiplexed (8-byte header) and raw TTY log stream demultiplexing.
- Multi-container search API with configurable hard memory cap (`log_search_max_bytes_scanned`).
- Backpressure mitigation: bounded line buffer yielding a `[LINES SKIPPED: N]` indicator.
- Reusable `LogViewerComponent` using `@angular/cdk/scrolling` (Virtual Scroll), ANSI color code parsing, wrap toggle, timestamp toggle, auto-scroll with pause-on-manual-scroll, download, and copy.
- Standalone `/logs` explorer route with multi-container selection, regex/text filters, and time window filters.
- Reusable integration into `/containers/:id?tab=logs`.

---

## 2. Architecture & Data Flow

```
[ Angular /logs or /containers/:id?tab=logs ]
   │
   ├── SSE  GET /api/v1/containers/{id}/logs?follow=true&tail=...
   └── REST GET /api/v1/logs/search?container_ids=c1,c2&q=...&limit=...
              │
       [ FastAPI Logs Endpoints ]
              │
       [ LogsService: Demuxer, Backpressure Bounded Queue, Search Filter ]
              │
       [ DockerGateway: FakeGateway / EngineGateway ]
```

---

## 3. Backend Specifications

### 3.1 Configuration (`config/app.yaml` & `config.py`)
- `log_tail_default: 200`
- `log_search_max_bytes_scanned: 10485760` (10 MB hard cap)
- `log_stream_buffer_max_lines: 1000`
- `log_backpressure_drop_threshold: 500`

### 3.2 Schemas (`backend/app/schemas/logs.py`)
- `LogEntry`:
  - `container_id: str`
  - `container_name: str`
  - `stream: str` (`stdout` | `stderr` | `system`)
  - `timestamp: Optional[str]`
  - `message: str`
  - `level: Optional[str]` (`INFO` | `WARN` | `ERROR` | `DEBUG`)
- `LogSearchRequest` / Query Params:
  - `container_ids: List[str]`
  - `q: Optional[str]`
  - `regex: bool = False`
  - `since: Optional[int]`
  - `until: Optional[int]`
  - `tail: int = 500`
- `LogSearchResponse`:
  - `lines: List[LogEntry]`
  - `total: int`
  - `bytes_scanned: int`
  - `capped: bool`

### 3.3 Gateway & Demuxing (`backend/app/docker/`)
- Demuxing utility `demux_stream_data(raw: bytes, is_tty: bool)`:
  - If `is_tty`: split on `\n`, treat stream as `stdout`.
  - If not `is_tty`: parse Docker 8-byte frames:
    - Byte 0: `1` -> `stdout`, `2` -> `stderr`, `0` -> `stdin`.
    - Bytes 4-7: `struct.unpack('>I', header[4:8])[0]` payload length.
    - If framing absent or corrupted, gracefully fallback to raw text splitting.
- Gateway methods:
  - `get_container_logs(container_id, tail, since, until, timestamps)`
  - `stream_container_logs(container_id, tail, since, timestamps)`

### 3.4 Service Layer (`backend/app/services/logs_service.py`)
- `stream_logs_sse(container_id, gateway, tail, since, timestamps, once=False)`:
  - Bounded deque buffer (`maxlen=log_stream_buffer_max_lines`).
  - Track skipped lines if incoming line generation outpaces SSE delivery; yields `{"stream": "system", "message": "[--- BUFFER FULL: 50 LINES SKIPPED ---]"}`.
- `search_logs(container_ids, q, is_regex, since, until, tail, gateway)`:
  - Iterates over containers, scanning up to `log_search_max_bytes_scanned`.
  - Filters lines by substring or compiled regex.
  - Detects standard log levels (`ERROR`, `WARN`, `INFO`, `DEBUG`).

---

## 4. Frontend Specifications

### 4.1 Reusable `LogViewerComponent` (`dp-log-viewer`)
- Virtual scrolling using `cdk-virtual-scroll-viewport` (`itemSize="24"`).
- ANSI color renderer: parses ANSI SGR codes (`\x1b[31m`, etc.) into HTML classes (`ansi-red`, `ansi-green`, `ansi-yellow`, `ansi-bold`, etc.).
- Controls toolbar:
  - **Auto-scroll toggle** (automatically scrolls to bottom on new lines; pauses when user scrolls up).
  - **Wrap lines toggle**.
  - **Timestamps toggle** (show/hide leading timestamp).
  - **Search filter input** (in-memory instant line filter).
  - **Copy selection** / **Download logs** as `.log` file.
  - **Clear** button.

### 4.2 Logs Explorer Route (`/logs`)
- Multi-container selector (select all, search container by name/project).
- Search parameters bar: text / regex search input, time window selector (`15m`, `1h`, `6h`, `24h`), stream filter (`all`, `stdout`, `stderr`).
- Connects to SSE streaming when single container selected with follow enabled, or executes `search_logs` on multi-container filter change.

### 4.3 Container Detail Integration
- Embed `dp-log-viewer` inside `ContainerDetailComponent` **Logs** tab with `[containerId]="detail.id"`.

---

## 5. Verification Plan
- **Backend (`pytest`)**:
  - Demuxing tests for 8-byte Docker frame header and TTY raw streams.
  - Backpressure test verifying line skip marker emission under buffer saturation.
  - Regex and plain text search filtering with hard byte scan limit enforcement.
  - API endpoint authentication and role verification (`viewer`+).
- **Frontend (`Jest`)**:
  - `AnsiParserService` unit tests for 16-color ANSI codes and resets.
  - `LogViewerComponent` virtual scroll and toolbar toggle tests.
  - `LogsExplorerComponent` multi-container selection and filter binding tests.
  - Production `ng build` validation with 0 errors and 0 warnings.
