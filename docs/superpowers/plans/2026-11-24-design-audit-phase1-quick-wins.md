# Design Audit Phase 1: Quick Wins & Accessibility Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all 14 Severity 1 WCAG 2.2 AA accessibility blockers across DockPilot, isolate the destructive `Compose Down` action, and resolve light-theme contrast failures on Sign In, Host, Compose, and Users.

**Architecture:** Systematic ARIA attribute injection (`[attr.aria-label]`, `aria-label`, `matTooltip`, `[attr.aria-expanded]`, `role="progressbar"`) on interactive controls without visible text, CSS token binding to `var(--text-dim)` for WCAG AA >= 4.5:1 contrast, and visual/operational isolation of destructive Compose actions.

**Tech Stack:** Angular 19, Angular Material, SCSS, Jest, TypeScript.

**Spec:** [docs/superpowers/specs/2026-11-24-design-audit-phase1-quick-wins-design.md](file:///c:/Santosh/Development/dockpilot/docs/superpowers/specs/2026-11-24-design-audit-phase1-quick-wins-design.md)

## Global Constraints
- WCAG 2.2 AA compliance: all icon buttons must pass `button-name`, inputs must pass `label`, links must pass `link-name`, and meters must pass `aria-progressbar-name`.
- Text contrast in light theme must exceed 4.5:1 for standard text and 3:1 for large/bold text.
- No regressions to any of the 379 existing frontend unit tests.
- Zero build warnings or errors on `ng build`.

---

### Task 1: Containers Accessibility Attributes (DF-014, DF-015)

**Files:**
- Modify: `frontend/src/app/features/containers/containers-list.component.html:80-175`
- Test: `frontend/src/app/features/containers/containers-list.component.spec.ts`

**Interfaces:**
- Consumes: `Container` model (`name`, `id`, `state`).
- Produces: Deterministic accessible names for screen readers on all container table row actions and links.

- [ ] **Step 1: Write unit test verifying accessible names in containers list**

In `frontend/src/app/features/containers/containers-list.component.spec.ts`:
```typescript
it('should have explicit aria-label attributes on action buttons and container links', () => {
  const link = fixture.nativeElement.querySelector('.container-name-cell a');
  if (link) {
    expect(link.getAttribute('aria-label')).toContain('View details for container');
  }
  const actionButtons = fixture.nativeElement.querySelectorAll('.actions-cell button');
  actionButtons.forEach((btn: HTMLButtonElement) => {
    expect(btn.getAttribute('aria-label')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd frontend; npx jest src/app/features/containers/containers-list.component.spec.ts -t "should have explicit aria-label"`
Expected: FAIL (missing `aria-label` attributes)

- [ ] **Step 3: Add accessible labels in `containers-list.component.html`**

Update container name link:
```html
<a
  [routerLink]="['/containers', c.id]"
  class="container-link"
  [attr.aria-label]="'View details for container ' + c.name"
>
  {{ c.name }}
</a>
```

Update action buttons:
```html
<button
  mat-icon-button
  *ngIf="c.state !== 'running'"
  (click)="startContainer(c)"
  [attr.aria-label]="'Start container ' + c.name"
  matTooltip="Start container"
>
  <dp-icon name="play" [size]="16"></dp-icon>
</button>

<button
  mat-icon-button
  *ngIf="c.state === 'running'"
  (click)="stopContainer(c)"
  [attr.aria-label]="'Stop container ' + c.name"
  matTooltip="Stop container"
>
  <dp-icon name="square" [size]="14"></dp-icon>
</button>

<button
  mat-icon-button
  (click)="restartContainer(c)"
  [attr.aria-label]="'Restart container ' + c.name"
  matTooltip="Restart container"
>
  <dp-icon name="rotate-cw" [size]="16"></dp-icon>
</button>

<button
  mat-icon-button
  [routerLink]="['/containers', c.id, 'terminal']"
  [attr.aria-label]="'Open terminal for container ' + c.name"
  matTooltip="Terminal"
>
  <dp-icon name="terminal" [size]="16"></dp-icon>
</button>

<button
  mat-icon-button
  [routerLink]="['/logs']"
  [queryParams]="{ container: c.name }"
  [attr.aria-label]="'View logs for container ' + c.name"
  matTooltip="Logs"
>
  <dp-icon name="file-text" [size]="16"></dp-icon>
</button>

<button
  mat-icon-button
  class="btn-delete"
  (click)="deleteContainer(c)"
  [attr.aria-label]="'Delete container ' + c.name"
  matTooltip="Delete container"
>
  <dp-icon name="trash-2" [size]="16"></dp-icon>
</button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend; npx jest src/app/features/containers/containers-list.component.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/containers/containers-list.component.html frontend/src/app/features/containers/containers-list.component.spec.ts
git commit -m "fix(a11y): add accessible names to container links and action buttons (DF-014, DF-015)"
```

---

### Task 2: Logs Explorer & Log Viewer Accessibility (DF-029, DF-030)

**Files:**
- Modify: `frontend/src/app/features/logs/logs-explorer.component.html:40-55`
- Modify: `frontend/src/app/shared/components/log-viewer/log-viewer.component.html:10-45`
- Test: `frontend/src/app/shared/components/log-viewer/log-viewer.component.spec.ts`

**Interfaces:**
- Consumes: Log viewer toolbar state (`isPaused`, `wrapLines`).
- Produces: Accessible names for log search field and playback/action buttons.

- [ ] **Step 1: Write unit test in log viewer test suite**

In `frontend/src/app/shared/components/log-viewer/log-viewer.component.spec.ts`:
```typescript
it('should bind aria-label attributes to stream control buttons', () => {
  const buttons = fixture.nativeElement.querySelectorAll('.viewer-actions button');
  buttons.forEach((btn: HTMLButtonElement) => {
    expect(btn.getAttribute('aria-label')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd frontend; npx jest src/app/shared/components/log-viewer/log-viewer.component.spec.ts -t "should bind aria-label"`
Expected: FAIL

- [ ] **Step 3: Update `logs-explorer.component.html` and `log-viewer.component.html`**

In `frontend/src/app/features/logs/logs-explorer.component.html`:
```html
<input
  type="text"
  class="search-input font-mono"
  aria-label="Search container logs"
  placeholder="Search logs with regex or tokens..."
  [(ngModel)]="searchQuery"
  (keyup.enter)="applySearch()"
/>
```

In `frontend/src/app/shared/components/log-viewer/log-viewer.component.html`:
```html
<button
  type="button"
  class="btn-control"
  [class.active]="isPaused"
  [attr.aria-label]="(isPaused ? 'Resume' : 'Pause') + ' log streaming'"
  [matTooltip]="isPaused ? 'Resume streaming' : 'Pause streaming'"
  (click)="togglePause()"
>
  <dp-icon [name]="isPaused ? 'play' : 'pause'" [size]="14"></dp-icon>
</button>

<button
  type="button"
  class="btn-control"
  [class.active]="wrapLines"
  [attr.aria-label]="(wrapLines ? 'Disable' : 'Enable') + ' line wrapping'"
  [matTooltip]="wrapLines ? 'Disable line wrap' : 'Enable line wrap'"
  (click)="toggleWrap()"
>
  <dp-icon name="align-left" [size]="14"></dp-icon>
</button>

<button
  type="button"
  class="btn-control"
  aria-label="Scroll to bottom of log stream"
  matTooltip="Scroll to bottom"
  (click)="scrollToBottom()"
>
  <dp-icon name="arrow-down" [size]="14"></dp-icon>
</button>

<button
  type="button"
  class="btn-control"
  aria-label="Download log stream"
  matTooltip="Download logs"
  (click)="downloadLogs()"
>
  <dp-icon name="download" [size]="14"></dp-icon>
</button>

<button
  type="button"
  class="btn-control btn-clear"
  aria-label="Clear visible logs"
  matTooltip="Clear logs"
  (click)="clearLogs()"
>
  <dp-icon name="trash-2" [size]="14"></dp-icon>
</button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend; npx jest src/app/shared/components/log-viewer/log-viewer.component.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/logs/logs-explorer.component.html frontend/src/app/shared/components/log-viewer/log-viewer.component.html frontend/src/app/shared/components/log-viewer/log-viewer.component.spec.ts
git commit -m "fix(a11y): add accessible labels to log search and stream controls (DF-029, DF-030)"
```

---

### Task 3: Host Server Progress Gauges & Light Theme Process Headers (DF-036, DF-037)

**Files:**
- Modify: `frontend/src/app/features/host/host.component.html:120-160`
- Modify: `frontend/src/app/features/host/host.component.scss:180-200`
- Test: `frontend/src/app/features/host/host.component.spec.ts`

**Interfaces:**
- Consumes: Host metrics signals (`cpu_percent`, `memory_percent`, `disk_percent`).
- Produces: Accessible names on gauge meters and WCAG AA contrast on process table headers.

- [ ] **Step 1: Write unit test in host component test suite**

In `frontend/src/app/features/host/host.component.spec.ts`:
```typescript
it('should have aria-label attributes on progressbar elements', () => {
  const progressBars = fixture.nativeElement.querySelectorAll('[role="progressbar"]');
  progressBars.forEach((bar: HTMLElement) => {
    expect(bar.getAttribute('aria-label')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd frontend; npx jest src/app/features/host/host.component.spec.ts -t "should have aria-label attributes on progressbar"`
Expected: FAIL

- [ ] **Step 3: Add `aria-label` in `host.component.html` and update SCSS**

In `frontend/src/app/features/host/host.component.html`:
```html
<div
  class="gauge-circle"
  role="progressbar"
  aria-label="Host CPU utilization"
  [attr.aria-valuenow]="metrics().cpu_percent"
  aria-valuemin="0"
  aria-valuemax="100"
>
  ...
</div>

<div
  class="gauge-circle"
  role="progressbar"
  aria-label="Host memory utilization"
  [attr.aria-valuenow]="metrics().memory_percent"
  aria-valuemin="0"
  aria-valuemax="100"
>
  ...
</div>

<div
  class="gauge-circle"
  role="progressbar"
  aria-label="Host disk storage utilization"
  [attr.aria-valuenow]="metrics().disk_percent"
  aria-valuemin="0"
  aria-valuemax="100"
>
  ...
</div>
```

In `frontend/src/app/features/host/host.component.scss`:
```scss
th.mat-mdc-header-cell,
.process-table-header {
  color: var(--text-dim);
  font-weight: 700;
  letter-spacing: 0.08em;
  background: var(--bg-2);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend; npx jest src/app/features/host/host.component.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/host/host.component.html frontend/src/app/features/host/host.component.scss frontend/src/app/features/host/host.component.spec.ts
git commit -m "fix(a11y): add aria-label to host progressbars and fix process header contrast (DF-036, DF-037)"
```

---

### Task 4: Compose Projects Safety Isolation & Badge Contrast (DF-043, DF-045, DF-046)

**Files:**
- Modify: `frontend/src/app/features/compose/compose-projects.component.html:80-120`
- Modify: `frontend/src/app/features/compose/compose-projects.component.scss:110-180`
- Modify: `frontend/src/app/features/compose/compose-projects.component.ts:130-145`
- Test: `frontend/src/app/features/compose/compose-projects.component.spec.ts`

**Interfaces:**
- Consumes: Compose project state (`downProject`, `name`).
- Produces: Accessible names, isolated crimson Down button with confirmation check, high contrast badges.

- [ ] **Step 1: Write unit test in compose component test suite**

In `frontend/src/app/features/compose/compose-projects.component.spec.ts`:
```typescript
it('should have explicit aria-label on compose action buttons and confirm before down', () => {
  const buttons = fixture.nativeElement.querySelectorAll('.actions-cluster button');
  buttons.forEach((btn: HTMLButtonElement) => {
    expect(btn.getAttribute('aria-label')).toBeTruthy();
  });

  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
  const downSpy = jest.spyOn(component.store, 'downProject');
  component.onDownProject('test-stack');
  expect(confirmSpy).toHaveBeenCalled();
  expect(downSpy).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd frontend; npx jest src/app/features/compose/compose-projects.component.spec.ts -t "should have explicit aria-label"`
Expected: FAIL

- [ ] **Step 3: Implement template, style, and component changes**

In `frontend/src/app/features/compose/compose-projects.component.html`:
```html
<div class="actions-cluster">
  <!-- Benign actions -->
  <button
    type="button"
    class="action-btn"
    [attr.aria-label]="'Compose Up for project ' + p.name"
    matTooltip="Compose Up"
    (click)="store.upProject(p.name)"
  >
    <dp-icon name="play" [size]="14"></dp-icon>
    <span>Up</span>
  </button>

  <button
    type="button"
    class="action-btn"
    [attr.aria-label]="'Restart project ' + p.name"
    matTooltip="Restart all services"
    (click)="store.restartProject(p.name)"
  >
    <dp-icon name="rotate-cw" [size]="14"></dp-icon>
    <span>Restart</span>
  </button>

  <button
    type="button"
    class="action-btn"
    [attr.aria-label]="'Pull images for project ' + p.name"
    matTooltip="Pull latest images"
    (click)="store.pullProject(p.name)"
  >
    <dp-icon name="download-cloud" [size]="14"></dp-icon>
    <span>Pull</span>
  </button>

  <!-- Destructive action separator -->
  <span class="action-divider"></span>

  <button
    type="button"
    class="action-btn btn-danger"
    [attr.aria-label]="'Tear down all containers and networks for project ' + p.name"
    [matTooltip]="'Tear down all containers and networks for ' + p.name"
    (click)="onDownProject(p.name)"
  >
    <dp-icon name="square" [size]="14"></dp-icon>
    <span>Down</span>
  </button>
</div>
```

In `frontend/src/app/features/compose/compose-projects.component.ts`:
```typescript
onDownProject(projectName: string): void {
  if (confirm(`Tear down all containers, networks, and services for project '${projectName}'?`)) {
    this.store.downProject(projectName);
  }
}
```

In `frontend/src/app/features/compose/compose-projects.component.scss`:
```scss
.action-divider {
  width: 1px;
  height: 20px;
  background: var(--line);
  margin: 0 4px;
}

.action-btn.btn-danger {
  color: var(--status-critical, #e11d48);
  border-color: rgba(244, 63, 94, 0.35);

  &:hover {
    background: rgba(244, 63, 94, 0.12);
    border-color: var(--status-critical, #e11d48);
  }
}

/* Light Theme Contrast Enhancements */
[data-theme='light'],
:root:not([data-theme='dark']) {
  .service-count-chip {
    color: var(--text-dim);
    background: var(--bg-2);
    border-color: var(--line);
  }

  .status-badge.running {
    color: #047857;
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.35);
  }

  .status-badge.degraded {
    color: #b45309;
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.35);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend; npx jest src/app/features/compose/compose-projects.component.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/compose/
git commit -m "fix(a11y,safety): isolate compose down, add aria-labels, and fix light theme contrast (DF-043, DF-045, DF-046)"
```

---

### Task 5: Alerts, Audit, and Resources Accessible Names (DF-057, DF-058, DF-070, DF-077)

**Files:**
- Modify: `frontend/src/app/features/alerts/alerts.component.html:140-195`
- Modify: `frontend/src/app/features/audit/audit.component.html:70-95`
- Modify: `frontend/src/app/features/resources/resources.component.html:195-215, 325-345, 455-475`
- Test: `frontend/src/app/features/alerts/alerts.component.spec.ts`
- Test: `frontend/src/app/features/audit/audit.component.spec.ts`
- Test: `frontend/src/app/features/resources/resources.component.spec.ts`

**Interfaces:**
- Consumes: Alert rules, audit log entries, resources lists.
- Produces: Accessible names for rule toggles, action buttons, audit detail toggles, and resource deletions.

- [ ] **Step 1: Write unit tests in alerts and audit test suites**

In `frontend/src/app/features/alerts/alerts.component.spec.ts`:
```typescript
it('should render aria-label on slide toggle and rule action buttons', () => {
  const toggles = fixture.nativeElement.querySelectorAll('mat-slide-toggle');
  toggles.forEach((t: HTMLElement) => expect(t.getAttribute('aria-label')).toBeTruthy());
});
```

In `frontend/src/app/features/audit/audit.component.spec.ts`:
```typescript
it('should render aria-label and aria-expanded on details toggle button', () => {
  const expandBtns = fixture.nativeElement.querySelectorAll('.btn-expand');
  expandBtns.forEach((btn: HTMLButtonElement) => {
    expect(btn.getAttribute('aria-label')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify failures**

Run: `cd frontend; npx jest src/app/features/alerts/alerts.component.spec.ts src/app/features/audit/audit.component.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement accessible attributes**

In `frontend/src/app/features/alerts/alerts.component.html`:
```html
<mat-slide-toggle
  [checked]="!rule.is_silenced"
  [attr.aria-label]="(rule.is_silenced ? 'Unsilence' : 'Silence') + ' alert rule ' + rule.name"
  (change)="toggleSilence(rule)"
>
</mat-slide-toggle>

<button
  mat-icon-button
  [attr.aria-label]="'Edit alert rule ' + rule.name"
  matTooltip="Edit rule"
  (click)="editRule(rule)"
>
  <dp-icon name="edit-2" [size]="16"></dp-icon>
</button>

<button
  mat-icon-button
  [attr.aria-label]="'Delete alert rule ' + rule.name"
  matTooltip="Delete rule"
  (click)="deleteRule(rule)"
>
  <dp-icon name="trash-2" [size]="16"></dp-icon>
</button>
```

In `frontend/src/app/features/audit/audit.component.html`:
```html
<button
  mat-icon-button
  class="btn-expand"
  [attr.aria-label]="(isExpanded(entry.id) ? 'Collapse' : 'Expand') + ' details for event ' + entry.id"
  [attr.aria-expanded]="isExpanded(entry.id)"
  (click)="toggleExpand(entry.id)"
>
  <dp-icon [name]="isExpanded(entry.id) ? 'chevron-down' : 'chevron-right'" [size]="16"></dp-icon>
</button>
```

In `frontend/src/app/features/resources/resources.component.html`:
```html
<!-- Images delete -->
<button
  mat-icon-button
  class="action-btn-delete"
  [attr.aria-label]="'Delete image ' + (img.tags[0] || img.short_id)"
  [matTooltip]="img.is_protected ? 'Image is protected by configuration' : img.is_in_use ? 'Cannot remove image in use by containers' : 'Remove image'"
  (click)="deleteImage(img.id, img.tags[0] || img.short_id)"
>
  <mat-icon>delete_outline</mat-icon>
</button>

<!-- Volumes delete -->
<button
  mat-icon-button
  class="action-btn-delete"
  [attr.aria-label]="'Delete volume ' + vol.name"
  [matTooltip]="vol.is_protected ? 'Volume is protected by configuration' : vol.is_in_use ? 'Cannot remove volume in use by containers' : 'Remove volume'"
  (click)="deleteVolume(vol.name)"
>
  <mat-icon>delete_outline</mat-icon>
</button>

<!-- Networks delete -->
<button
  mat-icon-button
  class="action-btn-delete"
  [attr.aria-label]="'Delete network ' + net.name"
  [matTooltip]="net.is_built_in ? 'Built-in Docker networks cannot be removed' : net.is_protected ? 'Network is protected by configuration' : net.is_in_use ? 'Cannot remove network with connected containers' : 'Remove network'"
  (click)="deleteNetwork(net.id, net.name)"
>
  <mat-icon>delete_outline</mat-icon>
</button>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend; npx jest src/app/features/alerts/alerts.component.spec.ts src/app/features/audit/audit.component.spec.ts src/app/features/resources/resources.component.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/alerts/ frontend/src/app/features/audit/ frontend/src/app/features/resources/
git commit -m "fix(a11y): add accessible names to alert rules, audit toggles, and resource deletions (DF-057, DF-058, DF-070, DF-077)"
```

---

### Task 6: Users, Profile, Settings, Login, and Dev Gallery (DF-001, DF-084, DF-087, DF-091, DF-097, DF-104)

**Files:**
- Modify: `frontend/src/app/features/auth/login.component.scss:120-130`
- Modify: `frontend/src/app/features/users/users.component.html:105-135`
- Modify: `frontend/src/app/features/users/users.component.scss:60-75`
- Modify: `frontend/src/app/features/profile/profile.component.html:140-155`
- Modify: `frontend/src/app/features/settings/settings.component.html:140-170`
- Modify: `frontend/src/app/features/dev/components-gallery.component.html:10-25`
- Test: `frontend/src/app/features/users/users.component.spec.ts`
- Test: `frontend/src/app/features/profile/profile.component.spec.ts`
- Test: `frontend/src/app/features/settings/settings.component.spec.ts`

**Interfaces:**
- Consumes: Users table, profile sessions, settings models.
- Produces: Accessible names for users actions, profile revocation, settings inputs; invalid ARIA cleanup; light theme contrast fix.

- [ ] **Step 1: Write unit tests in users and profile suites**

In `frontend/src/app/features/users/users.component.spec.ts`:
```typescript
it('should have aria-label on user table action buttons', () => {
  const buttons = fixture.nativeElement.querySelectorAll('.actions-cell button');
  buttons.forEach((btn: HTMLButtonElement) => expect(btn.getAttribute('aria-label')).toBeTruthy());
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd frontend; npx jest src/app/features/users/users.component.spec.ts -t "should have aria-label"`
Expected: FAIL

- [ ] **Step 3: Implement template and styling fixes**

In `frontend/src/app/features/auth/login.component.scss`:
```scss
.brand-subtitle {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--text-dim);
  margin: 0;
}
```

In `frontend/src/app/features/users/users.component.html`:
```html
<button
  mat-icon-button
  [attr.aria-label]="'Edit role for user ' + u.username"
  matTooltip="Edit role"
  (click)="openRoleDialog(u)"
>
  <dp-icon name="user-check" [size]="16"></dp-icon>
</button>

<button
  mat-icon-button
  [attr.aria-label]="'Reset password for user ' + u.username"
  matTooltip="Reset password"
  (click)="openPasswordDialog(u)"
>
  <dp-icon name="key" [size]="16"></dp-icon>
</button>

<button
  mat-icon-button
  [attr.aria-label]="'Deactivate user ' + u.username"
  matTooltip="Deactivate user"
  (click)="toggleUserActive(u)"
>
  <dp-icon name="user-x" [size]="16"></dp-icon>
</button>
```

In `frontend/src/app/features/users/users.component.scss`:
```scss
th.mat-mdc-header-cell {
  color: var(--text-dim);
  font-weight: 700;
  letter-spacing: 0.08em;
}
```

In `frontend/src/app/features/profile/profile.component.html`:
```html
<button
  mat-icon-button
  class="btn-revoke"
  [attr.aria-label]="'Revoke session from ' + s.ip_address"
  matTooltip="Revoke session"
  (click)="revokeSession(s.id)"
>
  <dp-icon name="x-circle" [size]="16"></dp-icon>
</button>
```

In `frontend/src/app/features/settings/settings.component.html`:
```html
<input
  matInput
  type="number"
  aria-label="Metrics retention period in days"
  [(ngModel)]="settings.metrics_retention_days"
  name="metrics_retention"
/>

<input
  matInput
  type="number"
  aria-label="Event log retention period in days"
  [(ngModel)]="settings.events_retention_days"
  name="events_retention"
/>
```

In `frontend/src/app/features/dev/components-gallery.component.html`:
Remove invalid `aria-valuenow` from static non-progressbar container tags.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend; npx jest src/app/features/users/users.component.spec.ts src/app/features/profile/profile.component.spec.ts src/app/features/settings/settings.component.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/auth/ frontend/src/app/features/users/ frontend/src/app/features/profile/ frontend/src/app/features/settings/ frontend/src/app/features/dev/
git commit -m "fix(a11y,contrast): complete Phase 1 quick wins across users, profile, settings, and login (DF-001, DF-084, DF-087, DF-091, DF-097, DF-104)"
```

---

### Task 7: Full Test Suite Verification, Production Build, and Push

**Files:**
- Test: All 87 test suites in `frontend/src/`
- Build: `frontend/dist/`

- [ ] **Step 1: Run complete frontend unit test suite**

Run: `cd frontend; npm test`
Expected: 87/87 suites passed, 379/379 tests passed.

- [ ] **Step 2: Run production bundle build**

Run: `cd frontend; npm run build`
Expected: Exit code 0, 0 build errors.

- [ ] **Step 3: Update knowledge graph**

Run: `graphify update .`

- [ ] **Step 4: Push to origin and monitor CI**

```bash
git push origin master
gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId') --exit-status
```
Expected: All CI jobs green.
