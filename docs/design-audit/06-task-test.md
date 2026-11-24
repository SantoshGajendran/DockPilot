# Usability Task Test Walkthrough

Simulated end-to-end task execution measuring clicks, time to completion, cognitive hesitation points, and concrete interaction improvements across the 8 canonical operational journeys.

---

## Task Journey Summary Table

| Task # | Goal | Target Route | Measured Clicks | Measured Latency | Friction / Hesitation Point | UX Score |
|---|---|---|---|---|---|---|
| **Task 1** | Identify highest memory container | `/dashboard` → `/containers` | **2 clicks** | 1.88s | Memory column sorting is not default; table lacks visual bar | 8/10 |
| **Task 2** | Restart container & confirm | `/containers` | **2 clicks** | 0.95s | Destructive button icon is identical neutral grey; lacks confirmation distinction | 6/10 |
| **Task 3** | Read last 5m errors from container | `/logs` | **2 clicks** | 1.32s | Window presets (15m, 1h) lack a "5m" preset; requires custom date filter | 7/10 |
| **Task 4** | Open shell & execute command | `/containers/:id` | **1 click** | 1.86s | Terminal is tucked inside tabs; no global quick-shell hotkey | 7/10 |
| **Task 5** | Diagnose fired alert & acknowledge | `/alerts` | **2 clicks** | 1.99s | Acknowledge button lacks optimistic visual state feedback | 7/10 |
| **Task 6** | Check disk space & prune images | `/resources` | **2 clicks** | 1.46s | Prune wizard lacks preview of reclaimable gigabytes | 6/10 |
| **Task 7** | Create CPU >80% for 5m alert rule | `/alerts` | **4 clicks** | 2.41s | Form lacks visual slider/stepper; requires raw text typing | 6/10 |
| **Task 8** | Find who restarted container yesterday | `/audit` | **1 click** | 1.28s | Search input requires typing 'restart'; lacks quick action pill | 8/10 |

---

## Detailed Task Walkthroughs

### Task 1: Find out which container is using the most memory right now
- **Execution Path**:
  1. Operator arrives at `/dashboard`. Overview hero card shows total RAM (e.g. 1.2 GB / 8 GB), but does not rank individual containers.
  2. Click "Containers" in sidebar navigation (1st click).
  3. Containers table renders sorted by status (Running first).
  4. Operator must locate the "Memory" column header and click it (2nd click) to sort descending.
- **Cognitive Hesitation**: The dashboard overview card does not display a "Top 3 Memory Consumers" mini-leaderboard. The operator must navigate away from the home cockpit to answer a basic triage question.
- **Proposed Improvement**: Add a "Top Resource Consumers" widget directly on the Dashboard hero card.

---

### Task 2: Restart a specific container and confirm it worked
- **Execution Path**:
  1. Navigate to `/containers`.
  2. Locate target container row (`dockpilot-redis`).
  3. Click inline Restart icon button (1st click).
  4. Confirmation dialog appears: "Are you sure you want to restart dockpilot-redis?".
  5. Click "Confirm Restart" (2nd click).
  6. Row displays amber "Restarting" state chip, then transitions to green "Running".
- **Cognitive Hesitation**: The Restart button shares identical dimensions, shape, and neutral slate color (`#64748B`) with the benign "Logs" and "Inspect" icons. Operators pause to verify the tooltip before clicking.
- **Proposed Improvement**: Apply distinct gold hover styling to Restart and crimson styling to Stop/Delete.

---

### Task 3: Read the last 5 minutes of errors from one container
- **Execution Path**:
  1. Navigate to `/logs`.
  2. Select target container checkbox in "Target Fleet" sidebar (1st click).
  3. Open Stream/Level dropdown and select "ERROR / FATAL" (2nd click).
  4. Time window presets offer `15m`, `1h`, `6h`, `24h`. A `5m` preset is absent, forcing the operator to accept the 15m window and visually filter for recent lines.
- **Cognitive Hesitation**: Time window pill options jump from live tail straight to 15 minutes.
- **Proposed Improvement**: Add a `5m` preset pill and a quick "Errors in last 5m" shortcut in the container detail view.

---

### Task 4: Open a shell in a container and run a command
- **Execution Path**:
  1. Navigate to `/containers/c1`.
  2. Click "Terminal" tab (1st click).
  3. xterm canvas establishes WebSocket connection (`/exec?token=...`). Initial banner `# ` appears.
  4. Operator types `pwd` and `ls`. Shell returns responses with sub-50ms latency.
- **Cognitive Hesitation**: No global shortcut exists to open an instant terminal drawer from anywhere in the application.
- **Proposed Improvement**: Implement a global hotkey (``Ctrl+` ``) that slides up an overlay terminal drawer targeting the active or last-viewed container.

---

### Task 5: Find out why an alert fired and acknowledge it
- **Execution Path**:
  1. Navigate to `/alerts`.
  2. Active Alerts table displays banner: `CRITICAL: Memory threshold exceeded (dockpilot-redis at 94.2% > 90%)`.
  3. Operator reads the triggered value and duration.
  4. Click "Acknowledge" button (1st click).
  5. API call executes.
- **Cognitive Hesitation**: The button gives zero immediate tactile acknowledgement (no spinner, no optimistic dimming). The operator clicked a second time assuming the click was dropped.
- **Proposed Improvement**: Add immediate optimistic UI feedback with a subtle checkmark morph.

---

### Task 6: Check how much disk is left and prune unused images
- **Execution Path**:
  1. Navigate to `/resources`.
  2. Top summary card displays Total Docker Virtual Disk (e.g. 4.2 GB used).
  3. Click "Prune System" button (1st click).
  4. Modal opens with checkboxes: "Unused Images", "Dangling Volumes", "Unused Networks".
  5. Click "Confirm Prune" (2nd click).
- **Cognitive Hesitation**: The modal does not preview how many megabytes or gigabytes will actually be reclaimed.
- **Proposed Improvement**: Query Docker daemon dry-run stats and display: "Reclaimable: ~1.4 GB".

---

### Task 7: Create an alert rule for CPU above 80% for 5 minutes with a notification channel
- **Execution Path**:
  1. Navigate to `/alerts`.
  2. Click "New Rule" button (1st click).
  3. Modal opens. Select Metric: "CPU Usage %" (2nd click).
  4. Enter Threshold: `80` (keyboard typing).
  5. Enter Duration: `5m` (keyboard typing).
  6. Select Channel: "Slack DevOps" (3rd click).
  7. Click "Save Alert Rule" (4th click).
- **Cognitive Hesitation**: Form inputs require manual typing of unit strings ("5m") rather than offering friendly duration chips (`1m`, `5m`, `15m`).
- **Proposed Improvement**: Provide quick-preset chip selectors for common alerting thresholds.

---

### Task 8: Find who restarted a container yesterday
- **Execution Path**:
  1. Navigate to `/audit` (as Admin).
  2. Audit log renders chronological table.
  3. Type "restart" into the search/filter input (1st action).
  4. Table instantly filters to `container.restart` entries showing actor `operator`, target `dockpilot-redis`, timestamp `2026-11-23 18:42:10 UTC`, result `SUCCESS`.
- **Cognitive Hesitation**: Fast and seamless; no major hesitation points found.
- **Proposed Improvement**: Add quick-filter chips for `Reboots`, `Settings`, and `User Changes`.
