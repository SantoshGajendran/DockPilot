# DockPilot

Standalone app to monitor and control Docker containers on an Ubuntu server.

## Stack
- Frontend: Angular 19, standalone components, signals, RxJS, Angular Material, Chart.js via ng2-charts, xterm.js, Jest, Playwright
- Backend: Python 3.12, FastAPI, docker SDK, psutil, SQLAlchemy 2, Alembic, APScheduler, pytest
- DB: PostgreSQL. Realtime: SSE for stats and logs, WebSocket for the terminal
- Packaging: Docker Compose with a docker-socket-proxy in front of docker.sock

## Global rules
1. No hardcoded domain terms: thresholds, intervals, container names, labels, roles, colours and route titles come from config/*.yaml, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface and tests use the fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Enforce roles viewer, operator and admin in the backend first, then mirror them in the UI.
6. Never expose the backend publicly. Default bind is 127.0.0.1.
7. Work on ONE prompt from docs/prompts at a time. Finish with tests passing, a README section and an entry in docs/progress.md, then stop.

## Commands
- Backend tests: cd backend && pytest -q
- Frontend tests: cd frontend && npm test && ng build
- Full stack: docker compose up --build
