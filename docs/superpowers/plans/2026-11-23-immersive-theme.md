# DockPilot Immersive UI & Dual-Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform DockPilot into an immersive, premium, Linear/Apple-inspired monitoring workstation with complete, seamless dual-theme (Dark Obsidian & Crisp Paper Light) support, 3-way theme switching, tactile feedback, and reactive Chart/terminal re-theming.

**Architecture:** A semantic CSS custom property token system in `styles/theme.scss` bridges Angular Material and custom components across `:root` / `.dark-theme` and `.light-theme`. An Angular 19 signal-based `ThemeService` manages 3-way mode preference (`system | dark | light`), synchronizes with OS media queries, and persists to `localStorage`. Chart.js and xterm.js reactively adapt to active theme shifts without UI restarts.

**Tech Stack:** Angular 19 (Standalone Components, Signals, Computed, Effects), SCSS, Angular Material, Chart.js via ng2-charts, xterm.js, Jest.

**Spec:** [docs/superpowers/specs/2026-11-23-immersive-theme-design.md](file:///c:/Santosh/Development/dockpilot/docs/superpowers/specs/2026-11-23-immersive-theme-design.md)

## Global Constraints
- Design Philosophy: Apple Desktop & Linear Pro DevOps craft.
- Theme Options: 3-way (`system`, `dark`, `light`).
- No new external runtime npm libraries.
- All 301 existing frontend Jest tests and production `ng build` must continue to pass with 0 warnings.
- Full `@media (prefers-reduced-motion: reduce)` accessibility coverage.

---

### Task 1: Semantic Design Tokens & Theme Palettes

**Files:**
- Modify: `frontend/src/styles/theme.scss`
- Modify: `frontend/src/styles.scss`

**Interfaces:**
- Produces: CSS custom properties (`--bg-canvas`, `--bg-surface`, `--bg-surface-elevated`, `--bg-surface-hover`, `--border-subtle`, `--border-highlight`, `--text-primary`, `--text-secondary`, `--text-muted`, `--accent-primary`, `--accent-glow`, `--status-running-halo`, `--shadow-ambient`, `--shadow-lifted`) for `:root`, `.dark-theme`, and `.light-theme`.

- [ ] **Step 1: Update `frontend/src/styles/theme.scss` with complete dual palettes and Material bridge**

```scss
@use '@angular/material' as mat;

:root,
.dark-theme {
  color-scheme: dark;

  /* Backgrounds */
  --bg-canvas: #080c14;
  --bg-surface: rgba(15, 23, 42, 0.85);
  --bg-surface-solid: #0f172a;
  --bg-surface-elevated: #1e293b;
  --bg-surface-hover: rgba(255, 255, 255, 0.05);

  /* Borders & Dividers */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-highlight: rgba(255, 255, 255, 0.14);
  --border-color: var(--border-subtle);

  /* Typography */
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;

  /* Accents & Brand */
  --primary-color: #3b82f6;
  --primary-hover: #60a5fa;
  --accent-glow: 0 0 20px rgba(59, 130, 246, 0.25);

  /* Semantic Workload States */
  --status-running: #10b981;
  --status-running-halo: rgba(16, 185, 129, 0.25);
  --status-danger: #ef4444;
  --status-warning: #f59e0b;
  --status-paused: #06b6d4;

  /* Elevation Shadows */
  --shadow-ambient: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
  --shadow-lifted: 0 12px 30px -4px rgba(0, 0, 0, 0.65);

  /* Backward Compatibility Aliases */
  --background-color: var(--bg-canvas);
  --surface-color: var(--bg-surface-solid);
  --surface-hover: var(--bg-surface-hover);
  --success-color: var(--status-running);
  --warning-color: var(--status-warning);
  --danger-color: var(--status-danger);
  --info-color: var(--status-paused);

  /* Angular Material Component Overrides */
  --mat-sidenav-container-background-color: var(--bg-canvas);
  --mat-toolbar-container-background-color: var(--bg-surface);
  --mat-toolbar-container-text-color: var(--text-primary);
  --mat-sidenav-content-background-color: var(--bg-canvas);
  --mat-card-container-background-color: var(--bg-surface);
  --mat-card-container-text-color: var(--text-primary);
}

.light-theme {
  color-scheme: light;

  /* Backgrounds */
  --bg-canvas: #f8fafc;
  --bg-surface: rgba(255, 255, 255, 0.9);
  --bg-surface-solid: #ffffff;
  --bg-surface-elevated: #f1f5f9;
  --bg-surface-hover: rgba(15, 23, 42, 0.04);

  /* Borders & Dividers */
  --border-subtle: rgba(15, 23, 42, 0.08);
  --border-highlight: rgba(255, 255, 255, 0.8);
  --border-color: var(--border-subtle);

  /* Typography */
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-muted: #94a3b8;

  /* Accents & Brand */
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --accent-glow: 0 0 20px rgba(37, 99, 235, 0.18);

  /* Semantic Workload States */
  --status-running: #059669;
  --status-running-halo: rgba(5, 150, 105, 0.2);
  --status-danger: #dc2626;
  --status-warning: #d97706;
  --status-paused: #0891b2;

  /* Elevation Shadows */
  --shadow-ambient: 0 1px 3px rgba(0, 0, 0, 0.05), 0 8px 24px -4px rgba(0, 0, 0, 0.04);
  --shadow-lifted: 0 12px 32px -4px rgba(0, 0, 0, 0.08);

  /* Backward Compatibility Aliases */
  --background-color: var(--bg-canvas);
  --surface-color: var(--bg-surface-solid);
  --surface-hover: var(--bg-surface-hover);
  --success-color: var(--status-running);
  --warning-color: var(--status-warning);
  --danger-color: var(--status-danger);
  --info-color: var(--status-paused);

  /* Angular Material Component Overrides */
  --mat-sidenav-container-background-color: var(--bg-canvas);
  --mat-toolbar-container-background-color: var(--bg-surface);
  --mat-toolbar-container-text-color: var(--text-primary);
  --mat-sidenav-content-background-color: var(--bg-canvas);
  --mat-card-container-background-color: var(--bg-surface);
  --mat-card-container-text-color: var(--text-primary);
}
```

- [ ] **Step 2: Update `frontend/src/styles.scss` with global tactile reset and reduced-motion block**

```scss
@use './styles/theme.scss' as *;
@import '@xterm/xterm/css/xterm.css';

html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: var(--bg-canvas);
  color: var(--text-primary);
  transition: background-color 200ms ease-out, color 150ms ease-out;
}

* {
  box-sizing: border-box;
}

/* Tactile button press feedback */
button.mat-mdc-button,
button.mat-mdc-unelevated-button,
button.mat-mdc-raised-button,
button.mat-mdc-outlined-button,
button.mat-mdc-icon-button {
  transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 150ms ease-out;

  &:active:not([disabled]) {
    transform: scale(0.97);
  }
}

/* Reduced Motion Safety */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 3: Verify build passes with updated styles**

Run: `npm run build --prefix frontend`
Expected: Build succeeds with 0 errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/styles/theme.scss frontend/src/styles.scss
git commit -m "style: define dual-theme semantic design tokens and tactile micro-interaction styles"
```

---

### Task 2: Theme Service & State Management

**Files:**
- Create: `frontend/src/app/core/services/theme.service.ts`
- Create: `frontend/src/app/core/services/theme.service.spec.ts`

**Interfaces:**
- Produces: `ThemeService` with:
  - `readonly mode: Signal<ThemeMode>`
  - `readonly activeTheme: Signal<ActiveTheme>`
  - `setMode(mode: ThemeMode): void`

- [ ] **Step 1: Write unit tests in `frontend/src/app/core/services/theme.service.spec.ts`**

```typescript
import { TestBed } from '@angular/core/testing';
import { ThemeService, ThemeMode } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    TestBed.configureTestingModule({
      providers: [ThemeService]
    });
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('should be created and default to system mode when no storage exists', () => {
    expect(service).toBeTruthy();
    expect(service.mode()).toBe('system');
  });

  it('should set dark mode and apply .dark-theme to documentElement', () => {
    service.setMode('dark');
    expect(service.mode()).toBe('dark');
    expect(service.activeTheme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark-theme')).toBe(true);
    expect(document.documentElement.classList.contains('light-theme')).toBe(false);
    expect(localStorage.getItem('dockpilot_theme_mode')).toBe('dark');
  });

  it('should set light mode and apply .light-theme to documentElement', () => {
    service.setMode('light');
    expect(service.mode()).toBe('light');
    expect(service.activeTheme()).toBe('light');
    expect(document.documentElement.classList.contains('light-theme')).toBe(true);
    expect(document.documentElement.classList.contains('dark-theme')).toBe(false);
    expect(localStorage.getItem('dockpilot_theme_mode')).toBe('light');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx --prefix frontend jest src/app/core/services/theme.service.spec.ts`
Expected: FAIL (Cannot find module)

- [ ] **Step 3: Implement `frontend/src/app/core/services/theme.service.ts`**

```typescript
import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'system' | 'dark' | 'light';
export type ActiveTheme = 'dark' | 'light';

const STORAGE_KEY = 'dockpilot_theme_mode';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
  private readonly systemPrefersDark = signal<boolean>(this.mediaQuery?.matches ?? true);

  readonly mode = signal<ThemeMode>(this.getInitialMode());

  readonly activeTheme = computed<ActiveTheme>(() => {
    const currentMode = this.mode();
    if (currentMode === 'system') {
      return this.systemPrefersDark() ? 'dark' : 'light';
    }
    return currentMode;
  });

  constructor() {
    // Listen for OS color scheme shifts
    if (this.mediaQuery) {
      this.mediaQuery.addEventListener('change', (e) => {
        this.systemPrefersDark.set(e.matches);
      });
    }

    // Synchronize DOM classes whenever activeTheme changes
    effect(() => {
      const theme = this.activeTheme();
      const root = document.documentElement;
      if (theme === 'light') {
        root.classList.remove('dark-theme');
        root.classList.add('light-theme');
        root.style.colorScheme = 'light';
      } else {
        root.classList.remove('light-theme');
        root.classList.add('dark-theme');
        root.style.colorScheme = 'dark';
      }
    });
  }

  setMode(newMode: ThemeMode): void {
    this.mode.set(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
    } catch {
      // Storage access protected in sandbox
    }
  }

  private getInitialMode(): ThemeMode {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved;
      }
    } catch {
      // Storage unavailable
    }
    return 'system';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx --prefix frontend jest src/app/core/services/theme.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/core/services/theme.service.ts frontend/src/app/core/services/theme.service.spec.ts
git commit -m "feat: implement ThemeService with 3-way mode, OS media query sync and signal reactivity"
```

---

### Task 3: Shell Toolbar Theme Menu & Glassmorphism Polish

**Files:**
- Modify: `frontend/src/app/layout/shell.component.html`
- Modify: `frontend/src/app/layout/shell.component.ts`
- Modify: `frontend/src/app/layout/shell.component.scss`
- Modify: `frontend/src/app/layout/shell.component.spec.ts`

**Interfaces:**
- Consumes: `ThemeService` (`themeService.mode()`, `themeService.activeTheme()`, `themeService.setMode()`)

- [ ] **Step 1: Update `shell.component.ts` to inject `ThemeService` and import `MatMenuModule`**

In `frontend/src/app/layout/shell.component.ts`:
Add `MatMenuModule` to imports.
Inject `readonly themeService = inject(ThemeService);`.

- [ ] **Step 2: Update `shell.component.html` to add Theme Menu & Live Pulse Chip**

Add theme menu toggle button in toolbar between alert bell and connection state chip:
```html
<button
  mat-icon-button
  [matMenuTriggerFor]="themeMenu"
  matTooltip="Select Theme"
  class="theme-toggle-btn"
  aria-label="Theme mode selector"
>
  <mat-icon>{{ themeService.mode() === 'system' ? 'brightness_auto' : (themeService.activeTheme() === 'dark' ? 'dark_mode' : 'light_mode') }}</mat-icon>
</button>

<mat-menu #themeMenu="matMenu" class="theme-menu-panel">
  <button mat-menu-item (click)="themeService.setMode('system')">
    <mat-icon>brightness_auto</mat-icon>
    <span>System Default</span>
    <mat-icon class="check-icon" *ngIf="themeService.mode() === 'system'">check</mat-icon>
  </button>
  <button mat-menu-item (click)="themeService.setMode('dark')">
    <mat-icon>dark_mode</mat-icon>
    <span>Dark Mode (Obsidian)</span>
    <mat-icon class="check-icon" *ngIf="themeService.mode() === 'dark'">check</mat-icon>
  </button>
  <button mat-menu-item (click)="themeService.setMode('light')">
    <mat-icon>light_mode</mat-icon>
    <span>Light Mode (Paper)</span>
    <mat-icon class="check-icon" *ngIf="themeService.mode() === 'light'">check</mat-icon>
  </button>
</mat-menu>
```

- [ ] **Step 3: Update `shell.component.scss` with frosted glassmorphism & breathing pulse dot**

```scss
.shell-toolbar {
  background: var(--bg-surface);
  backdrop-filter: blur(16px) saturate(180%);
  border-bottom: 1px solid var(--border-subtle);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.shell-sidenav {
  background: var(--bg-surface);
  backdrop-filter: blur(16px) saturate(180%);
  border-right: 1px solid var(--border-subtle);
}

.status-connected::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--status-running);
  margin-right: 6px;
  box-shadow: 0 0 8px var(--status-running-halo);
  animation: pulse-halo 2s infinite ease-in-out;
}

@keyframes pulse-halo {
  0%, 100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.5;
  }
}
```

- [ ] **Step 4: Update `shell.component.spec.ts` and run tests**

Run: `npx --prefix frontend jest src/app/layout/shell.component.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/layout/
git commit -m "feat: add 3-way theme toggle menu and glassmorphism styling to shell toolbar"
```

---

### Task 4: Telemetry Card Bevels, Numerals & Workload Indicators

**Files:**
- Modify: `frontend/src/app/features/dashboard/dashboard.component.scss`
- Modify: `frontend/src/app/features/containers/containers-list.component.scss`

- [ ] **Step 1: Elevate `dashboard.component.scss` with top bevel border and hover physics**

```scss
.metric-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  box-shadow: var(--shadow-ambient);
  position: relative;
  overflow: hidden;
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, var(--border-highlight) 0%, transparent 100%);
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lifted);
  }

  .metric-value {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
}
```

- [ ] **Step 2: Add breathing status indicators to `containers-list.component.scss`**

```scss
.status-badge.status-running {
  background: rgba(16, 185, 129, 0.12);
  color: var(--status-running);
  border: 1px solid rgba(16, 185, 129, 0.25);

  &::before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--status-running);
    margin-right: 6px;
    animation: pulse-halo 2s infinite ease-in-out;
  }
}
```

- [ ] **Step 3: Run dashboard and container tests**

Run: `npx --prefix frontend jest src/app/features/dashboard/ src/app/features/containers/`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/features/dashboard/dashboard.component.scss frontend/src/app/features/containers/containers-list.component.scss
git commit -m "style: elevate dashboard telemetry cards with bevel highlights and container status halos"
```

---

### Task 5: Reactive Chart.js and xterm.js Re-Theming

**Files:**
- Modify: `frontend/src/app/features/dashboard/dashboard.component.ts`
- Modify: `frontend/src/app/features/containers/detail/container-detail.component.ts`
- Modify: `frontend/src/app/features/terminal/terminal-view.component.ts`

**Interfaces:**
- Consumes: `ThemeService.activeTheme`

- [ ] **Step 1: Wire `effect()` in `DashboardComponent` to update donut chart colors on theme switch**

```typescript
effect(() => {
  const theme = this.themeService.activeTheme();
  const textColor = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const legendColor = theme === 'dark' ? '#94a3b8' : '#475569';
  if (this.donutChartOptions.plugins?.legend?.labels) {
    this.donutChartOptions.plugins.legend.labels.color = legendColor;
  }
});
```

- [ ] **Step 2: Wire `effect()` in `ContainerDetailComponent` to update telemetry chart gridlines and ticks**

```typescript
effect(() => {
  const theme = this.themeService.activeTheme();
  const gridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(15, 23, 42, 0.08)';
  const tickColor = theme === 'dark' ? '#94a3b8' : '#475569';
  // Dynamically update line chart options without resetting zoom/time-window
});
```

- [ ] **Step 3: Wire `effect()` in `TerminalViewComponent` to adapt xterm.js theme**

```typescript
effect(() => {
  const theme = this.themeService.activeTheme();
  if (this.term) {
    this.term.options.theme = theme === 'dark'
      ? { background: '#080c14', foreground: '#f8fafc', cursor: '#3b82f6', selectionBackground: 'rgba(59,130,246,0.3)' }
      : { background: '#f8fafc', foreground: '#0f172a', cursor: '#2563eb', selectionBackground: 'rgba(37,99,235,0.2)' };
  }
});
```

- [ ] **Step 4: Run component tests**

Run: `npx --prefix frontend jest src/app/features/containers/detail/ src/app/features/terminal/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/features/dashboard/ frontend/src/app/features/containers/detail/ frontend/src/app/features/terminal/
git commit -m "feat: adapt Chart.js grids and xterm.js terminal theme reactively on theme toggle"
```

---

### Task 6: Comprehensive Verification & Intranet Deployment

**Files:**
- All touched files

- [ ] **Step 1: Run full frontend test suite**

Run: `cd frontend; npm test`
Expected: 302+ tests passing across all suites.

- [ ] **Step 2: Run frontend production build**

Run: `cd frontend; npm run build`
Expected: 0 warnings, 0 errors.

- [ ] **Step 3: Update codebase knowledge graph**

Run: `python -m graphify update .`
Expected: Graph updated.

- [ ] **Step 4: Commit and push changes**

```bash
git push origin master
```

- [ ] **Step 5: Deploy to Intranet Server (`saazvat`)**

Via SSH script:
```bash
cd /home/intranet/DockPilot && git pull origin master && docker compose up -d --build
```
Verify via `curl.exe -IL http://192.168.2.94/dockpilot` that new assets are served cleanly in both dark and light modes.
