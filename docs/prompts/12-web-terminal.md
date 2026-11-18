# Master Prompt 12: Web Terminal

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** a safe shell inside a container (admin only, off by default).

**Backend**

- WebSocket `/containers/{id}/exec` creating an exec instance with a TTY. Supports resize messages. Disabled unless `features.terminal.enabled` is true in config.
- Session limits: idle timeout, max session length, max concurrent sessions. Audit the session start and end; optionally record the session transcript, with retention from config.

**Frontend**

- A **Terminal** tab on container detail using xterm.js with the fit addon. Shell selector (sh or bash), reconnect handling, a visible banner when the session is being recorded, and a clear disconnect state.

**Tests:** feature flag off returns 404; non-admin returns 403; idle timeout closes the socket; resize messages are forwarded.
