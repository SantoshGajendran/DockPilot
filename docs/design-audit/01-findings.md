# DockPilot Design Audit: Master Findings

All findings ranked strictly by priority: **Severity first** (S1 Blocker > S2 Major > S3 Moderate > S4 Polish), then **Impact** (5 down to 1), then **lowest Effort** (XS < S < M < L).

---

## Severity 1: Blockers (Accessibility & Critical Operation Hazards)

### DF-014 Inline container action buttons lack accessible names (button-name)
- Route(s): `/containers`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Inline quick-action buttons (Start, Stop, Restart, Terminal, Logs) render only `<dp-icon>` child elements without `aria-label` or inner text.
- Evidence: `frontend/src/app/features/containers/containers-list.component.html:142-168`, axe CRITICAL violation `button-name`.
- Why it matters: Screen reader users hear "button" with zero indication of whether clicking will restart, stop, or delete a production container.
- Recommended fix: Add explicit `[attr.aria-label]="'Restart container ' + c.name"` and `matTooltip` on every action button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-029 Unlabelled search input violates form accessibility (label)
- Route(s): `/logs`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: The primary log search text input (`placeholder="Search logs with regex or tokens..."`) lacks an associated `<label>` element, `aria-label`, or `aria-labelledby` attribute.
- Evidence: `frontend/src/app/features/logs/logs-explorer.component.html:47`, axe CRITICAL violation `label`.
- Why it matters: Screen reader users cannot understand the purpose of the primary search field.
- Recommended fix: Add `aria-label="Search container logs"` to the `<input>` element.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-030 Log stream control buttons lack accessible names (button-name)
- Route(s): `/logs`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Action buttons in the log viewer toolbar (Pause/Resume, Wrap Lines, Clear, Download, Scroll to Bottom) render icon-only without accessible names.
- Evidence: `frontend/src/app/shared/components/log-viewer/log-viewer.component.html:12-38`, axe CRITICAL violation `button-name`.
- Why it matters: Assistive technology announces "button" without identifying playback, wrapping, or export functions.
- Recommended fix: Add explicit `[attr.aria-label]="action.tooltip"` and `matTooltip` on each button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-043 Compose stack action buttons lack accessible names (button-name)
- Route(s): `/projects`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Quick-action buttons on compose project cards (Compose Up, Down, Restart, View Logs) render icons only without `aria-label` or text equivalents.
- Evidence: `frontend/src/app/features/compose/compose-projects.component.html:84-112`, axe CRITICAL violation `button-name`.
- Why it matters: Screen reader users cannot tell which button triggers a stack restart versus tearing down all containers.
- Recommended fix: Add `[attr.aria-label]="action.name + ' for project ' + project.name"` and `matTooltip` on each button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-057 Alert silence switches lack accessible names (aria-input-field-name)
- Route(s): `/alerts`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: The MatSlideToggle component used to silence alert rules renders an internal `<input type="checkbox">` without an accessible name or label.
- Evidence: `frontend/src/app/features/alerts/alerts.component.html:148`, axe SERIOUS violation `aria-input-field-name`.
- Why it matters: Screen readers announce "checkbox unchecked" with no clue which alert rule will be muted.
- Recommended fix: Add `[attr.aria-label]="'Silence alert rule ' + rule.name"` on the `<mat-slide-toggle>`.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-058 Rule card action buttons lack accessible text (button-name)
- Route(s): `/alerts`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Rule action buttons (Edit Rule, Delete Rule, Test Rule) render `<dp-icon>` elements without `aria-label` or visible text.
- Evidence: `frontend/src/app/features/alerts/alerts.component.html:176-192`, axe CRITICAL violation `button-name`.
- Why it matters: Blind administrators cannot identify or activate edit/delete rule operations.
- Recommended fix: Add `[attr.aria-label]="action.label + ' for rule ' + rule.name"` and `matTooltip` on each button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-070 Resource action buttons lack accessible names (button-name)
- Route(s): `/resources`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Delete image, inspect volume, and remove network buttons render `<dp-icon>` elements without `aria-label` or accessible text.
- Evidence: `frontend/src/app/features/resources/resources.component.html:112-148`, axe CRITICAL violation `button-name`.
- Why it matters: Screen reader users cannot tell which button removes a storage volume versus pulling an image.
- Recommended fix: Add `[attr.aria-label]="action.label + ' for ' + item.name"` on each button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-077 Expand payload buttons lack accessible names (button-name)
- Route(s): `/audit`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: The chevron icon button used to expand JSON action details in each row has no `aria-label`, visible text, or `aria-expanded` state.
- Evidence: `frontend/src/app/features/audit/audit.component.html:82`, axe CRITICAL violation `button-name`.
- Why it matters: Screen readers announce "button" with no indication that it expands audit diff details.
- Recommended fix: Add `[attr.aria-label]="'Toggle details for event ' + entry.id"` and `[attr.aria-expanded]="isExpanded(entry.id)"`.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-084 User action buttons lack accessible names (button-name)
- Route(s): `/users`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Table row action buttons (Edit Role, Reset Password, Deactivate User) render icons only without `aria-label` or visible text.
- Evidence: `frontend/src/app/features/users/users.component.html:108-132`, axe CRITICAL violation `button-name`.
- Why it matters: Screen reader users cannot tell which button edits permissions versus deactivating an account.
- Recommended fix: Add `[attr.aria-label]="action.label + ' for user ' + u.username"` and `matTooltip` on each button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-091 Session revoke icon buttons lack accessible text (button-name)
- Route(s): `/profile`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: The trash/cross icon button on each active session entry lacks an accessible name or label.
- Evidence: `frontend/src/app/features/profile/profile.component.html:142`, axe CRITICAL violation `button-name`.
- Why it matters: Screen readers announce "button" with no indication that clicking will terminate a session on another workstation.
- Recommended fix: Add `[attr.aria-label]="'Revoke session from ' + s.ip_address"` on the button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-097 Unlabelled numeric inputs in retention settings (label)
- Route(s): `/settings`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: Numeric inputs for metrics retention days and event log pruning thresholds lack associated `<label>` tags or `aria-label` attributes.
- Evidence: `frontend/src/app/features/settings/settings.component.html:142-168`, axe CRITICAL violation `label`.
- Why it matters: Screen reader users cannot tell whether a numeric field configures audit retention, metric sampling rate, or disk warning limits.
- Recommended fix: Add explicit `aria-label="Metrics retention period in days"` and `aria-label="Event log retention days"`.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-015 Container name anchor link lacks accessible name (link-name)
- Route(s): `/containers`
- Category / Severity / Impact / Effort: A11Y / S1 / 4 / XS
- What is wrong: Container name links that include an icon and truncated text fail the accessible name computation when truncated via CSS text-overflow.
- Evidence: `frontend/src/app/features/containers/containers-list.component.html:86`, axe SERIOUS violation `link-name`.
- Why it matters: Screen readers announce empty or partial link targets.
- Recommended fix: Add `[attr.aria-label]="'View details for container ' + c.name"` to the `<a>` tag.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-036 ARIA progress bars lack accessible names (aria-progressbar-name)
- Route(s): `/host`
- Category / Severity / Impact / Effort: A11Y / S1 / 4 / XS
- What is wrong: Custom CPU, Memory, and Disk progress gauges have `role="progressbar"` with `aria-valuenow` and `aria-valuemax`, but omit `aria-label` or `aria-labelledby`.
- Evidence: `frontend/src/app/features/host/host.component.html:128-154`, axe SERIOUS violation `aria-progressbar-name`.
- Why it matters: Screen readers announce "progressbar 64%" without context on whether it represents CPU load, swap space, or root disk partition.
- Recommended fix: Add `aria-label="Host CPU utilization"`, `aria-label="Host memory utilization"`, and `aria-label="Disk storage utilization"`.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-045 Dangerous "Compose Down" action placed adjacent to benign actions
- Route(s): `/projects`
- Category / Severity / Impact / Effort: COMPONENT / S1 / 4 / S
- What is wrong: The "Down" button (which tears down all containers and networks) sits immediately adjacent to the "Restart" button with identical dimensions and standard neutral grey icon color.
- Evidence: `screenshots/projects/populated-1440x900-dark.png`, `frontend/src/app/features/compose/compose-projects.component.html:92-98`.
- Why it matters: High risk of accidental stack destruction during rushed production maintenance.
- Recommended fix: Separate the "Down" action into an overflow menu (`...`) or require a typed confirmation dialog with distinct destructive styling.
- Related redesign file: `docs/design/pages/projects.md`

