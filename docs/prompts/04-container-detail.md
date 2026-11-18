# Master Prompt 4: Container Detail

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** everything about one container on a single tabbed page.

**Backend**

- `GET /containers/{id}`: inspect summary (image, command, env with secret masking, mounts, networks, ports, limits, health check, restart policy).
- `GET /containers/{id}/stats` (SSE, live) and `GET /containers/{id}/metrics?range=` (history from the database).
- Env values matching configurable secret patterns are masked; only admins can reveal them, and each reveal is audited.

**Frontend**

- `/containers/:id` with tabs: **Overview**, **Metrics**, **Logs**, **Config**, **Events**.
- Overview: state header with action buttons, key facts, live gauges.
- Metrics: CPU, memory (with limit line), network and block I/O charts, range picker (live, 1h, 6h, 24h, 7d), hover tooltips.
- Config: environment table with masked values and a reveal button for admins, mounts, networks, labels.
- Deep-linkable tab via query parameter.

**Tests:** secret masking, reveal audit, CPU percentage calculation from stats deltas, range query downsampling, tab routing.
