# Design Specification: DockPilot Immersive UI & Dual-Theme System

## 1. Overview & Objectives

DockPilot is a production Docker monitoring and container control workstation. This design elevates DockPilot from a standard Angular Material UI into a bespoke, high-craft, immersive interface inspired by Apple Desktop and Linear design engineering principles.

### Key Objectives
1. **First-Class Dual Themes (Dark Obsidian & Crisp Paper Light)**: A complete token-based dual-theme architecture applied seamlessly across all application surfaces, cards, dialogs, forms, and charts without contrast regressions.
2. **3-Way Theme Management**: User preference toggle supporting **System Default**, **Dark Mode**, and **Light Mode**, with real-time OS media query synchronization and `localStorage` persistence.
3. **Tactile Craft & Micro-Interactions**: Apple-inspired fluid motion, `:active { transform: scale(0.98) }` physical feedback, frosted glass surfaces (`backdrop-filter: blur(12px)`), hairline bevel borders, and live breathing indicators on running workloads.
4. **Reactive Chart & Terminal Sync**: Chart.js graphs and xterm.js terminals dynamically swap their color schemes in real time upon theme changes.
5. **Reduced-Motion Accessibility**: Complete `@media (prefers-reduced-motion: reduce)` overrides for motion-sensitive users.

---

## 2. Design Tokens & Palette System

The styling architecture in `frontend/src/styles/theme.scss` is structured with CSS custom properties partitioned into `:root` / `.dark-theme` and `.light-theme`.

### 2.1 Dark Palette (Obsidian Pro - Default)
- `--bg-canvas`: `#080c14` (Deep matte obsidian backdrop)
- `--bg-surface`: `rgba(15, 23, 42, 0.82)` (Translucent slate card/sidebar surface)
- `--bg-surface-elevated`: `#1e293b` (Elevated modals, menus, and dropdowns)
- `--bg-surface-hover`: `rgba(255, 255, 255, 0.05)`
- `--border-subtle`: `rgba(255, 255, 255, 0.08)` (Hairline glass divider)
- `--border-highlight`: `rgba(255, 255, 255, 0.14)` (Bevel top highlight)
- `--text-primary`: `#f8fafc` (High-contrast crisp white typography)
- `--text-secondary`: `#94a3b8` (Muted labels and metadata)
- `--text-muted`: `#64748b` (Timestamps and hints)
- `--accent-primary`: `#3b82f6`
- `--accent-primary-hover`: `#60a5fa`
- `--accent-glow`: `0 0 20px rgba(59, 130, 246, 0.22)`
- `--status-running`: `#10b981` (Emerald green)
- `--status-running-halo`: `rgba(16, 185, 129, 0.25)`
- `--status-danger`: `#ef4444`
- `--status-warning`: `#f59e0b`
- `--status-paused`: `#06b6d4`
- `--shadow-ambient`: `0 4px 20px -2px rgba(0, 0, 0, 0.5)`
- `--shadow-lifted`: `0 8px 30px -4px rgba(0, 0, 0, 0.65)`

### 2.2 Light Palette (Crisp Paper Light - `.light-theme`)
- `--bg-canvas`: `#f8fafc` (Cool clean paper backdrop)
- `--bg-surface`: `#ffffff` (Crisp white surface with ambient shadow)
- `--bg-surface-elevated`: `#f1f5f9` (Cool elevated panel)
- `--bg-surface-hover`: `rgba(0, 0, 0, 0.04)`
- `--border-subtle`: `rgba(15, 23, 42, 0.08)` (Subtle hairline divider)
- `--border-highlight`: `rgba(255, 255, 255, 0.8)`
- `--text-primary`: `#0f172a` (Deep obsidian text for optimal readability)
- `--text-secondary`: `#475569` (Slate metadata)
- `--text-muted`: `#94a3b8`
- `--accent-primary`: `#2563eb`
- `--accent-primary-hover`: `#1d4ed8`
- `--accent-glow`: `0 0 20px rgba(37, 99, 235, 0.18)`
- `--status-running`: `#059669`
- `--status-running-halo`: `rgba(5, 150, 105, 0.2)`
- `--status-danger`: `#dc2626`
- `--status-warning`: `#d97706`
- `--status-paused`: `#0891b2`
- `--shadow-ambient`: `0 1px 3px rgba(0, 0, 0, 0.05), 0 8px 24px -4px rgba(0, 0, 0, 0.04)`
- `--shadow-lifted`: `0 12px 32px -4px rgba(0, 0, 0, 0.08)`