---

## Severity 2: Major Issues (Usability, Contrast & Mobile Responsiveness)

### DF-008 Layout shift (CLS 0.031) on 2s telemetry ticker updates
- Route(s): `/dashboard`
- Category / Severity / Impact / Effort: PERF / S2 / 5 / M
- What is wrong: Every 2 seconds when SSE pushes updated CPU/memory figures, changing numeric widths cause sibling elements and gauge bars to jitter horizontally.
- Evidence: Measured CLS max shift score 0.03065 in 15s performance profile, `scratch/audit_data.json:sseProfile`.
- Why it matters: Subconscious visual instability causes eye fatigue and makes data reading difficult during active load spikes.
- Recommended fix: Apply `font-variant-numeric: tabular-nums;` and fix metric value container widths (`min-width: 64px; text-align: right;`).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-007 Low contrast micro-labels in fleet health summary card
- Route(s): `/dashboard`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: The card metric descriptions ("RUNNING CONTAINERS", "DEGRADED CONTAINERS", "MEMORY USAGE RATIO") render `#64748B` on `#0E1017`, measuring 3.42:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/dashboard/populated-1440x900-dark.png`, `frontend/src/app/features/dashboard/dashboard.component.scss:64`, axe violation `color-contrast`.
- Why it matters: Operators glancing at flight deck telemetry cannot quickly discern health states in low-contrast ambient environments.
- Recommended fix: Change color to `var(--text-dim)` (`#A09EB4` in dark, `#545268` in light), achieving 5.8:1 contrast.
- Related redesign file: `docs/design/pages/dashboard.md`

### DF-024 Low contrast tab labels in unselected state
- Route(s): `/containers/:id`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Inactive tab labels ("ENV VARS", "PORTS & MOUNTS", "HEALTH LOGS") use `#64748B` on `#08090E`, resulting in a 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/container-detail/populated-1440x900-dark.png`, `frontend/src/app/features/containers/detail/container-detail.component.scss:198`, axe violation `color-contrast`.
- Why it matters: Users with visual impairments cannot easily discover available inspection tabs.
- Recommended fix: Increase unselected tab color to `var(--text-dim)` (`#A09EB4`, contrast 5.4:1).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-033 Low contrast timestamp text in log stream
- Route(s): `/logs`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: The `.log-ts` timestamp column renders `#64748B` on `#08090E`, measuring a 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/logs/populated-1440x900-dark.png`, `frontend/src/app/shared/components/log-viewer/log-viewer.component.scss:182`, axe violation `color-contrast`.
- Why it matters: Timestamps are critical for correlating distributed incident timelines; low contrast delays reading.
- Recommended fix: Change color to `var(--text-dim)` (`#A09EB4` dark, `#545268` light).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-050 Inadequate text contrast on event timestamps in dark theme
- Route(s): `/events`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Event occurrence timestamps and relative times ("3m ago", "14:22:08 UTC") render `#475569` on `#0B0D14`, measuring 2.85:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/events/populated-1440x900-dark.png`, `frontend/src/app/features/events/components/events-timeline.component.scss:64`, axe violation `color-contrast`.
- Why it matters: Operators reviewing past incidents cannot quickly scan time anchors in low-light environments.
- Recommended fix: Update timestamp font color to `var(--text-dim)` (`#A09EB4`, contrast 5.4:1).
- Related redesign file: `docs/design/pages/events.md`

### DF-061 Low contrast threshold values in dark theme
- Route(s): `/alerts`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Alert rule trigger condition descriptions ("CPU > 80% for 5m") render in `#64748B` on `#08090E`, measuring 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/alerts/populated-1440x900-dark.png`, `frontend/src/app/features/alerts/alerts.component.scss:124`, axe violation `color-contrast`.
- Why it matters: Operators glancing at rule thresholds cannot verify trigger limits quickly.
- Recommended fix: Bind threshold strings to `var(--text)` (`#ECEAF4`) with monospace styling.
- Related redesign file: `docs/design/pages/alerts.md`

### DF-064 Low contrast destination URLs in channel cards
- Route(s): `/alerts/channels`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Webhook target URLs (e.g. `https://hooks.slack.com/services/...`) render `#64748B` on `#08090E`, measuring a 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/notification-channels/populated-1440x900-dark.png`, `frontend/src/app/features/alerts/channels/notification-channels.component.scss:84`, axe violation `color-contrast`.
- Why it matters: Operators cannot easily verify target endpoints during configuration review.
- Recommended fix: Bind destination URLs to `var(--text-dim)` (`#A09EB4` dark, `#545268` light).
- Related redesign file: `docs/design/pages/alerts.md`

