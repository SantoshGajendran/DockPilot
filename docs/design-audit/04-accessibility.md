# Accessibility Audit (WCAG 2.2 AA)

A comprehensive automated and manual accessibility audit of DockPilot executed via `axe-core 4.9.1`, headless Playwright DOM inspections, and keyboard traversal tests across both Dark and Light themes.

---

## 1. Automated axe-core 4.9.1 Results by Route

| Route | Dark Theme Violations | Light Theme Violations | Critical | Serious | Moderate | Minor | Primary Rule IDs |
|---|---|---|---|---|---|---|---|
| `/login` | **0** | **0** | 0 | 0 | 0 | 0 | None (Clean baseline) |
| `/dashboard` | **1** | **1** | 0 | 1 | 0 | 0 | `color-contrast` |
| `/containers` | **3** | **0** | 1 | 2 | 0 | 0 | `button-name`, `link-name`, `color-contrast` |
| `/containers/:id` | **1** | **1** | 0 | 1 | 0 | 0 | `color-contrast` |
| `/logs` | **3** | **3** | 2 | 1 | 0 | 0 | `button-name`, `label`, `color-contrast` |
| `/host` | **0** | **2** | 0 | 2 | 0 | 0 | `aria-progressbar-name`, `color-contrast` |
| `/projects` | **2** | **2** | 1 | 1 | 0 | 0 | `button-name`, `color-contrast` |
| `/events` | **1** | **1** | 0 | 1 | 0 | 0 | `color-contrast` |
| `/alerts` | **3** | **3** | 1 | 2 | 0 | 0 | `button-name`, `aria-input-field-name`, `color-contrast` |
| `/alerts/channels` | **1** | **1** | 0 | 1 | 0 | 0 | `color-contrast` |
| `/resources` | **2** | **2** | 1 | 1 | 0 | 0 | `button-name`, `color-contrast` |
| `/audit` | **2** | **2** | 1 | 1 | 0 | 0 | `button-name`, `color-contrast` |
| `/users` | **2** | **2** | 1 | 1 | 0 | 0 | `button-name`, `color-contrast` |
| `/profile` | **2** | **2** | 1 | 1 | 0 | 0 | `button-name`, `color-contrast` |
| `/settings` | **2** | **2** | 1 | 1 | 0 | 0 | `label`, `color-contrast` |
| `/dev/components` | **1** | **1** | 0 | 1 | 0 | 0 | `aria-prohibited-attr` |

**Total Unique Violation Rules Found**: 7 (`button-name`, `label`, `link-name`, `aria-input-field-name`, `aria-progressbar-name`, `aria-prohibited-attr`, `color-contrast`).

---

## 2. WCAG AA Color Contrast Failure Registry

Every measured contrast failure below the minimum WCAG 2.2 AA requirement (4.5:1 for normal text, 3.0:1 for large text/graphical UI components):

