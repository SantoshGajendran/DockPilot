# Master Prompt 10: Notification Channels

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** send alerts where you will actually see them.

**Backend**

- Channel types: email (SMTP), Telegram bot, generic webhook, Slack webhook. Secrets are stored encrypted with a key from the environment.
- `POST /channels/{id}/test`, routing table linking severity and scope to channels, retry with backoff, and a delivery log.

**Frontend**

- `/alerts/channels` route: channel cards, an add dialog with per-type fields, a test button showing the result inline, a routing matrix, and the delivery log.
- Secrets are write-only in the UI (shown as set or not set).

**Tests:** each notifier against a mocked transport; retry and give-up behaviour; secrets never appear in API responses or logs.