### DF-078 Low contrast action tags in audit table
- Route(s): `/audit`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Operation tags ("container.restart", "settings.update") render `#64748B` on `#08090E`, measuring a 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/audit/populated-1440x900-dark.png`, `frontend/src/app/features/audit/audit.component.scss:68`, axe violation `color-contrast`.
- Why it matters: Compliance officers scanning long security logs suffer visual fatigue and missed entries.
- Recommended fix: Bind action tags to `var(--text-dim)` (`#A09EB4` dark, `#545268` light).
- Related redesign file: `docs/design/pages/audit.md`

### DF-093 Low contrast helper copy on 2FA enrollment card
- Route(s): `/profile`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: The instructions for scanning the authenticator QR code render `#64748B` on `#08090E`, measuring 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/profile/populated-1440x900-dark.png`, `frontend/src/app/features/profile/profile.component.scss:164`, axe violation `color-contrast`.
- Why it matters: Users configuring security credentials struggle to read recovery token warnings.
- Recommended fix: Set helper copy color to `var(--text-dim)` (`#A09EB4`, contrast 5.4:1).
- Related redesign file: `docs/design/pages/users-profile-settings.md`

### DF-099 Low contrast setting description copy in dark theme
- Route(s): `/settings`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Explanatory helper paragraphs under setting toggles render `#64748B` on `#08090E`, measuring a 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/settings/populated-1440x900-dark.png`, `frontend/src/app/features/settings/settings.component.scss:84`, axe violation `color-contrast`.
- Why it matters: Operators cannot read critical setting side effects (e.g. telemetry implications, retention disk usage).
- Recommended fix: Bind description copy to `var(--text-dim)` (`#A09EB4`, contrast 5.4:1).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-017 Destructive container actions lack distinct warning styling
- Route(s): `/containers`
- Category / Severity / Impact / Effort: COMPONENT / S2 / 4 / S
- What is wrong: The "Stop" and "Remove" action buttons share the same muted grey icon styling (`#64748B`) as benign actions like "Inspect" and "Logs".
- Evidence: `screenshots/containers/populated-1440x900-dark.png`, `frontend/src/app/features/containers/containers-list.component.scss:88`.
- Why it matters: High cognitive load and accidental-click risk during tense incident remediation.
- Recommended fix: Style destructive actions with hover warning tokens (`color: var(--status-critical); background: rgba(244, 63, 94, 0.1);`).
- Related redesign file: `docs/design/spec/04-components.md`

### DF-053 OOM and Container Die events lack prominent critical alert cues
- Route(s): `/events`
- Category / Severity / Impact / Effort: VISUAL / S2 / 4 / S
- What is wrong: Fatal container events like `oom` and `die (exitCode 137)` are styled identically to routine events like `exec_create` and `start`, using a thin 1px outline with no alert badge.
- Evidence: `screenshots/events/populated-1440x900-dark.png`, `frontend/src/app/features/events/components/events-timeline.component.scss:118`.
- Why it matters: Operators scanning hundreds of event entries easily miss critical container crashes.
- Recommended fix: Give OOM and non-zero exit events a distinct crimson border highlight (`border-left: 3px solid var(--status-critical)`) and a red warning chip.
- Related redesign file: `docs/design/pages/events.md`

### DF-072 Two-stage prune confirmation lacks clear disk reclaim preview
- Route(s): `/resources`
- Category / Severity / Impact / Effort: IA / S2 / 4 / S
- What is wrong: Initiating system prune asks "Are you sure?" without calculating or displaying the estimated reclaimable disk space (GB) before the user confirms.
- Evidence: `frontend/src/app/features/resources/dialogs/prune-wizard-dialog.component.html:34-58`.
- Why it matters: Operators hesitate or fear unintended data loss because they cannot preview what will be freed.
- Recommended fix: Include a dry-run summary breakdown: "Reclaimable: 1.4 GB (3 unused images, 1 dangling volume, 0 networks)".
- Related redesign file: `docs/design/pages/resources.md`

### DF-079 Silent redirection without permission denial toast for operators
- Route(s): `/audit`, `/users`
- Category / Severity / Impact / Effort: IA / S2 / 4 / S
- What is wrong: When an Operator navigates directly to `/audit`, `roleGuard` silently redirects them to `/dashboard` with no banner or toast explaining why the page did not load.
- Evidence: `frontend/src/app/core/guards/role.guard.ts:13`, `scratch/audit_data.json:rbacChecks`.
- Why it matters: Users assume a broken route or application malfunction rather than understanding role permissions.
- Recommended fix: Trigger a brief toast: "Access Denied: Administrator role required to view security audit logs" prior to redirection.
- Related redesign file: `docs/design/spec/03-app-shell.md`

### DF-095 Destructive "Revoke All Sessions" lacks prominent danger warning
- Route(s): `/profile`
- Category / Severity / Impact / Effort: COMPONENT / S2 / 4 / S
- What is wrong: The "Revoke All Other Sessions" action uses standard neutral outline styling, identical to non-destructive actions.
- Evidence: `frontend/src/app/features/profile/profile.component.html:158`, `profile.component.scss:112`.
- Why it matters: Accidental session invalidation during casual account inspection.
- Recommended fix: Apply warning borders and distinct confirmation dialog: "This will terminate 3 active sessions across other devices".
- Related redesign file: `docs/design/pages/users-profile-settings.md`

### DF-100 Sticky save footer covers bottom setting inputs on mobile
- Route(s): `/settings`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 4 / S
- What is wrong: On mobile (390px), the sticky bottom action bar ("SAVE CHANGES", "DISCARD") overlaps the last input field without adding compensatory `padding-bottom` to the scrollable container.
- Evidence: `screenshots/settings/populated-390x844-dark.png`, `frontend/src/app/features/settings/settings.component.scss:284`.
- Why it matters: Users cannot tap or edit the final configuration field on mobile devices.
- Recommended fix: Add `padding-bottom: 96px;` to `.settings-container` on `@media (max-width: 600px)`.
- Related redesign file: `docs/design/pages/users-profile-settings.md`

### DF-016 Horizontal table scroll and truncated columns on tablet/mobile
- Route(s): `/containers`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 4 / M
- What is wrong: On 768px and 390px viewports, the desktop table layout overflows horizontally (min-width: 820px), requiring clumsy dual-axis swipe scrolling to reach restart/stop actions.
- Evidence: `screenshots/containers/populated-768x1024-dark.png`, `screenshots/containers/populated-390x844-dark.png`.
- Why it matters: Critical quick-action buttons are pushed off-screen on tablets and mobile phones during emergency triage.
- Recommended fix: Implement responsive card switch below 900px (`@media (max-width: 900px)`), rendering compact stacked craft cards with prominent health chips and pinned action buttons.
- Related redesign file: `docs/design/pages/containers.md`

