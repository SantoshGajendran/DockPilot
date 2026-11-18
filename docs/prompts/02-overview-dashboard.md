# Master Prompt 2: Overview Dashboard

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** one-glance health of the server and every container.

**Backend**

- `GET /overview` returns: host summary (CPU, RAM, disk, load, uptime), container counts by state (running, exited, restarting, unhealthy, paused), top N containers by CPU and by memory, last N events, active alert count.
- `GET /overview/stream` (SSE) pushes the same payload at the configured interval.

**Frontend**

- `/dashboard` route with signal-based store.
- Components: host gauge cards, container state donut, top-consumers bar charts, recent events feed, active alerts banner, stale-data indicator when the stream drops.
- Cards link to the relevant detail pages.

**Tests:** payload shape from `FakeGateway`; store updates on SSE message; stale indicator appears after missed heartbeats; empty-server state renders.
