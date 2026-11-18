# Master Prompt 6: Host / Server Page

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** the health of the Ubuntu machine itself.

**Backend**

- `GET /host/info`: OS, kernel, hostname, CPU model and cores, total RAM, Docker version and storage driver.
- `GET /host/metrics` (live) and `GET /host/metrics/history?range=`.
- Collectors: CPU per core, RAM and swap, disk per mount (with inode usage), disk I/O, network per interface, load average, temperatures when available, top processes.
- `GET /host/docker-usage`: disk used by images, containers, volumes and build cache.

**Frontend**

- `/host` route: info header, per-core CPU heatmap, memory and swap charts, disk usage bars per mount with threshold colouring, network throughput chart, top processes table, Docker disk usage breakdown.

**Tests:** collector output against mocked `psutil`; threshold colouring from config; history downsampling.