### DF-032 Fleet selector sidebar consumes excessive horizontal width on mobile
- Route(s): `/logs`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 4 / M
- What is wrong: On mobile (390px) and tablet (768px), the "TARGET FLEET" container list is fixed above the search bar, forcing the log stream below the fold and leaving only ~250px vertical height for log lines.
- Evidence: `screenshots/logs/populated-390x844-dark.png`, `screenshots/logs/populated-768x1024-dark.png`.
- Why it matters: Severely compromises mobile triage efficiency; users spend most of their time scrolling past container checkboxes rather than reading error logs.
- Recommended fix: Collapse the target fleet into a horizontal chip drawer or dropdown filter sheet on viewports under 1024px.
- Related redesign file: `docs/design/pages/logs.md`

### DF-001 Inadequate text contrast on subtitle in light theme
- Route(s): `/login`
- Category / Severity / Impact / Effort: COLOUR / S2 / 3 / XS
- What is wrong: The brand subtitle "FLIGHT DECK ACCESS // OPERATOR CREDENTIALS" renders `#A09EB4` against the light theme background `#F4F3F8`, yielding a contrast ratio of 2.76:1, failing WCAG AA (minimum 4.5:1).
- Evidence: `screenshots/login/populated-1440x900-light.png`, `frontend/src/app/features/auth/login.component.scss:32`, measured contrast 2.76:1.
- Why it matters: Operator instructions and system security classifications are illegible for users in high ambient light environments or with low vision.
- Recommended fix: In `login.component.scss`, bind `.brand-subtitle` to `var(--text-dim)` which resolves to `#545268` in light mode (contrast 5.8:1).
- Related redesign file: `docs/design/pages/login.md`

### DF-037 Inadequate text contrast on process table headers in light theme
- Route(s): `/host`
- Category / Severity / Impact / Effort: COLOUR / S2 / 3 / XS
- What is wrong: Host process table headers (`PID`, `COMMAND`, `CPU%`, `MEM%`, `USER`) render `#94A3B8` on `#FFFFFF` in light theme, measuring 2.45:1 contrast, failing WCAG AA.
- Evidence: `screenshots/host/populated-1440x900-light.png`, `frontend/src/app/features/host/host.component.scss:184`, axe violation `color-contrast`.
- Why it matters: Process table headers become nearly invisible under bright office lighting.
- Recommended fix: Bind `.table-header` text to `var(--text-dim)` which resolves to `#545268` in light theme (contrast 5.8:1).
- Related redesign file: `docs/design/pages/host.md`

### DF-046 Low contrast service status pills in light theme
- Route(s): `/projects`
- Category / Severity / Impact / Effort: COLOUR / S2 / 3 / XS
- What is wrong: Service count chips ("3/3 RUNNING", "1 DEGRADED") render `#10B981` and `#F59E0B` against a `#FFFFFF` card in light mode, measuring 2.38:1 and 2.15:1 contrast ratios, failing WCAG AA.
- Evidence: `screenshots/projects/populated-1440x900-light.png`, `frontend/src/app/features/compose/compose-projects.component.scss:142`, axe violation `color-contrast`.
- Why it matters: Service health summaries are unreadable in light mode.
- Recommended fix: Use dark-adjusted status tokens for text in light theme (`#047857` for running, `#B45309` for warning).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-073 Low contrast resource size values in light theme
- Route(s): `/resources`
- Category / Severity / Impact / Effort: COLOUR / S2 / 3 / XS
- What is wrong: Image and volume virtual sizes ("142.8 MB", "2.1 GB") render `#94A3B8` on `#FFFFFF` in light theme, measuring 2.45:1 contrast, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/resources/populated-1440x900-light.png`, `frontend/src/app/features/resources/resources.component.scss:92`, axe violation `color-contrast`.
- Why it matters: Critical storage metrics are hard to read under bright display conditions.
- Recommended fix: Set color to `var(--text-dim)` (`#545268` in light mode, contrast 5.8:1).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-087 Low contrast table header text in light theme
- Route(s): `/users`
- Category / Severity / Impact / Effort: COLOUR / S2 / 3 / XS
- What is wrong: Table column headers (`USERNAME`, `ROLE`, `STATUS`, `CREATED`) render `#94A3B8` on `#FFFFFF` in light theme, measuring 2.45:1 contrast, failing WCAG AA.
- Evidence: `screenshots/users/populated-1440x900-light.png`, `frontend/src/app/features/users/users.component.scss:62`, axe violation `color-contrast`.
- Why it matters: Table column headers are unreadable in light mode under bright sunlight or standard office lighting.
- Recommended fix: Bind header text to `var(--text-dim)` (`#545268` in light theme, contrast 5.8:1).
- Related redesign file: `docs/design/pages/users-profile-settings.md`

### DF-004 Missing focus-visible ring on password visibility toggle
- Route(s): `/login`
- Category / Severity / Impact / Effort: A11Y / S2 / 3 / S
- What is wrong: The password visibility toggle button inside the password shell lacks a high-contrast focus indicator when navigated via keyboard Tab.
- Evidence: `frontend/src/app/features/auth/login.component.html:78`, `login.component.scss:108` (`outline: none` without `:focus-visible` ring).
- Why it matters: Keyboard-only users cannot visually verify that focus is currently on the reveal button before pressing Enter/Space.
- Recommended fix: Add `&:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }`.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-012 Missing empty state handling when zero containers exist
- Route(s): `/dashboard`
- Category / Severity / Impact / Effort: STATE / S2 / 3 / S
- What is wrong: When the backend reports 0 containers, the dashboard displays zeroed gauges (`0/0 (0%)`) with no guidance or call-to-action to deploy or discover containers.
- Evidence: `frontend/src/app/features/dashboard/dashboard.component.html:42-60` (lacks empty state block).
- Why it matters: New users are greeted by dead instruments rather than an encouraging onboarding ramp.
- Recommended fix: Add `@if (totalContainers === 0)` empty state banner with "Deploy Compose Stack" and "Pull Image" quick action links.
- Related redesign file: `docs/design/spec/06-states-microcopy.md`

### DF-025 Terminal container height collapses on mobile viewports
- Route(s): `/containers/:id`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 3 / S
- What is wrong: On mobile (390x844), the embedded xterm container clips horizontal text and collapses to an unusable 200px scrollbox.
- Evidence: `screenshots/container-detail/populated-390x844-dark.png`.
- Why it matters: Mobile administrators attempting emergency inspection cannot read shell outputs or type commands.
- Recommended fix: Implement a full-screen drawer or dedicated modal mode for the terminal on screens narrower than 768px.
- Related redesign file: `docs/design/pages/container-detail.md`

