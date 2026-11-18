# Master Prompt 8: Events Timeline

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** see what changed and when.

**Backend**

- A background listener on the Docker events stream persists container events (start, stop, die, oom, health_status, restart, kill) with exit codes.
- `GET /events` with filters and cursor pagination; `GET /events/stream` (SSE).
- Derived flags: restart loop detected, OOM kill, unexpected exit.

**Frontend**

- `/events` route: vertical timeline grouped by day, icon and colour per event type, filters by container, type and time, and a link to each container.
- A compact version of the same component is reused on the dashboard and the container detail Events tab.

**Tests:** event persistence and de-duplication, restart-loop detection window from config, pagination, listener reconnects after the stream drops.