| Route | Element / Selector | Foreground Hex | Background Hex | Measured Ratio | WCAG AA Threshold | Status |
|---|---|---|---|---|---|---|
| `/login` | `.brand-subtitle` (Light) | `#A09EB4` | `#F4F3F8` | **2.76:1** | 4.5:1 | ❌ Failed |
| `/dashboard` | `.metric-label` | `#64748B` | `#0E1017` | **3.42:1** | 4.5:1 | ❌ Failed |
| `/containers` | `.container-uptime` | `#64748B` | `#08090E` | **3.12:1** | 4.5:1 | ❌ Failed |
| `/containers/:id`| `.mat-mdc-tab:not(.mdc-tab--active)` | `#64748B` | `#08090E` | **3.12:1** | 4.5:1 | ❌ Failed |
| `/logs` | `.log-ts` (timestamp column) | `#64748B` | `#08090E` | **3.12:1** | 4.5:1 | ❌ Failed |
| `/host` | `.table-header` (Light theme) | `#94A3B8` | `#FFFFFF` | **2.45:1** | 4.5:1 | ❌ Failed |
| `/projects` | `.status-pill.running` (Light) | `#10B981` | `#FFFFFF` | **2.38:1** | 4.5:1 | ❌ Failed |
| `/projects` | `.status-pill.warning` (Light) | `#F59E0B` | `#FFFFFF` | **2.15:1** | 4.5:1 | ❌ Failed |
| `/events` | `.event-relative-time` | `#475569` | `#0B0D14` | **2.85:1** | 4.5:1 | ❌ Failed |
| `/alerts` | `.rule-threshold-text` | `#64748B` | `#08090E` | **3.12:1** | 4.5:1 | ❌ Failed |
| `/alerts/channels`| `.webhook-url-preview` | `#64748B` | `#08090E` | **3.12:1** | 4.5:1 | ❌ Failed |
| `/resources` | `.resource-size-val` (Light) | `#94A3B8` | `#FFFFFF` | **2.45:1** | 4.5:1 | ❌ Failed |
| `/audit` | `.audit-action-tag` | `#64748B` | `#08090E` | **3.12:1** | 4.5:1 | ❌ Failed |
| `/users` | `.mat-header-cell` (Light) | `#94A3B8` | `#FFFFFF` | **2.45:1** | 4.5:1 | ❌ Failed |
| `/profile` | `.instruction-helper-copy` | `#64748B` | `#08090E` | **3.12:1** | 4.5:1 | ❌ Failed |
| `/settings` | `.setting-help-text` | `#64748B` | `#08090E` | **3.12:1** | 4.5:1 | ❌ Failed |

---

## 3. Keyboard Navigation & Focus Traversal

- **Skip Navigation Link**: Absent. Navigating via keyboard requires tabbing through 12 sidebar items on every page before reaching the main content.
- **Focus Rings**:
  - Present on primary navigation links (`a.nav-item:focus-visible`).
  - Missing on inline action buttons (`.btn-action-icon:focus-visible` has `outline: none`).
  - Missing on password visibility toggle inside `/login`.
- **Focus Trapping in Modals**:
  - MatDialog components (`user-dialog`, `rule-dialog`, `prune-wizard-dialog`) properly trap Tab focus within the active dialog and restore focus to the trigger button upon Escape dismissal.
- **Terminal Key Conflict**:
  - In `/containers/:id` Terminal tab, xterm captures all keyboard inputs. Pressing Escape or Tab cannot escape the xterm canvas without a mouse click outside. A documented escape shortcut (e.g. `Ctrl+Alt+Tab`) is missing.

---

## 4. Screen Reader Semantics & Live Regions

1. **Missing Accessible Names on Critical Action Buttons**:
   - Affects `/containers`, `/logs`, `/projects`, `/alerts`, `/resources`, `/audit`, `/users`, `/profile`.
   - Screen reader announcement: "button" with zero operational context.
2. **Missing Form Labels**:
   - `/logs` search input and `/settings` numeric retention fields omit `<label>` tags and `aria-label` attributes.
3. **Live Region Announcements (`aria-live`)**:
   - New alerts arriving via SSE do NOT announce via `aria-live="polite"` or `role="alert"`. Blind operators are unaware that an alert has fired without manually navigating to `/alerts`.
   - Container state changes (e.g. `dockpilot-redis: restarting -> running`) update silently in the DOM without announcement.

---

## 5. High Contrast & Reduced Motion Support

- **Forced Colors / Windows High Contrast**:
  - Glass panels rely on CSS `background: rgba(...)` which Windows High Contrast mode strips. Borders (`1px solid var(--line)`) survive, but badge fills disappear, making active states indistinguishable without text labels.
- **`prefers-reduced-motion`**:
  - DockPilot implements a global "Quiet Mode" signal in `AtmosphereService`.
  - When the OS setting `prefers-reduced-motion: reduce` is detected, `styles.scss` dampens pulse animations and disables film grain motion, which is a major positive finding.