### DF-047 Services table collapses horizontally on tablet viewports
- Route(s): `/projects`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 3 / S
- What is wrong: On 768px tablet displays, the project services table clips the "Image Tag" and "Ports" columns without enabling smooth touch scrolling or responsive wrap.
- Evidence: `screenshots/projects/populated-768x1024-dark.png`.
- Why it matters: Operators cannot identify which image version is running inside the Compose stack on tablet screens.
- Recommended fix: Prioritize columns on `< 900px` viewports, moving Ports and Volumes into an expandable row drawer.
- Related redesign file: `docs/design/pages/projects.md`

### DF-051 Lack of visual pause/resume controls for live stream
- Route(s): `/events`
- Category / Severity / Impact / Effort: COMPONENT / S2 / 3 / S
- What is wrong: As new Docker events arrive via SSE, the timeline auto-prepends new cards, continuously pushing existing items downward while an operator is attempting to read an event payload.
- Evidence: `frontend/src/app/features/events/events.component.html:12-34` (lacks pause toggle button).
- Why it matters: High cognitive frustration; target cards move unexpectedly under the user's cursor during incident analysis.
- Recommended fix: Add a "Pause Feed" toggle button in the timeline header that buffers incoming events with a counter badge ("3 new events - Click to show").
- Related redesign file: `docs/design/pages/events.md`

### DF-067 Channel delivery log collapses on mobile viewports
- Route(s): `/alerts/channels`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 3 / S
- What is wrong: The delivery audit table showing recent dispatch attempts, HTTP status codes, and latency truncates error response messages on 390px screens.
- Evidence: `screenshots/notification-channels/populated-390x844-dark.png`.
- Why it matters: Mobile administrators cannot read webhook rejection error details.
- Recommended fix: Stack delivery log rows into expandable incident cards on mobile.
- Related redesign file: `docs/design/pages/alerts.md`

### DF-071 Legacy hardcoded Material palette in Prune Wizard Dialog
- Route(s): `/resources`
- Category / Severity / Impact / Effort: VISUAL / S2 / 3 / S
- What is wrong: The prune confirmation wizard introduces generic material colors `#FF9800` (amber 500), `#E65100` (amber 900), and `#666` completely uncoordinated with the obsidian/gold Flight Deck aesthetic.
- Evidence: `frontend/src/app/features/resources/dialogs/prune-wizard-dialog.component.scss:28, 44, 76`.
- Why it matters: Breaks immersion and visual identity, looking like a stock admin template dialog pasted into the application.
- Recommended fix: Restyle the prune dialog using `var(--gold)` for primary confirm, `var(--status-critical)` for destructive warnings, and `var(--bg-2)` for the card surface.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-080 JSON payload diff drawer overflows on mobile viewports
- Route(s): `/audit`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 3 / S
- What is wrong: Expanding an audit JSON payload on 390px screens forces horizontal scrollbars and clips code borders, causing the parent table to break layout.
- Evidence: `screenshots/audit/populated-390x844-dark.png`.
- Why it matters: Administrators responding to incidents on a phone cannot inspect payload parameter changes.
- Recommended fix: Wrap JSON payloads in `white-space: pre-wrap; word-break: break-all;` with responsive card container.
- Related redesign file: `docs/design/pages/audit.md`

### DF-104 Prohibited ARIA attribute on static glass panel (aria-prohibited-attr)
- Route(s): `/dev/components`
- Category / Severity / Impact / Effort: A11Y / S2 / 3 / XS
- What is wrong: The component showcase panel renders `role="region"` with `aria-valuenow`, triggering an ARIA role violation because `aria-valuenow` is only valid on range widgets (sliders, progressbars).
- Evidence: `frontend/src/app/features/dev/components-gallery.component.html:62`, axe SERIOUS violation `aria-prohibited-attr`.
- Why it matters: Confuses assistive technologies into treating static layout containers as interactive range inputs.
- Recommended fix: Remove `aria-valuenow` from non-range elements.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

---

## Severity 3: Moderate Inconsistencies (Design Tokens, Code Cleanliness & Motion)

### DF-010 Lack of visual hierarchy in equal-sized KPI card grid
- Route(s): `/dashboard`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 4 / S
- What is wrong: The 4 top metric cards (Containers, CPU, RAM, Network) share identical square dimensions (`1fr 1fr 1fr 1fr`) with equal visual weight, diluting critical fleet health status.
- Evidence: `screenshots/dashboard/populated-1440x900-dark.png`, `frontend/src/app/features/dashboard/dashboard.component.scss:18`.
- Why it matters: A "sea of cards" template look that fails to direct the operator's eye to high-priority incidents or outliers.
- Recommended fix: Implement an asymmetric hero layout where the primary Fleet Status occupies 2fr with integrated sparkline, and peripheral host stats occupy 1fr each.
- Related redesign file: `docs/design/pages/dashboard.md`

