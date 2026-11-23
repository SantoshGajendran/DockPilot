# Implementation Plan: Master Prompt 16 - Hardening and Release

## Phase 1: Docker & Socket Proxy Hardening
- [ ] Review and harden `backend/Dockerfile` and `frontend/Dockerfile` for non-root execution and minimal attack surface.
- [ ] Update `docker-compose.yml`:
  - Explicitly disable unused endpoints in `docker-socket-proxy`.
  - Add `security_opt: [no-new-privileges:true]`.
  - Ensure strict internal network isolation.

## Phase 2: Security Middleware & Prometheus Metrics
- [ ] Create `backend/app/core/security_headers.py` (Security headers, request body size limiter, and CORS hardening).
- [ ] Create `backend/app/core/logging_config.py` (Structured JSON logger for production).
- [ ] Create `backend/app/core/metrics.py` (Zero-dependency Prometheus metrics collector & formatter).
- [ ] Create `GET /metrics` route in `backend/app/api/v1/metrics.py` and mount in router/main.
- [ ] Integrate security headers and metrics recording middlewares in `backend/app/main.py`.

## Phase 3: CI/CD & Security Scanning Workflows
- [ ] Create `.github/workflows/ci.yml`:
  - Backend pytest suite with coverage.
  - Frontend Jest suite and production build verification.
  - Dependency vulnerability scan (`pip-audit`).
  - Frontend security scan (`npm audit --audit-level=high`).
  - Container image vulnerability scanning (`aquasecurity/trivy-action`).

## Phase 4: Playwright End-to-End Test Suite
- [ ] Install `@playwright/test` in `frontend` or root.
- [ ] Create `playwright.config.ts`.
- [ ] Create E2E test specs in `e2e/`:
  - `01-login.spec.ts`: Valid login flow and redirect.
  - `02-dashboard.spec.ts`: Overview statistics and host charts.
  - `03-containers.spec.ts`: Container control and restart action.
  - `04-logs.spec.ts`: Log viewing and level filtering.
  - `05-alerts.spec.ts`: Alert rule creation and listing.
  - `06-rbac.spec.ts`: Viewer role access check and control action rejection.

## Phase 5: Operations, Backup/Restore Scripts & Runbook
- [ ] Create `scripts/backup.sh` and `scripts/backup.ps1` for PostgreSQL database backups.
- [ ] Create `scripts/restore.sh` and `scripts/restore.ps1` for PostgreSQL database restores.
- [ ] Create `docs/runbook.md` (One-page operations runbook covering daily operations, health checks, backup/restore, emergency admin reset, and secret rotation).

## Phase 6: Release 1.0.0 & Verification
- [ ] Bump versions to `1.0.0` in `package.json`, `frontend/package.json`, and backend configuration.
- [ ] Run full backend test suite (`pytest -q`).
- [ ] Run full frontend test suite (`npm test`).
- [ ] Run frontend production build (`ng build`).
- [ ] Update `README.md` and `docs/progress.md`.
- [ ] Update codebase knowledge graph (`graphify update .`).
- [ ] Git commit and push to `origin/master`.
