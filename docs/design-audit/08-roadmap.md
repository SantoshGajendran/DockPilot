# Phased Design Remediation Roadmap

A structured four-phase implementation plan mapping every Severity 1 (Blocker) and Severity 2 (Major) finding to concrete milestones.

---

## Roadmap Overview

```
Phase 1: Quick Wins (Days 1–2)
  ├── Accessibility attribute fixes (aria-label on buttons, inputs, links)
  ├── WCAG AA Light theme contrast token adjustments
  └── Dangerous action separation & destructive styling

Phase 2: Foundations & Token System (Days 3–5)
  ├── Eliminate 82 hardcoded hex colors & 99 rgb values via CSS custom properties
  ├── Standardize 4px geometric spacing scale across all 27 SCSS files
  ├── Eradicate 11 ::ng-deep blocks and 173 !important declarations
  └── Build shared primitives: <dp-status-dot>, <dp-metric-number>, <dp-empty-state>

Phase 3: Page Redesigns & Responsive Hardening (Days 6–10)
  ├── Dashboard: Asymmetric hero card, eliminate CLS via tabular numerals
  ├── Containers: Responsive card layout below 900px, bulk selection feedback
  ├── Logs Explorer: Mobile chip drawer, ANSI theme tokens
  └── Host & Resources: Reclaimable storage preview, above-the-fold telemetry

Phase 4: Immersion, Signature Motion & Polish (Days 11–13)
  ├── Command Palette (Cmd+K) & slide-up terminal drawer
  ├── Orbit Topology radar visualization
  └── Spring micro-interactions, optimistic UI feedback, and haptic polish
```

---

## Phase 1: Immediate Quick Wins (Under 1 Day Each)
*Target: Immediate resolution of all WCAG 2.2 AA accessibility blockers and high-risk operational hazards.*

| Finding ID | Scope / Element | Action | Effort |
|---|---|---|---|
| **DF-014** | `/containers` action buttons | Add explicit `aria-label` and `matTooltip` to all icon buttons | XS (1h) |
| **DF-015** | `/containers` container link | Add accessible name computation to container anchor tags | XS (30m) |
| **DF-029** | `/logs` search input | Add `aria-label="Search container logs"` to text input | XS (15m) |
| **DF-030** | `/logs` stream toolbar | Add `aria-label` and tooltips to pause/wrap/clear/scroll buttons | XS (1h) |
| **DF-036** | `/host` progress bars | Add `aria-label` to CPU, Memory, and Disk progress gauges | XS (30m) |
| **DF-043** | `/projects` compose buttons | Add `aria-label` to Up/Down/Restart/Logs icon buttons | XS (45m) |
| **DF-045** | `/projects` Compose Down | Relocate "Down" action to overflow menu with destructive red styling | S (3h) |
| **DF-057** | `/alerts` silence toggles | Add `aria-label="Silence alert rule"` to slide toggles | XS (30m) |
| **DF-058** | `/alerts` rule buttons | Add accessible text to Edit/Delete/Test action buttons | XS (45m) |
| **DF-070** | `/resources` action buttons | Add `aria-label` to delete image / volume / network buttons | XS (45m) |
| **DF-077** | `/audit` JSON expanders | Add `aria-label` and `aria-expanded` attributes to chevron buttons | XS (30m) |
| **DF-084** | `/users` row action buttons | Add `aria-label` to role edit, password reset, deactivate buttons | XS (45m) |
| **DF-091** | `/profile` session revoke | Add `aria-label="Revoke session"` to trash buttons | XS (30m) |
| **DF-097** | `/settings` retention inputs | Add `aria-label` to numeric retention fields | XS (30m) |
| **DF-104** | `/dev/components` panel | Remove invalid `aria-valuenow` from static showcase container | XS (15m) |
| **DF-001** | `/login` subtitle | Fix light theme contrast ratio from 2.76:1 to 5.8:1 via `--text-dim` | XS (30m) |
| **DF-037** | `/host` process headers | Fix light theme contrast ratio from 2.45:1 to 5.8:1 via `--text-dim` | XS (30m) |
| **DF-046** | `/projects` status pills | Fix light theme contrast ratio from 2.15:1 to 5.2:1 via dark green/amber tokens | XS (30m) |
| **DF-073** | `/resources` size text | Fix light theme contrast ratio from 2.45:1 to 5.8:1 | XS (30m) |
| **DF-087** | `/users` table headers | Fix light theme contrast ratio from 2.45:1 to 5.8:1 | XS (30m) |

---

## Phase 2: Design System Foundations & Token Unification (2–3 Days)
*Target: Eradication of CSS technical debt, token unification, and building shared reusable components.*

