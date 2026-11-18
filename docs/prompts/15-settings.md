# Master Prompt 15: Settings

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** tune the app without redeploying.

**Backend**

- `GET/PUT /settings` for runtime-editable values: collection interval, retention days, default log tail, secret-masking patterns, alert defaults, feature flags. Validation and an audit entry on every change.
- A retention job that downsamples old metrics and deletes expired rows; `POST /settings/retention/run` to trigger it manually.

**Frontend**

- `/settings` route: grouped forms, per-field help text, a "restart required" marker where relevant, unsaved-changes guard, and a storage usage panel (database size, row counts).

**Tests:** validation bounds, flag toggles take effect without restart, retention keeps the rollups and deletes raw rows past the limit.
