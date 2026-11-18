# Master Prompt 13: Audit Log

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** a trustworthy record of who did what.

**Backend**

- `GET /audit` with filters (user, action, target, result, time range) and cursor pagination; `GET /audit/export` as CSV. Admin only.
- Records are append-only at the application level; no update or delete endpoints exist.

**Frontend**

- `/audit` route: filterable table, a detail drawer with the request metadata, CSV export, and a relative or absolute time toggle.

**Tests:** every control endpoint produces an audit entry (parameterised across all routes); the failure path is recorded; export honours filters.
