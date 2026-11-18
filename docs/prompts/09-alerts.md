# Master Prompt 9: Alerts

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** data-driven alert rules with history.

**Backend**

- `alert_rules` table plus `config/alerts.yaml` seed. Rule types: container down, restart loop, health failing, CPU above X for N minutes, memory above X% of limit for N minutes, disk above X%, host load, container missing.
- Evaluator runs on a schedule; states are firing and resolved, with a cooldown and deduplication window.
- Endpoints: CRUD for rules, `POST /alerts/rules/{id}/test`, `GET /alerts/events`, `POST /alerts/events/{id}/ack`, `POST /alerts/silence`.

**Frontend**

- `/alerts` route with two tabs: **Active and history** (table with ack and silence actions) and **Rules** (list, enable toggle).
- Rule editor: a form that adapts to the rule type, a scope picker (all, label, specific containers), a severity selector, and a dry-run button that shows what would fire right now.
- Header bell with an active-alert count.

**Tests:** sustained-threshold logic over time windows, cooldown, silence expiry, rule validation, scope matching.
