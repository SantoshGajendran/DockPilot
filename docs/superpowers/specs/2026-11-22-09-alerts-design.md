# Design Specification: Prompt 09 — Alerts

## 1. Objectives & Scope
Provide a comprehensive, data-driven alert rules and evaluation engine with incident history, acknowledgment workflows, dynamic suppression/silence windows, dry-run testing, and a dual-tab management UI with a global header notification bell.

### Core Capabilities
1. **Rule Engine & Seed Configuration**:
   - `alert_rules` table seeded from `config/alerts.yaml`.
   - Rule types: `container_down`, `restart_loop`, `health_failing`, `cpu_high`, `memory_high`, `disk_high`, `host_load`, `container_missing`.
   - Scopes: `all`, `label` (`tier=cache`), or `container` (`dockpilot-redis`).
   - Dynamic threshold and duration parameters (`duration_minutes`, `threshold`, `cooldown_minutes`).
2. **Scheduled Alert Evaluator**:
   - Asynchronous evaluator running periodically (`alert_eval_interval_seconds: 15`).
   - Sustained threshold detection over sliding time windows via historical metrics.
   - Lifecycle management: transitions alerts between `firing` and `resolved`.
   - Cooldown deduplication and active silence suppression (`alert_silences`).
3. **API Endpoints**:
   - Rules CRUD: `GET /api/v1/alerts/rules`, `POST /api/v1/alerts/rules`, `GET /api/v1/alerts/rules/{id}`, `PUT /api/v1/alerts/rules/{id}`, `DELETE /api/v1/alerts/rules/{id}`.
   - Dry Run: `POST /api/v1/alerts/rules/{id}/test` and `POST /api/v1/alerts/rules/test`.
   - History & Status: `GET /api/v1/alerts/events`, `GET /api/v1/alerts/active-count`.
   - Acknowledge & Silence: `POST /api/v1/alerts/events/{id}/ack`, `POST /api/v1/alerts/silence`.
4. **Frontend Architecture**:
   - Standalone `/alerts` page (`AlertsComponent`):
     - **Active & History Tab**: Firing/resolved/acked table with instant Ack and Silence actions.
     - **Rules Tab**: List with toggle switch, edit/delete actions, and create button.
   - **Rule Editor Modal** (`RuleDialogComponent`): Dynamic form adapting to rule type, scope picker, severity, and dry-run preview.
   - **Silence Modal** (`SilenceDialogComponent`): Duration selector (`15m`, `1h`, `4h`, `24h`, custom).
   - **Global Header Bell**: Real-time badge counter in `ShellComponent` toolbar.

---

## 2. Configuration & Seed Rules

### `config/alerts.yaml`
```yaml
rules:
  - name: "Container Down"
    rule_type: "container_down"
    scope_type: "all"
    severity: "critical"
    cooldown_minutes: 15
    enabled: true
    description: "Alert when a container unexpectedly exits or terminates."

  - name: "Restart Loop Detected"
    rule_type: "restart_loop"
    scope_type: "all"
    severity: "critical"
    cooldown_minutes: 15
    enabled: true
    description: "Alert when a container crashes repeatedly within the sliding window."

  - name: "Container Health Failing"
    rule_type: "health_failing"
    scope_type: "all"
    severity: "warning"
    cooldown_minutes: 15
    enabled: true
    description: "Alert when a container health check reports unhealthy."

  - name: "High Container CPU"
    rule_type: "cpu_high"
    scope_type: "all"
    threshold: 85.0
    duration_minutes: 5
    severity: "warning"
    cooldown_minutes: 15
    enabled: true
    description: "Alert when container CPU utilization exceeds 85% for 5 minutes."

  - name: "High Container Memory"
    rule_type: "memory_high"
    scope_type: "all"
    threshold: 90.0
    duration_minutes: 5
    severity: "warning"
    cooldown_minutes: 15
    enabled: true
    description: "Alert when container memory usage exceeds 90% of limit for 5 minutes."

  - name: "High Disk Utilization"
    rule_type: "disk_high"
    scope_type: "all"
    threshold: 85.0
    duration_minutes: 0
    severity: "warning"
    cooldown_minutes: 30
    enabled: true
    description: "Alert when host storage mount utilization exceeds 85%."

  - name: "High Host Load"
    rule_type: "host_load"
    scope_type: "all"
    threshold: 4.0
    duration_minutes: 5
    severity: "warning"
    cooldown_minutes: 15
    enabled: true
    description: "Alert when 1-minute system load average exceeds 4.0."
```

---

## 3. Database Schema

1. `alert_rules`:
   - `id`: int (pk, autoincrement)
   - `name`: str(128), unique
   - `description`: Optional[str(256)]
   - `rule_type`: str(64)
   - `scope_type`: str(32) ('all', 'label', 'container')
   - `scope_value`: Optional[str(128)]
   - `severity`: str(32) ('info', 'warning', 'critical')
   - `threshold`: Optional[float]
   - `duration_minutes`: int (default 0)
   - `cooldown_minutes`: int (default 15)
   - `enabled`: bool (default True)
   - `created_at`: DateTime(tz=True)
   - `updated_at`: DateTime(tz=True)

2. `alert_events`:
   - `id`: int (pk, autoincrement)
   - `rule_id`: int (fk to alert_rules.id, ondelete CASCADE)
   - `rule_name`: str(128)
   - `rule_type`: str(64)
   - `severity`: str(32)
   - `target_type`: str(32) ('container', 'host')
   - `target_id`: Optional[str(64)]
   - `target_name`: Optional[str(128)]
   - `status`: str(32) ('firing', 'resolved', 'acknowledged')
   - `message`: str(512)
   - `value`: Optional[float]
   - `threshold`: Optional[float]
   - `started_at`: DateTime(tz=True)
   - `resolved_at`: Optional[DateTime(tz=True)]
   - `acknowledged_at`: Optional[DateTime(tz=True)]
   - `acknowledged_by`: Optional[str(64)]
   - `created_at`: DateTime(tz=True)

3. `alert_silences`:
   - `id`: int (pk, autoincrement)
   - `rule_id`: Optional[int] (fk to alert_rules.id, ondelete CASCADE)
   - `container_id`: Optional[str(64)]
   - `silenced_until`: DateTime(tz=True)
   - `reason`: Optional[str(256)]
   - `created_by`: Optional[str(64)]
   - `created_at`: DateTime(tz=True)

---

## 4. Security & RBAC
- Viewer role: read rules (`GET /rules`), history (`GET /events`), and count (`GET /active-count`).
- Operator & Admin roles: CRUD rules, dry-run test, acknowledge alerts, and create silences.
- Immutable audit log on rule modifications, acknowledgments, and silence creation.
