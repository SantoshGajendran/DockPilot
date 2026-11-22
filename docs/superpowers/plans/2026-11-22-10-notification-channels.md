# Implementation Plan: Prompt 10 — Notification Channels

**Goal:** Implement notification channel subsystem supporting Email, Telegram, Webhook, and Slack with encrypted secrets at rest, routing matrix, retry with backoff, delivery logging, test endpoint, and frontend UI at `/alerts/channels`.

---

## Phase 1: Encryption, Models & Alembic Migration
- [x] Task 1.1: Add `notification_encryption_key` & settings to `config/app.yaml` and `backend/app/core/config.py`.
- [x] Task 1.2: Implement `backend/app/core/encryption.py` (`encrypt_secret`, `decrypt_secret`) using Fernet.
- [x] Task 1.3: Create models in `backend/app/models/notification.py`: `NotificationChannel`, `NotificationRoute`, `NotificationDeliveryLog`. Register in `backend/app/models/__init__.py`.
- [x] Task 1.4: Create Alembic migration `0006_notifications.py` for tables `notification_channels`, `notification_routes`, `notification_delivery_logs`.

## Phase 2: Schemas & Transports with Retry
- [x] Task 2.1: Define Pydantic schemas in `backend/app/schemas/notification.py`:
  - `NotificationChannelCreate`, `NotificationChannelUpdate`, `NotificationChannelResponse`.
  - `NotificationRouteCreate`, `NotificationRouteUpdate`, `NotificationRouteResponse`.
  - `NotificationDeliveryLogResponse`, `DeliveryLogListResponse`.
  - `NotificationTestResult`.
- [x] Task 2.2: Implement notifier transports in `backend/app/services/notifiers/`:
  - `BaseNotifier` interface.
  - `EmailNotifier` (SMTP with TLS/SSL).
  - `TelegramNotifier` (Telegram Bot API via `httpx`).
  - `WebhookNotifier` (Generic HTTP POST via `httpx`).
  - `SlackNotifier` (Slack incoming webhook via `httpx`).
- [x] Task 2.3: Implement `NotificationDispatcher` with exponential backoff retry loop.

## Phase 3: Notification Service & Evaluator Hook
- [x] Task 3.1: Implement `NotificationService` in `backend/app/services/notification_service.py`:
  - Channels CRUD & secret encryption.
  - Test channel execution.
  - Routes CRUD.
  - Delivery log query with filtering.
  - `notify_alert_event`: matches routes and dispatches notifications.
- [x] Task 3.2: Hook `NotificationService.notify_alert_event` into `AlertEvaluatorService` when an alert event fires or resolves.

## Phase 4: API Endpoints & Routers
- [x] Task 4.1: Add channel, route, and delivery log endpoints to `backend/app/api/v1/alerts.py` (or router).
- [x] Task 4.2: Dependency injection in `backend/app/api/deps.py`.

## Phase 5: Backend Tests
- [x] Task 5.1: Unit tests in `backend/tests/test_notifiers.py`:
  - Mocked transport for each notifier (Email, Telegram, Webhook, Slack).
  - Retry on failure and give-up behavior (attempt counts).
  - Encryption and decryption round-trip.
- [x] Task 5.2: API tests in `backend/tests/test_notifications_api.py`:
  - Channels CRUD and RBAC.
  - Write-only secrets (never leaked in GET/PUT/POST responses).
  - Channel test endpoint.
  - Routes CRUD and matching.
  - Delivery log queries.
- [x] Task 5.3: Verify 100% backend tests pass (`python -m pytest -q backend`).

## Phase 6: Frontend Models, Constants, & Service
- [x] Task 6.1: Define TypeScript interfaces in `frontend/src/app/core/models/notifications.model.ts`.
- [x] Task 6.2: Create constants in `frontend/src/app/core/constants/notifications.constants.ts`.
- [x] Task 6.3: Implement `NotificationsService` in `frontend/src/app/core/services/notifications.service.ts` with unit tests.

## Phase 7: Frontend Store & Components
- [x] Task 7.1: Implement `NotificationsStore` in `frontend/src/app/features/alerts/notifications.store.ts` with unit tests.
- [x] Task 7.2: Create dialogs:
  - `ChannelDialogComponent`: per-type fields, write-only secret indicators.
  - `RouteDialogComponent`: channel, severity, rule type, scope mapping.
- [x] Task 7.3: Create `NotificationChannelsComponent` (`frontend/src/app/features/alerts/channels/notification-channels.component.ts`, `.html`, `.scss`, `.spec.ts`):
  - Channel cards with inline test button & result pill.
  - Routing matrix table.
  - Delivery log table.
- [x] Task 7.4: Register `/alerts/channels` route in `frontend/src/app/app.routes.ts` and add tab/link in `/alerts`.
- [x] Task 7.5: Unit tests for components.

## Phase 8: Verification & Delivery
- [x] Task 8.1: Full frontend test pass (`npm test --prefix frontend`).
- [x] Task 8.2: Production build pass (`npm run build --prefix frontend`) with 0 warnings.
- [x] Task 8.3: Full backend test pass (`python -m pytest -q backend`).
- [x] Task 8.4: Documentation updates (`README.md`, `docs/progress.md`).
- [x] Task 8.5: Knowledge graph update (`graphify update .`).
- [x] Task 8.6: Commit and push changes.