| Finding ID | Scope / Element | Action | Effort |
|---|---|---|---|
| **DF-007** | `/dashboard` micro-labels | Replace hardcoded `#64748B` with `var(--text-dim)` | XS |
| **DF-011** | `/dashboard`, `/containers` | Replace hardcoded status hexes with `var(--status-*)` | S |
| **DF-023** | `/containers/:id` tab headers | Replace `::ng-deep` tab border with theme variable | XS |
| **DF-024** | `/containers/:id` tab labels | Fix unselected tab text contrast ratio to 5.4:1 | XS |
| **DF-031** | `/logs` form fields | Eliminate 4 `::ng-deep` blocks; adopt Material density tokens | S |
| **DF-033** | `/logs` timestamp column | Bind `.log-ts` to `var(--text-dim)` | XS |
| **DF-050** | `/events` event timestamps | Update timestamp font color to `var(--text-dim)` | XS |
| **DF-059** | `/alerts` toggle tracks | Replace `::ng-deep` switch tracks with Material MDC tokens | XS |
| **DF-061** | `/alerts` rule thresholds | Bind threshold strings to `var(--text)` with monospace font | XS |
| **DF-064** | `/alerts/channels` URLs | Fix webhook destination URL contrast ratio | XS |
| **DF-065** | `/alerts/channels` borders | Eliminate `::ng-deep` on form field wrapper | XS |
| **DF-071** | `/resources` prune dialog | Replace legacy Material `#FF9800`/`#666` with Flight Deck tokens | S |
| **DF-078** | `/audit` action tags | Bind audit action tags to `var(--text-dim)` | XS |
| **DF-085** | `/users` select overlays | Eliminate `::ng-deep` select panel overrides | XS |
| **DF-086** | `/users` role badges | Apply distinct gold, violet, and slate badges to RBAC roles | S |
| **DF-092** | `/profile` password suffix | Scope form field suffix without `::ng-deep` | XS |
| **DF-093** | `/profile` 2FA helper copy | Fix 2FA instruction text contrast to WCAG AA | XS |
| **DF-098** | `/settings` toggle tracks | Eliminate `::ng-deep` on slide toggle tracks | XS |
| **DF-099** | `/settings` help descriptions| Fix description helper copy contrast | XS |
| **Global** | 27 SCSS files | Standardize 386 non-4px spacings onto the 4px geometric scale | M |

---

## Phase 3: Page Redesigns & Responsive Hardening (4–5 Days)
*Target: Layout stability, mobile adaptation, and UX friction elimination.*

| Finding ID | Scope / Element | Action | Effort |
|---|---|---|---|
| **DF-008** | `/dashboard` telemetry | Apply `font-variant-numeric: tabular-nums` to eliminate CLS (0.031) | S |
| **DF-009** | `/dashboard` gauges | Replace inline width percentage with GPU-accelerated `scaleX` | S |
| **DF-010** | `/dashboard` card grid | Redesign into asymmetric layout elevating fleet health above routine metrics | M |
| **DF-012** | `/dashboard` empty fleet | Implement onboarding empty state banner with deploy shortcuts | S |
| **DF-016** | `/containers` table | Implement responsive stacked card layout for viewports `< 900px` | M |
| **DF-017** | `/containers` actions | Apply crimson warning hover states on destructive controls | S |
| **DF-022** | `/containers/:id` tabs | Remove hardcoded inline style heights; adopt fluid flex layout | S |
| **DF-025** | `/containers/:id` terminal | Implement responsive modal / drawer expansion for mobile terminals | S |
| **DF-032** | `/logs` fleet selector | Collapse target fleet into horizontal chip drawer on mobile/tablet | M |
| **DF-039** | `/host` system info grid | Relocate host metadata to compact strip so graphs appear above the fold | S |
| **DF-047** | `/projects` services table | Prioritize columns on `< 900px` screens with expandable row drawers | S |
| **DF-051** | `/events` stream controls | Add visual stream pause/buffer toggle to prevent unexpected layout jumping | S |
| **DF-053** | `/events` OOM / Die events | Add prominent crimson border highlights and crash chips | S |
| **DF-067** | `/alerts/channels` log table| Stack delivery log rows into expandable cards on mobile | S |
| **DF-072** | `/resources` prune wizard | Add dry-run reclaimable gigabyte estimates prior to prune confirmation | S |
| **DF-079** | `/audit`, `/users` RBAC | Display permission explanation toast when `roleGuard` redirects | S |
| **DF-080** | `/audit` diff drawer | Add word-break wrap and responsive containment to JSON payload diffs | S |
| **DF-095** | `/profile` session revoke | Require confirmation dialog and apply destructive warning styling | S |
| **DF-100** | `/settings` mobile footer | Add padding to container so sticky footer does not occlude inputs | S |

---

## Phase 4: Signature Polish & Immersion (2–3 Days)
*Target: Premium finish, signature interactions, and power-user workflows.*

| Feature / Upgrade | Target Scope | Value Delivered | Effort |
|---|---|---|---|
| **Command Palette (Cmd+K)** | Global Shell | Instant container navigation and safe action execution | M (2 days) |
| **Orbit Topology Radar** | `/dashboard` | Interactive 2D spatial fleet visualization | L (3 days) |
| **Optimistic Action UI (DF-060, DF-066)**| `/alerts`, `/alerts/channels` | Instant checkmark / spinner feedback on click | S (1 day) |
| **Obsidian 2FA Bezel (DF-094)** | `/profile` | Bezel-mounted QR code with ambient gold glow | XS (2h) |
| **Batch Row Feedback (DF-019)** | `/containers` | Distinct violet border and tinted background on multi-selected rows | S (4h) |
| **Token-Driven Gallery (DF-105)** | `/dev/components` | Interactive signal knobs to test component states dynamically | S (1 day) |
