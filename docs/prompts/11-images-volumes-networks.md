# Master Prompt 11: Images, Volumes, Networks

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** housekeeping for Docker resources.

**Backend**

- `GET /images`, `GET /volumes`, `GET /networks`, each with usage and "in use by" lists.
- Actions: pull image (as a job), remove, prune dangling images, prune unused volumes and networks. A prune first returns a dry-run preview with the space it would free, then needs a confirmation token.

**Frontend**

- `/resources` route with three tabs. Tables with size, age, tags and used-by chips; unused items are highlighted.
- A prune wizard: preview, confirm, result summary.
- Pull dialog with a live progress stream.

**Tests:** in-use detection, prune preview matches the actual result, a protected resource list (from config) can never be removed.
