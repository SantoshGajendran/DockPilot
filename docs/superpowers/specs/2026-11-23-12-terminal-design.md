# Design Specification: Prompt 12 — Web Terminal

**Date:** 2026-11-23  
**Status:** Approved  
**Author:** DockPilot Team  

---

## 1. Objective

Provide a secure, administrative interactive terminal shell inside Docker containers over WebSocket:
1. Admin-only access with strict authentication and RBAC enforcement.
2. Controlled by feature flag `terminal_enabled` (disabled by default; returns 404 when disabled).
3. Session safety limits: idle timeout, maximum session duration, and concurrent session limit.
4. Bidirectional terminal streaming with ANSI TTY rendering and window resize forwarding (`resize` message).
5. Comprehensive audit logging on session start and end, with optional session transcript recording and retention.
6. Frontend Angular Terminal tab on Container Detail page powered by `@xterm/xterm` and `@xterm/addon-fit`, shell selector (`/bin/sh`, `/bin/bash`), active recording banner, and clear disconnect states.

---

## 2. Configuration & Settings

Config file: `config/terminal.yaml` (loaded into `Settings` in `backend/app/core/config.py`):
```yaml
terminal_enabled: false
terminal_idle_timeout_seconds: 300
terminal_max_session_seconds: 3600
terminal_max_concurrent_sessions: 5
terminal_record_sessions: true
terminal_transcript_retention_days: 30
terminal_default_shell: "/bin/sh"
terminal_allowed_shells:
  - "/bin/sh"
  - "/bin/bash"
  - "sh"
  - "bash"
```

---

## 3. Data Models & Alembic Migration

Table: `terminal_sessions` (Alembic migration `0007_terminal_sessions.py`):
```python
class TerminalSession(Base):
    __tablename__ = "terminal_sessions"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    container_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    container_name: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(PG_UUID(as_uuid=True), nullable=True)
    username: Mapped[str] = mapped_column(String(64), nullable=False)
    shell: Mapped[str] = mapped_column(String(64), default="/bin/sh", nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", nullable=False) # 'active', 'closed', 'timeout', 'killed'
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bytes_sent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bytes_received: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
```

---

## 4. DockerGateway Interface Extensions

Interface methods in `DockerGateway`:
- `create_exec(container_id: str, cmd: List[str], tty: bool = True, stdin: bool = True) -> str`:
  Returns `exec_id`.
- `start_exec(exec_id: str, tty: bool = True) -> Any`:
  Starts exec and provides bidirectional streaming/socket interface.
- `resize_exec(exec_id: str, height: int, width: int) -> None`:
  Resizes TTY window for the exec process.

Implementations:
- `EngineGateway`: wraps `client.api.exec_create`, `client.api.exec_start(socket=True, tty=True)`, `client.api.exec_resize`.
- `FakeGateway`: mock interactive terminal simulator processing input commands (`ls`, `pwd`, `echo`, `cat`, `exit`) and returning formatted output lines.

---

## 5. WebSocket Protocol & Session Service

WebSocket endpoint:
`WS /api/v1/containers/{id}/exec?token=<jwt_access_token>&shell=/bin/sh`

1. Connection Lifecycle:
   - Feature flag check: If `terminal_enabled == false`: close with status `4404` / HTTP 404.
   - Authentication & RBAC: Token validated via `jwt_secret`; user must have `admin` role. If unauthorized or non-admin: close with status `4403` / HTTP 403.
   - Container check: Container must exist and be in `running` state. If not: close with `4400`.
   - Concurrency limit: If current active sessions `>= terminal_max_concurrent_sessions`: close with `4429`.
2. Message Protocol:
   - Text message with JSON: `{"type": "resize", "cols": 120, "rows": 30}` -> forwards resize to exec instance.
   - Raw Text/Binary: stdin characters sent to terminal.
3. Idle and Session Timers:
   - `idle_timeout`: timer reset on each user input. If no input for `terminal_idle_timeout_seconds`, send disconnect notice and close with `4000`.
   - `max_session`: timer checked every tick. If total duration > `terminal_max_session_seconds`, close with `4001`.
4. Audit Logging & Transcript:
   - AuditLog on session start (`action='terminal_session_start'`).
   - Transcript buffer capturing stdin/stdout stream.
   - AuditLog on session end (`action='terminal_session_end'`).

---

## 6. Frontend Container Detail Terminal Tab

1. Route: `/containers/:id?tab=terminal`
2. Component: `ContainerTerminalComponent` (embedded inside `ContainerDetailComponent` Terminal tab).
3. Features:
   - Header bar with:
     - Shell selector: `/bin/sh` vs `/bin/bash`.
     - Recording Indicator: Pulsing red dot with `[REC] Session is being recorded`.
     - Connection status pill: `Connected`, `Connecting`, `Disconnected`.
     - Reconnect button.
   - Terminal window: `xterm.js` with `@xterm/addon-fit` configured with Dark theme matching DockPilot aesthetic.
   - Window resize listener sending `{"type": "resize", "cols": ..., "rows": ...}` over WebSocket.
4. RBAC: If user is not admin, displays clean callout stating that terminal access is restricted to Administrators.
