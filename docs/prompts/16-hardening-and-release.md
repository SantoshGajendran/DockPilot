# Master Prompt 16: Hardening and Release

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** make it safe to leave running.

- Run the backend as a non-root user. Mount the socket only into the socket proxy, allowing just the endpoints in use.
- Add security headers, strict CORS, request size limits, structured JSON logging and a Prometheus `/metrics` endpoint for the app itself.
- Add dependency and image scanning (pip-audit, npm audit, Trivy) to CI.
- Write Playwright end-to-end suites: login, view dashboard, restart a container, view logs, create an alert rule, and a viewer being denied an action.
- Provide backup and restore scripts for the database and a one-page runbook. Tag version 1.0.

## Testing Matrix

| Layer | Tooling | What it covers |
| --- | --- | --- |
| Backend unit | pytest + `FakeGateway` | services, collectors, rule evaluator |
| Backend API | pytest + httpx + test database | routers, permissions, audit |
| Frontend unit | Jest | services, stores, components |
| End to end | Playwright against a compose stack with disposable test containers | full user flows |
| Manual | a test server with a deliberately crashing container, a memory hog and a noisy logger | alerts, logs, events |