### DF-011 Inconsistent status badge colors bypassing semantic tokens
- Route(s): `/dashboard`, `/containers`
- Category / Severity / Impact / Effort: COLOUR / S3 / 4 / S
- What is wrong: Container state tags hardcode `#10B981` (green), `#F59E0B` (amber), `#F43F5E` (rose), and `#64748B` (slate) directly in component SCSS instead of utilizing `--status-*` tokens.
- Evidence: `frontend/src/app/features/dashboard/dashboard.component.scss:112-140`.
- Why it matters: Disconnected color values prevent synchronized theme tweaking and create tone mismatches between charts, cards, and data tables.
- Recommended fix: Replace with `var(--status-running)`, `var(--status-warning)`, `var(--status-critical)`, and `var(--status-stopped)`.
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-002 Non-standard input field padding violating 4px grid
- Route(s): `/login`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The `.obsidian-input` fields use `padding: 10px 14px;`, which injects non-standard 10px and 14px metrics not on the 4px geometric scale.
- Evidence: `frontend/src/app/features/auth/login.component.scss:84`, measured padding `10px 14px`.
- Why it matters: Inconsistent vertical rhythm causes vertical misalignment when adjacent to icon containers and error labels.
- Recommended fix: Change padding to `12px 16px` (`var(--space-3) var(--space-4)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-009 Inlined style width percentage on resource progress bars
- Route(s): `/dashboard`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Resource utilization gauges utilize inline `[style.width.%]="metric.cpu"` and `[style.width.%]="metric.memory"` without GPU-accelerated transforms.
- Evidence: `frontend/src/app/features/dashboard/dashboard.component.html:81, 104, 127, 150`.
- Why it matters: Animating `width` triggers full browser layout recalculations every 2 seconds rather than composite-only GPU updates.
- Recommended fix: Refactor progress fills to `transform: scaleX(calc(var(--val) / 100)); transform-origin: left; will-change: transform;`.
- Related redesign file: `docs/design/spec/05-dataviz.md`

### DF-022 Hardcoded inline style heights on terminal and stats tabs
- Route(s): `/containers/:id`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: The container detail template hardcodes `style="height: 560px;"`, `style="height: 100%;"`, and `style="width: 35%"` directly on HTML elements.
- Evidence: `frontend/src/app/features/containers/detail/container-detail.component.html:295, 296, 324`.
- Why it matters: Inline styles break CSS inheritance, prevent responsive viewport scaling on smaller laptop screens (720p/900p), and trigger CSP warnings.
- Recommended fix: Move layout dimensions into `container-detail.component.scss` utilizing flexbox and `min-height: clamp(380px, 50vh, 650px);`.
- Related redesign file: `docs/design/pages/container-detail.md`

### DF-023 Deep selector ::ng-deep overriding MatTab header styles
- Route(s): `/containers/:id`
- Category / Severity / Impact / Effort: CODE / S3 / 2 / XS
- What is wrong: Tab styling bypasses Angular view encapsulation using `::ng-deep .mat-mdc-tab-header { border-bottom: 1px solid rgba(255, 255, 255, 0.08); }`.
- Evidence: `frontend/src/app/features/containers/detail/container-detail.component.scss:244`.
- Why it matters: `::ng-deep` is deprecated and leaks styles globally to other tab components in the application.
- Recommended fix: Define tab border tokens in `theme.scss` via `--mat-tab-header-divider-color` or custom tab wrapper.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-031 Multiple ::ng-deep overrides in log explorer styling
- Route(s): `/logs`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / S
- What is wrong: `logs-explorer.component.scss` contains 4 separate `::ng-deep` selector blocks (lines 27, 33, 143, 369) targeting MatCheckbox, MatSelect, and MatFormField components.
- Evidence: `frontend/src/app/features/logs/logs-explorer.component.scss:27, 33, 143, 369`.
- Why it matters: Fragile CSS architecture that breaks across Angular Material minor version upgrades and leaks custom form field heights globally.
- Recommended fix: Standardize form field density via Angular Material density tokens (`@include mat.form-field-density(-3)`) in `styles.scss`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-038 Inline style transforms and delays on gauge animations
- Route(s): `/host`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Gauge needle indicators and bar heights are animated via inline HTML expressions: `[style.transform]="'rotate(' + angle + 'deg)'"` and `[style.animation-delay]="idx * 40 + 'ms'"`.
- Evidence: `frontend/src/app/features/host/host.component.html:136, 142, 148, 188`.
- Why it matters: Clutters template syntax and triggers Angular change detection evaluations on every timer tick.
- Recommended fix: Consolidate gauge visual styling into an isolated `dp-gauge` or `dp-radial-metric` component using CSS custom properties (`--gauge-val`).
- Related redesign file: `docs/design/spec/05-dataviz.md`

### DF-039 Host info grid wastes vertical space on 1440x900 viewport
- Route(s): `/host`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / S
- What is wrong: On standard 1440x900 displays, the top system info cards (OS, Kernel, Uptime, Docker socket) push the real-time resource graphs completely below the fold.
- Evidence: `screenshots/host/populated-1440x900-dark.png`.
- Why it matters: Operators must scroll immediately upon page load to view the primary operational data (CPU and RAM history).
- Recommended fix: Condense static host metadata into a compact horizontal breadcrumb bar or metadata strip above the main chart canvas.
- Related redesign file: `docs/design/pages/host.md`

### DF-040 Truncated command strings in process table without tooltips
- Route(s): `/host`
- Category / Severity / Impact / Effort: COMPONENT / S3 / 3 / S
- What is wrong: Long container daemon commands (e.g. `/usr/local/bin/dockerd --containerd=/run/containerd/containerd.sock`) are cut off with `text-overflow: ellipsis` but have no hover tooltip or expansion modal.
- Evidence: `screenshots/host/populated-1440x900-dark.png`, `frontend/src/app/features/host/host.component.html:268`.
- Why it matters: Operators cannot inspect command arguments, configuration flags, or file paths without opening an external shell.
- Recommended fix: Add `[matTooltip]="proc.command"` and a click-to-copy action on process table rows.
- Related redesign file: `docs/design/pages/host.md`

### DF-044 Inline style stroke and fill on SVG topology connectors
- Route(s): `/projects`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: SVG graph topology lines connecting services in a project use inline template bindings: `[style.stroke]="service.color"`, `[style.fill]="service.fill"`.
- Evidence: `frontend/src/app/features/compose/compose-projects.component.html:204, 215, 218`.
- Why it matters: Bypasses CSS class inheritance, complicates dual-theme adjustments, and incurs recalculations on hover.
- Recommended fix: Use SVG CSS classes with currentColor and theme CSS variables (`stroke: var(--line-strong);`).
- Related redesign file: `docs/design/spec/04-components.md`

### DF-052 Non-standard 6px and 10px spacing in timeline connectors
- Route(s): `/events`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The timeline node marker and vertical connecting line use `left: 10px; margin-right: 6px;`, violating the 4px geometric scale.
- Evidence: `frontend/src/app/features/events/components/events-timeline.component.scss:42, 88`.
- Why it matters: Inconsistent alignment with standard 16px and 24px grid containers.
- Recommended fix: Standardize timeline node positioning to `left: 12px; margin-right: 8px;`.
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-054 Missing empty state guidance when filters match zero events
- Route(s): `/events`
- Category / Severity / Impact / Effort: STATE / S3 / 3 / XS
- What is wrong: When an active filter returns no matching events, the screen renders an empty blank canvas with a plain string "No events found" without a "Clear all filters" shortcut.
- Evidence: `screenshots/events/empty-1440x900-dark.png`, `frontend/src/app/features/events/events.component.html:72`.
- Why it matters: Users must manually remember which filters they clicked to restore view state.
- Recommended fix: Render a stylized empty radar icon with an actionable "Reset Filters" button.
- Related redesign file: `docs/design/spec/06-states-microcopy.md`

### DF-059 Deep selector ::ng-deep overriding slide toggle colors
- Route(s): `/alerts`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Slide toggle theming uses `::ng-deep .mat-mdc-slide-toggle .mdc-switch__track { background: var(--bg-3) !important; }`.
- Evidence: `frontend/src/app/features/alerts/alerts.component.scss:313`.
- Why it matters: Bypasses Angular view encapsulation, breaks on Material component refactors, and introduces global style collisions.
- Recommended fix: Use Angular Material theme tokens (`--mdc-switch-selected-track-color`) in `theme.scss`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-060 Acknowledge button lacks optimistic visual feedback
- Route(s): `/alerts`
- Category / Severity / Impact / Effort: MOTION / S3 / 3 / S
- What is wrong: Clicking the "Ack" button on an active alert triggers an asynchronous API call without immediate visual state acknowledgement (spinner or optimistic dimming), causing users to double-click.
- Evidence: Usability Task 5 timing test (`scratch/audit_data.json:taskMetrics`), `frontend/src/app/features/alerts/alerts.component.ts:162`.
- Why it matters: Perceived lag and duplicate acknowledge requests sent to the backend.
- Recommended fix: Immediately update the button state to disabled with an optimistic checkmark animation while the request completes.
- Related redesign file: `docs/design/spec/06-states-microcopy.md`

### DF-065 Deep selector ::ng-deep overriding form field borders
- Route(s): `/alerts/channels`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Custom outline colors are forced onto Angular Material fields via `::ng-deep .mat-mdc-text-field-wrapper { border-color: rgba(255, 255, 255, 0.1) !important; }`.
- Evidence: `frontend/src/app/features/alerts/channels/notification-channels.component.scss:257`.
- Why it matters: Breaks style encapsulation, overrides accessibility high-contrast focus rings, and fails on Material component updates.
- Recommended fix: Apply theme tokens (`--mdc-outlined-text-field-outline-color`) in `theme.scss`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-066 Channel test button lacks loading indicator
- Route(s): `/alerts/channels`
- Category / Severity / Impact / Effort: MOTION / S3 / 3 / S
- What is wrong: Clicking "Send Test Notification" sends an HTTP test dispatch without disabling the button or displaying a loading spinner during external API latency (Slack/Telegram webhook round-trip).
- Evidence: `frontend/src/app/features/alerts/channels/notification-channels.component.ts:134`.
- Why it matters: Users believe the click did not register and click repeatedly, triggering webhook rate-limiting.
- Recommended fix: Bind button state to `[disabled]="isTesting()"` and display an inline spinning radar icon.
- Related redesign file: `docs/design/spec/06-states-microcopy.md`

### DF-068 Non-standard 10px and 14px padding in channel headers
- Route(s): `/alerts/channels`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The channel card header uses `padding: 10px 14px;` instead of the 4px geometric scale.
- Evidence: `frontend/src/app/features/alerts/channels/notification-channels.component.scss:48`.
- Why it matters: Visual rhythm misalignment relative to standard 16px and 24px container cards.
- Recommended fix: Change padding to `12px 16px` (`var(--space-3) var(--space-4)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-074 Non-standard 6px gap in resource tab filters
- Route(s): `/resources`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The filter pill group for dangling/all toggle uses `gap: 6px;` rather than the standard 4px or 8px scale.
- Evidence: `frontend/src/app/features/resources/resources.component.scss:36`.
- Why it matters: Sub-pixel misalignment relative to 8px and 16px container padding.
- Recommended fix: Update gap to `8px` (`var(--space-2)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-081 Inconsistent non-4px padding in audit filter toolbar
- Route(s): `/audit`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The audit filter panel uses `padding: 10px 14px;` and `gap: 6px;` instead of standard 4px multiples.
- Evidence: `frontend/src/app/features/audit/audit.component.scss:24`.
- Why it matters: Misaligned inputs relative to the data table header underneath.
- Recommended fix: Standardize to `padding: 12px 16px; gap: 8px;` (`var(--space-3) var(--space-4)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-085 Deep selector ::ng-deep overriding dialog select dropdowns
- Route(s): `/users`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Role assignment dialog uses `::ng-deep .mat-mdc-select-panel { background: #0B0D14 !important; }`.
- Evidence: `frontend/src/app/features/users/users.component.scss:236`.
- Why it matters: Breaks encapsulation, couples the styles to internal Material DOM structure, and leaks dark background to light theme dropdowns.
- Recommended fix: Use Angular Material theme tokens (`--mat-select-panel-background-color`) in `theme.scss`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-086 Generic role badges lack semantic role distinction
- Route(s): `/users`
- Category / Severity / Impact / Effort: VISUAL / S3 / 3 / S
- What is wrong: The `admin`, `operator`, and `viewer` badges use generic grey and white tags with no visual hierarchy, making it hard to spot privileged accounts.
- Evidence: `screenshots/users/populated-1440x900-dark.png`, `frontend/src/app/features/users/users.component.scss:84`.
- Why it matters: Administrators need instant visual clarity regarding who holds root control over the cluster.
- Recommended fix: Give Admin roles a gold accent (`var(--gold)`), Operators a violet accent (`var(--violet)`), and Viewers a neutral slate tag.
- Related redesign file: `docs/design/pages/users-profile-settings.md`

### DF-088 Inconsistent 6px and 10px spacings in user dialogs
- Route(s): `/users`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The Create User modal uses `padding: 10px; margin-bottom: 6px;` violating the 4px geometric scale.
- Evidence: `frontend/src/app/features/users/dialogs/user-dialog.component.scss:32, 54`.
- Why it matters: Inconsistent spacing creates awkward visual gaps around dialog buttons.
- Recommended fix: Convert all dialog margins and paddings to standard 8px/12px/16px tokens.
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-092 Deep selector ::ng-deep overriding password input styling
- Route(s): `/profile`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: `profile.component.scss` uses `::ng-deep .mat-mdc-form-field-icon-suffix { color: var(--gold) !important; }`.
- Evidence: `frontend/src/app/features/profile/profile.component.scss:273`.
- Why it matters: Pollutes global icon suffix colors across all other form fields in the app.
- Recommended fix: Scope the suffix color to `.profile-form-field .mat-mdc-form-field-icon-suffix` without `::ng-deep`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-098 Deep selector ::ng-deep overriding slide toggle tracks
- Route(s): `/settings`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Custom switch track colors are forced using `::ng-deep .mat-mdc-slide-toggle .mdc-switch__track { background-color: var(--bg-3) !important; }`.
- Evidence: `frontend/src/app/features/settings/settings.component.scss:391`.
- Why it matters: Deprecated `::ng-deep` selector leaks across all other slide toggles in the application.
- Recommended fix: Use Angular Material theme tokens in `theme.scss` (`--mdc-switch-selected-track-color: var(--gold)`).
- Related redesign file: `docs/design/spec/04-components.md`

### DF-101 Non-standard 10px spacing in configuration panels
- Route(s): `/settings`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: Setting section cards use `padding: 18px 22px; gap: 10px;` violating the 4px geometric scale.
- Evidence: `frontend/src/app/features/settings/settings.component.scss:42`.
- Why it matters: Subtle visual misalignment when transitioning between dashboard and settings cards.
- Recommended fix: Align to `padding: 20px 24px; gap: 12px;` (`var(--space-5) var(--space-6)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-106 Non-standard 14px padding between component showcase cards
- Route(s): `/dev/components`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The gallery card grid uses `gap: 14px; padding: 14px;`, violating the 4px geometric scale.
- Evidence: `frontend/src/app/features/dev/components-gallery.component.scss:24`.
- Why it matters: Sets an inconsistent precedent for developers referencing the gallery for design implementation.
- Recommended fix: Align to `gap: 16px; padding: 16px;` (`var(--space-4)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

### DF-107 Missing focus ring showcase in button gallery
- Route(s): `/dev/components`
- Category / Severity / Impact / Effort: A11Y / S3 / 3 / S
- What is wrong: The button section demonstrates default, hover, and disabled states, but omits `:focus-visible` states.
- Evidence: `frontend/src/app/features/dev/components-gallery.component.html:84-110`.
- Why it matters: Developers cannot visually inspect focus indicators without manually tabbing through the page.
- Recommended fix: Add an explicit "Focus Visible" showcase row demonstrating gold ring indicators.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

---

## Severity 4: Polish (Subtle Visual Refinements & Secondary Edge Cases)

### DF-003 Hardcoded rgba shadow on login glass panel
- Route(s): `/login`
- Category / Severity / Impact / Effort: CODE / S4 / 2 / XS
- What is wrong: The login container glass panel uses hardcoded `box-shadow: 0 16px 48px rgba(0, 0, 0, 0.45);` instead of referencing the elevation token system.
- Evidence: `frontend/src/app/features/auth/login.component.scss:48`, hardcoded `rgba(0, 0, 0, 0.45)`.
- Why it matters: In light theme, the dark 45% shadow creates an aggressive muddy halo rather than an ambient refraction shadow.
- Recommended fix: Replace with `box-shadow: var(--shadow-elevation-high)`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-005 Fixed width card causes awkward margins on 390x844 mobile viewport
- Route(s): `/login`
- Category / Severity / Impact / Effort: RESPONSIVE / S4 / 2 / S
- What is wrong: On mobile (390px), `.login-wrapper` has `width: 440px; max-width: calc(100vw - 32px);`, resulting in edge clipping of the ignition ring effect and 16px horizontal margins that feel cramped.
- Evidence: `screenshots/login/populated-390x844-dark.png`, `frontend/src/app/features/auth/login.component.scss:21`.
- Why it matters: Visual tension on narrow devices with button touch targets compressing against viewport edges.
- Recommended fix: Use full-width mobile card layout (`width: 100%; border-radius: 16px;`) on `@media (max-width: 600px)`.
- Related redesign file: `docs/design/pages/login.md`

### DF-018 Viewer role renders action buttons with no disabled hint
- Route(s): `/containers`
- Category / Severity / Impact / Effort: IA / S4 / 3 / S
- What is wrong: When authenticated as `viewer`, action buttons are disabled without explanatory tooltip or silently fail when clicked.
- Evidence: `screenshots/containers/viewer-role-1440x900-dark.png`, `frontend/src/app/features/containers/containers-list.component.html:152`.
- Why it matters: Viewers are confused as to whether the app is unresponsive or if their permissions restrict the operation.
- Recommended fix: Display a padlock icon or badge with tooltip: "Operator or Admin role required to perform control actions".
- Related redesign file: `docs/design/spec/03-app-shell.md`

### DF-019 Missing batch selection feedback on total fleet row
- Route(s): `/containers`
- Category / Severity / Impact / Effort: COMPONENT / S4 / 3 / S
- What is wrong: Selecting multiple checkboxes displays a floating batch action bar, but the table rows lack an active selected highlight border, making it unclear which rows are included in the batch.
- Evidence: `screenshots/containers/populated-1440x900-dark.png`, `frontend/src/app/features/containers/containers-list.component.scss:132`.
- Why it matters: Accidental batch execution (e.g. bulk restarting 5 containers instead of 2).
- Recommended fix: Apply `&.selected { background: rgba(139, 92, 246, 0.08); border-left: 2px solid var(--violet); }` to selected rows.
- Related redesign file: `docs/design/pages/containers.md`

### DF-026 Obscured environment variable values lack copy-all affordance
- Route(s): `/containers/:id`
- Category / Severity / Impact / Effort: COMPONENT / S4 / 2 / S
- What is wrong: While secrets are properly masked by default, there is no one-click "Copy all environment variables" button, requiring manual unmasking and copying variable by variable.
- Evidence: `screenshots/container-detail/populated-1440x900-dark.png`, `frontend/src/app/features/containers/detail/container-detail.component.html:184-210`.
- Why it matters: Cumbersome debugging workflow during configuration audits.
- Recommended fix: Add a "Copy .env format" toolbar button in the Environment Variables tab header.
- Related redesign file: `docs/design/pages/container-detail.md`

### DF-094 Hardcoded white background in QR code container
- Route(s): `/profile`
- Category / Severity / Impact / Effort: VISUAL / S4 / 2 / XS
- What is wrong: The QR code canvas container uses hardcoded `#FFFFFF` with no border radius or padding, creating an unstyled stark white rectangle that breaks the dark obsidian atmosphere.
- Evidence: `screenshots/profile/populated-1440x900-dark.png`, `frontend/src/app/features/profile/profile.component.scss:188`.
- Why it matters: Blinding glare contrast in dark room cockpit environments.
- Recommended fix: Wrap the QR code in an obsidian bezel with rounded corners (`border-radius: 12px; padding: 12px; background: #FFFFFF; box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);`).
- Related redesign file: `docs/design/spec/04-components.md`

### DF-105 Component gallery lacks token-driven interactive playground
- Route(s): `/dev/components`
- Category / Severity / Impact / Effort: CODE / S4 / 2 / S
- What is wrong: Components are rendered statically with fixed attributes rather than providing interactive knobs (e.g. changing badge status, toggling borderSweep, adjusting padding).
- Evidence: `frontend/src/app/features/dev/components-gallery.component.html:1-120`.
- Why it matters: Developers cannot verify edge-case component behavior (long labels, missing icons) inside the gallery.
- Recommended fix: Introduce interactive signal controls to test component variants dynamically.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-108 Hardcoded hex colors in gallery preview background
- Route(s): `/dev/components`
- Category / Severity / Impact / Effort: CODE / S4 / 2 / XS
- What is wrong: Showcase cards use hardcoded `background: #0D0F18; border: 1px solid #1E2330;` rather than referencing `var(--bg-2)` and `var(--line)`.
- Evidence: `frontend/src/app/features/dev/components-gallery.component.scss:48`.
- Why it matters: Preview cards do not respond correctly when switching to light theme.
- Recommended fix: Use CSS variables `var(--bg-2)` and `var(--line)`.
- Related redesign file: `docs/design/spec/01-foundations.md`
