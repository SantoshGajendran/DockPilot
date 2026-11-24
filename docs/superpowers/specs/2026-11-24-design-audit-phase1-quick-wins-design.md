# Design Specification: Design Audit Phase 1 — Quick Wins & Accessibility Blockers

**Date:** 2026-11-24  
**Status:** Approved  
**Author:** Antigravity  
**Audit Reference:** [docs/design-audit/00-SUMMARY.md](file:///c:/Santosh/Development/dockpilot/docs/design-audit/00-SUMMARY.md), [docs/design-audit/08-roadmap.md](file:///c:/Santosh/Development/dockpilot/docs/design-audit/08-roadmap.md)

---

## 1. Overview & Objective

The Presentation Layer Design Audit identified 82 findings across DockPilot's 16 routes. Phase 1 targets immediate resolution of all **14 Severity 1 (Blocker)** accessibility and operational safety hazards, alongside urgent **Severity 2** light-theme contrast failures.

This milestone ensures:
1. Universal WCAG 2.2 AA screen reader accessibility on all action buttons, form inputs, links, and progress meters.
2. Complete operational safety isolation for destructive stack operations (`Compose Down`).
3. High-contrast typography (> 4.5:1) in light theme across Sign In, Host Process Explorer, Compose Projects, and User Management.

---

## 2. Scope & Target Findings

| Finding ID | Route | Component / Scope | Issue Description | Remediation |
|---|---|---|---|---|
| **DF-014** | `/containers` | `containers-list.component.html` | Action buttons (Start, Stop, Restart, Terminal, Logs, Delete) lack accessible names | Add `[attr.aria-label]="action + ' container ' + c.name"` and `matTooltip` |
| **DF-015** | `/containers` | `containers-list.component.html` | Container anchor link fails accessible name calculation when truncated | Add `[attr.aria-label]="'View details for container ' + c.name"` |
| **DF-029** | `/logs` | `logs-explorer.component.html` | Primary log search input missing accessible label | Add `aria-label="Search container logs"` |
| **DF-030** | `/logs` | `log-viewer.component.html` | Stream toolbar icon buttons (Pause/Wrap/Clear/Download/Scroll) unlabelled | Add `[attr.aria-label]` and `matTooltip` on each action button |
| **DF-036** | `/host` | `host.component.html` | Custom CPU, Memory, Disk progress gauges lack accessible name | Add explicit `aria-label` to each `role="progressbar"` element |
| **DF-043** | `/projects` | `compose-projects.component.html` | Compose stack action buttons render icons without accessible text | Add `[attr.aria-label]="action.name + ' for project ' + p.name"` and tooltips |
| **DF-045** | `/projects` | `compose-projects.component.html` | Destructive `Compose Down` sits adjacent to `Restart` with neutral styling | Visually isolate with divider, crimson `.btn-danger` styling, warning tooltip, and confirmation check |
| **DF-057** | `/alerts` | `alerts.component.html` | Alert silence slide toggle missing accessible name | Add `[attr.aria-label]="'Silence alert rule ' + rule.name"` on `<mat-slide-toggle>` |
| **DF-058** | `/alerts` | `alerts.component.html` | Rule card action buttons (Edit, Delete, Test) lack accessible text | Add `[attr.aria-label]="action.label + ' for rule ' + rule.name"` |
| **DF-070** | `/resources` | `resources.component.html` | Image, volume, and network delete icon buttons lack accessible text | Add explicit `[attr.aria-label]` on each delete button |
| **DF-077** | `/audit` | `audit.component.html` | JSON payload chevron expander lacks accessible name and state | Add `[attr.aria-label]="'Toggle details for event ' + entry.id"` and `[attr.aria-expanded]` |
| **DF-084** | `/users` | `users.component.html` | Table action buttons (Edit Role, Reset Password, Deactivate) unlabelled | Add `[attr.aria-label]="action.label + ' for user ' + u.username"` |
| **DF-091** | `/profile` | `profile.component.html` | Active session revoke trash icon button unlabelled | Add `[attr.aria-label]="'Revoke session from ' + s.ip_address"` |
| **DF-097** | `/settings` | `settings.component.html` | Numeric retention settings fields unlabelled | Add explicit `aria-label` attributes to metric and audit retention inputs |
| **DF-104** | `/dev/components`| `components-gallery.component.html` | Static showcase element renders invalid `aria-valuenow` | Remove invalid ARIA attribute from non-interactive container |
| **DF-001** | `/login` | `login.component.scss` | Brand subtitle renders 2.76:1 contrast in light mode | Bind `.brand-subtitle` to `var(--text-dim)` (>= 5.8:1 contrast) |
| **DF-037** | `/host` | `host.component.scss` | Process table column headers render 2.45:1 contrast in light mode | Bind header text to `var(--text-dim)` |
| **DF-046** | `/projects` | `compose-projects.component.scss`| Service running chips render 2.15:1 contrast in light mode | Bind `.service-count-chip` and status badges in light theme to dark-calibrated green/amber tokens |
| **DF-087** | `/users` | `users.component.scss` | Users table headers render 2.45:1 contrast in light mode | Bind column headers to `var(--text-dim)` |

---

## 3. Detailed Component Technical Specifications

### 3.1. Accessibility Attribute Standards (A11Y)
All icon-only buttons (`mat-icon-button` or custom button classes) must adhere to the pattern:
```html
<button
  type="button"
  class="action-btn"
  [attr.aria-label]="actionTitle + ' for ' + entityName"
  [matTooltip]="actionTitle"
  (click)="executeAction()"
>
  <mat-icon>{{ iconName }}</mat-icon>
</button>
```

#### Containers Action Grid (`containers-list.component.html`):
- Start: `[attr.aria-label]="'Start container ' + c.name"`
- Stop: `[attr.aria-label]="'Stop container ' + c.name"`
- Restart: `[attr.aria-label]="'Restart container ' + c.name"`
- Terminal: `[attr.aria-label]="'Open terminal for container ' + c.name"`
- Logs: `[attr.aria-label]="'View logs for container ' + c.name"`
- Delete: `[attr.aria-label]="'Delete container ' + c.name"`
- Name Link: `[attr.aria-label]="'View details for container ' + c.name"`

#### Log Viewer Controls (`log-viewer.component.html`):
- Pause/Resume: `[attr.aria-label]="(isPaused ? 'Resume' : 'Pause') + ' log streaming'"`
- Wrap: `[attr.aria-label]="(wrapLines ? 'Disable' : 'Enable') + ' line wrapping'"`
- Clear: `aria-label="Clear visible logs"`
- Scroll: `aria-label="Scroll to bottom of log stream"`
- Download: `aria-label="Download log stream"`

#### Host Progress Gauges (`host.component.html`):
- CPU: `role="progressbar" aria-label="Host CPU utilization" [attr.aria-valuenow]="metrics.cpu_percent"`
- Memory: `role="progressbar" aria-label="Host memory utilization" [attr.aria-valuenow]="metrics.memory_percent"`
- Disk: `role="progressbar" aria-label="Host disk storage utilization" [attr.aria-valuenow]="metrics.disk_percent"`

---

### 3.2. Operational Safety: Compose Down Isolation (DF-045)
In [compose-projects.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/compose/compose-projects.component.html) and [compose-projects.component.scss](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/compose/compose-projects.component.scss):

1. **Visual Separation**:
   - Benign action cluster: `Up`, `Restart`, `Pull`, `Start`, `Stop`.
   - Right-side separated destructive cluster: `Down`.
   - Separated by an inline divider `<span class="action-divider"></span>`.
2. **Styling**:
   - `button.btn-danger`: crimson accent (`color: var(--status-critical, #e11d48)`), distinct background tint on hover (`rgba(244, 63, 94, 0.12)`), red border.
3. **Friction / Guard**:
   - Tooltip: `"Tear down all containers and networks for " + p.name`.
   - In `compose-projects.component.ts`, `downProject(name: string)` prompts confirmation if not already present or confirms intent before proceeding:
     `if (!confirm('Tear down all containers, networks, and services for project ' + name + '?')) return;`.

---

### 3.3. WCAG AA Contrast Adjustments (Light Theme)
In `frontend/src/styles/theme.scss` and component stylesheets:

1. **Login Subtitle (`login.component.scss`)**:
   - Bind `.brand-subtitle` to `var(--text-dim)`.
   - Ensure `--text-dim` in light theme resolves to `#475569` (contrast ratio 5.8:1 on `#F8FAFC`).
2. **Host Process Table Headers (`host.component.scss`)**:
   - Update `th.mat-header-cell` and `.process-header`:
     `color: var(--text-dim); font-weight: 700;`.
3. **Compose Status Badges (`compose-projects.component.scss`)**:
   - In light theme:
     - Running: `color: #047857; background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.35);` (contrast 4.9:1).
     - Degraded/Warning: `color: #B45309; background: rgba(245, 158, 11, 0.12); border-color: rgba(245, 158, 11, 0.35);` (contrast 5.1:1).
4. **Users Table Column Headers (`users.component.scss`)**:
   - Update `th.mat-header-cell`:
     `color: var(--text-dim); font-weight: 700;`.

---

## 4. Files Touched

1. [frontend/src/app/features/containers/containers-list.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/containers/containers-list.component.html)
2. [frontend/src/app/features/logs/logs-explorer.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/logs/logs-explorer.component.html)
3. [frontend/src/app/shared/components/log-viewer/log-viewer.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/shared/components/log-viewer/log-viewer.component.html)
4. [frontend/src/app/features/host/host.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/host/host.component.html)
5. [frontend/src/app/features/host/host.component.scss](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/host/host.component.scss)
6. [frontend/src/app/features/compose/compose-projects.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/compose/compose-projects.component.html)
7. [frontend/src/app/features/compose/compose-projects.component.scss](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/compose/compose-projects.component.scss)
8. [frontend/src/app/features/compose/compose-projects.component.ts](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/compose/compose-projects.component.ts)
9. [frontend/src/app/features/alerts/alerts.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/alerts/alerts.component.html)
10. [frontend/src/app/features/resources/resources.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/resources/resources.component.html)
11. [frontend/src/app/features/audit/audit.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/audit/audit.component.html)
12. [frontend/src/app/features/users/users.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/users/users.component.html)
13. [frontend/src/app/features/users/users.component.scss](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/users/users.component.scss)
14. [frontend/src/app/features/profile/profile.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/profile/profile.component.html)
15. [frontend/src/app/features/settings/settings.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/settings/settings.component.html)
16. [frontend/src/app/features/dev/components-gallery.component.html](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/dev/components-gallery.component.html)
17. [frontend/src/app/features/auth/login.component.scss](file:///c:/Santosh/Development/dockpilot/frontend/src/app/features/auth/login.component.scss)

---

## 5. Verification & Testing

1. **Automated Unit Testing**:
   - Run `npm test` across all 87 test suites.
   - Confirm 379/379 tests pass with zero regressions.
2. **Production Bundle Build**:
   - Run `ng build` and confirm exit code 0.
3. **Accessibility Inspection**:
   - Verify all quick-action icon buttons pass `button-name` rule.
   - Verify all search and setting inputs pass `label` rule.
   - Verify all custom meters pass `aria-progressbar-name`.
4. **Contrast Verification**:
   - Confirm contrast ratios in light theme on Login, Host, Projects, and Users exceed 4.5:1.
