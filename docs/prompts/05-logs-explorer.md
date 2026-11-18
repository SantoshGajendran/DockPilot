# Master Prompt 5: Logs Explorer

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** fast, searchable log viewing for one or many containers.

**Backend**

- `GET /containers/{id}/logs` with `tail`, `since`, `until`, `timestamps` and `follow` (SSE). Handle both multiplexed and TTY streams.
- `GET /logs/search`: multi-container search over a time window, with a hard cap on bytes scanned (from config).
- Backpressure: drop or sample with a visible "lines skipped" marker rather than exhausting memory.

**Frontend**

- Reusable `LogViewer` component with virtual scrolling (CDK), ANSI colour rendering, wrap toggle, timestamp toggle, auto-scroll that pauses on manual scroll, pause and resume.
- `/logs` route: choose one or more containers, free-text and regex filter, level highlighting, time range, download as a file, copy selection.
- The same `LogViewer` is embedded in the container detail Logs tab.

**Tests:** stream demultiplexing, backpressure marker, regex filter, virtual scroll renders 100k lines without lag, ANSI parsing.
