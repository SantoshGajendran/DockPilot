# Specification: Prompt 10 — Notification Channels

## 1. Overview
Master Prompt 10 implements real-time notification dispatching for alert firing and resolution events across multiple channel transports:
- Email (SMTP with TLS/SSL)
- Telegram Bot
- Generic Webhook
- Slack Incoming Webhook

Secrets (SMTP passwords, Telegram bot tokens, Webhook URLs/keys) are stored encrypted at rest using AES-Fernet with key derivation from configuration. Secrets are strictly write-only in the UI and masked/omitted in all API responses.

A configurable routing matrix links severity levels and scopes to channels. All delivery attempts (including retries with exponential backoff) are recorded in an immutable delivery log.

---

## 2. Architecture & Data Flow

```
   [AlertEvaluatorService]
             │
             ▼ (alert fires or resolves)
    [NotificationDispatcher]
             │
             ├──► Matches active [NotificationRoute] table (severity, rule_type, scope)
             │
             ├──► Retrieves [NotificationChannel] & decrypts secret via Fernet
             │
             ├──► Executes Notifier Transport (Email, Telegram, Webhook, Slack)
             │      └──► Retry loop with exponential backoff (up to 3 attempts)
             │
             └──► Writes [NotificationDeliveryLog] record (delivered / failed, attempts, error)
```

---

## 3. Database Models

### `notification_channels`
- `id` (Integer, PK)
- `name` (String(128), Not Null)
- `channel_type` (String(32), Not Null) — `'email'`, `'telegram'`, `'webhook'`, `'slack'`
- `enabled` (Boolean, Default True)
- `config` (JSON, Not Null) — stores public parameters (host, port, from, to, chat_id, url)
- `encrypted_secret` (Text, Nullable) — Fernet encrypted secret string
- `created_at` (DateTime with timezone)
- `updated_at` (DateTime with timezone)

### `notification_routes`
- `id` (Integer, PK)
- `channel_id` (Integer, FK to `notification_channels.id`, cascade delete)
- `name` (String(128), Not Null)
- `min_severity` (String(32), Default `'warning'`) — `'info'`, `'warning'`, `'critical'`
- `rule_type` (String(64), Nullable) — null or `'all'` for any rule, or specific type
- `scope_type` (String(32), Default `'all'`) — `'all'`, `'label'`, `'container'`
- `scope_value` (String(128), Nullable)
- `enabled` (Boolean, Default True)
- `created_at` (DateTime with timezone)

### `notification_delivery_logs`
- `id` (Integer, PK)
- `channel_id` (Integer, Nullable)
- `channel_name` (String(128), Not Null)
- `channel_type` (String(32), Not Null)
- `event_id` (Integer, Nullable)
- `alert_title` (String(256), Not Null)
- `severity` (String(32), Not Null)
- `status` (String(32), Not Null) — `'delivered'`, `'failed'`, `'testing'`
- `attempts` (Integer, Default 1)
- `error_message` (Text, Nullable)
- `payload_preview` (Text, Nullable)
- `created_at` (DateTime with timezone)

---

## 4. API Endpoints (`/api/v1/alerts`)

- Channels:
  - `GET /channels` (Role: VIEWER+) -> `List[NotificationChannelResponse]`
  - `POST /channels` (Role: ADMIN) -> `NotificationChannelResponse`
  - `GET /channels/{id}` (Role: VIEWER+) -> `NotificationChannelResponse`
  - `PUT /channels/{id}` (Role: ADMIN) -> `NotificationChannelResponse`
  - `DELETE /channels/{id}` (Role: ADMIN) -> 204 No Content
  - `POST /channels/{id}/test` (Role: OPERATOR+) -> `NotificationTestResult`
- Routes:
  - `GET /routes` (Role: VIEWER+) -> `List[NotificationRouteResponse]`
  - `POST /routes` (Role: ADMIN) -> `NotificationRouteResponse`
  - `PUT /routes/{id}` (Role: ADMIN) -> `NotificationRouteResponse`
  - `DELETE /routes/{id}` (Role: ADMIN) -> 204 No Content
- Delivery Log:
  - `GET /delivery-log` (Role: VIEWER+) with `channel_id`, `status`, `limit`, `offset` -> `DeliveryLogListResponse`

---

## 5. Security & Masking
1. Fernet symmetric encryption using derived key from `jwt_secret` or `notification_encryption_key`.
2. Secrets are write-only. Responses return `has_secret: bool`, never raw secrets.
3. Delivery logs record sanitized payloads without passwords or bot tokens.

---

## 6. Frontend UI (`/alerts/channels`)
- Standalone lazy-loaded route `/alerts/channels` accessible directly and via tabs in `/alerts`:
  - **Channels Overview**: Grid of channel cards showing type icon, status, configuration details, `has_secret` badge, and inline "Test Channel" action with loading indicator and result pill.
  - **Routing Matrix**: Table connecting rules/severities/scopes to target notification channels with toggle switches.
  - **Delivery Log**: Searchable/filterable log table with timestamps, channel name, status (`delivered` / `failed`), attempt count, and error dialog/tooltip.
- Dialogs:
  - `ChannelDialogComponent`: Dynamic form adapting to `email`, `telegram`, `webhook`, `slack`. Secret inputs with write-only indicators.
  - `RouteDialogComponent`: Selector for target channel, minimum severity, scope type, and scope value.
