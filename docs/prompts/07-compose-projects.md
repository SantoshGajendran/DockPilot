# Master Prompt 7: Compose Projects

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** operate groups of containers as one unit.

**Backend**

- `GET /compose/projects`: group containers by the `com.docker.compose.project` label, with aggregate state.
- `POST /compose/projects/{name}/{up|down|restart|pull|stop|start}` executed through a controlled subprocess wrapper with an allow-list of project directories from config.
- Long operations return a job id; `GET /jobs/{id}` and `GET /jobs/{id}/stream` give live output.

**Frontend**

- `/projects` route: project cards with service counts and state, expandable service list.
- Action buttons open a dialog showing the live job output with a progress state and a final result.
- Show the project's compose file path (read-only) and its last action from the audit log.

**Tests:** allow-list rejects unknown paths; job lifecycle; command arguments are never built from raw user strings; failed job surfaces stderr.
