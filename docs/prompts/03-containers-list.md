# Master Prompt 3: Containers List

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** find, filter and act on any container quickly.

**Backend**

- `GET /containers` with `state`, `health`, `compose_project`, `label`, `q`, `sort`, `page` and `page_size` parameters.
- `GET /containers/stream` (SSE): live CPU, memory and state per container, in one multiplexed stream.
- `POST /containers/{id}/{start|stop|restart|pause|unpause|kill}` (operator and above); `DELETE /containers/{id}` (admin, requires a confirmation token from `POST /containers/{id}/delete-token`).
- `POST /containers/bulk` for multi-select actions, with a per-container result.

**Frontend**

- `/containers` route with a Material table: sortable columns, state and health chips, CPU and memory mini-bars, ports, image, uptime, restart count.
- Filter bar (state, project, text), saved filter presets in local storage, multi-select with a bulk action bar.
- Row actions menu with confirmation dialogs. Destructive actions need the user to type the container name.
- Optimistic state change with rollback on failure.

**Tests:** filtering and sorting, permission denial for viewers, bulk partial failure, delete-token expiry, confirmation dialog flow.