---

## 3. Theme Architecture & State Management

### 3.1 `ThemeService` (`frontend/src/app/core/services/theme.service.ts`)
- **State Types**:
  ```typescript
  export type ThemeMode = 'system' | 'dark' | 'light';
  export type ActiveTheme = 'dark' | 'light';
  ```
- **Signals**:
  - `mode = signal<ThemeMode>('system')`: The explicitly saved mode.
  - `activeTheme = signal<ActiveTheme>('dark')`: The actively computed visual theme.
- **Initialization & Media Listener**:
  - Read from `localStorage.getItem('dockpilot_theme_mode') || 'system'`.
  - Media query watcher: `window.matchMedia('(prefers-color-scheme: dark)')`. If `mode() === 'system'`, changes automatically recalculate `activeTheme`.
- **DOM Injection**:
  - Sets `.light-theme` or `.dark-theme` on `document.documentElement.classList`.
  - Sets `document.documentElement.style.colorScheme = activeTheme()` to style browser-native scrollbars, checkboxes, and select dropdowns automatically.

### 3.2 Header Toolbar Toggle UI (`ShellComponent`)
- Integrated into `frontend/src/app/layout/shell.component.html` toolbar.
- Mat-menu dropdown offering:
  - 🖥️ **System Default** (icon: `brightness_auto`)
  - 🌙 **Dark Mode** (icon: `dark_mode`)
  - ☀️ **Light Mode** (icon: `light_mode`)
- Smooth icon rotation and checkmark indicator on current selection.

---

## 4. Component Craft & Micro-Interactions

### 4.1 Shell & Sidenav
- **Frosted Glass**: Sidenav and top toolbar utilize `backdrop-filter: blur(16px) saturate(180%)`.
- **Pill Navigation Items**: Rounded 8px pills with soft background transitions (`transition: background-color 150ms ease, color 150ms ease`).
- **Live Connection Chip**: SSE status badge includes a breathing green pulse dot (`@keyframes pulse-halo`) confirming active real-time data ingestion.

### 4.2 Telemetry Cards & Metric Panels
- **Top Bevel Highlight**: Subtle top gradient border giving physical depth.
- **Card Hover Physics**:
  - `transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 200ms ease;`
  - Hover state lifts card `transform: translateY(-2px)` with expanded soft shadow.
- **Tabular Numerals**: CPU percentages, memory bytes, and network rates use `font-variant-numeric: tabular-nums` to eliminate jitter on real-time streaming updates.

### 4.3 Tactile Buttons & Badges
- **Button Click Confirmation**:
  - `:active { transform: scale(0.98); }` across all primary and stroked buttons for immediate tactile feedback.
- **Container State Badges**:
  - Status badges for containers (`running`, `exited`, `restarting`) include an inline halo indicator dot.

---

## 5. Third-Party Component Reactive Re-theming

### 5.1 Chart.js
- Line charts (Container Detail CPU, Memory, I/O) and donut charts (Overview Dashboard) subscribe to `ThemeService.activeTheme`.
- Upon theme toggle:
  - Updates `chart.options.scales.x.grid.color` and `y.grid.color`.
  - Updates `chart.options.scales.x.ticks.color` and `y.ticks.color`.
  - Updates tooltip background and text colors.
  - Calls `chart.update('none')` to re-render without animation interruption or data resets.

### 5.2 xterm.js (Web Terminal)
- Terminal view subscribes to `ThemeService.activeTheme`:
  - **Dark**: `background: '#080c14'`, `foreground: '#f8fafc'`, `cursor: '#3b82f6'`.
  - **Light**: `background: '#f8fafc'`, `foreground: '#0f172a'`, `cursor: '#2563eb'`.
  - Dynamically updates active terminal instances via `term.options.theme = newTheme`.

---

## 6. Accessibility & Reduced Motion

- Standard global reduced motion safety block:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, ::before, ::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

## 7. Verification & Testing

1. **Unit Tests**:
   - `ThemeService`: Verify initial mode resolution, localStorage persistence, OS media query listener, and DOM class toggling.
   - `ShellComponent`: Verify theme menu toggle, icon rendering, and active mode binding.
   - Full test suite: Confirm all 301 frontend Jest tests pass.
2. **Visual & Contrast Verification**:
   - Verify dark and light themes across Overview Dashboard, Containers List, Container Details, Logs Explorer, Terminal, Alerts, Settings, and Users.
   - Verify Chart.js and xterm.js re-render accurately on theme switch.
