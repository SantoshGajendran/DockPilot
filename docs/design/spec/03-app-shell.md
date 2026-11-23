# App Shell: Navigation Rail, Header, Command Palette & Shortcuts

## Purpose
Governs the primary application framing: responsive sidebar navigation rail, translucent top bar header, Ctrl/Cmd+K command palette, and keyboard navigation shortcuts overlay.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md

## Requirements

### Sidebar
- **Layout & behavior**: Slim icon rail that expands on hover or pin to a full labelled panel.
- **Active indicator**: Active item has a gold left indicator that slides between items (animated, not jumping).
- **Iconography**: Icons are custom stroke icons with 1.5px weight, not default Material icons. No emoji as icons.
- **Grouping**: Group items with micro-labels (`MONITOR`, `CONTROL`, `SYSTEM`).

### Top Bar
- **Surface**: Translucent glass with backdrop blur.
- **Breadcrumb**: Navigation breadcrumb tracking current route.
- **Global search**: Triggers and opens the Command Palette.
- **Live connection indicator**: Pulsing dot + latency from SSE heartbeat.
- **Alert bell**: Animated count badge and a dropdown preview of active alerts.

### Command Palette (Ctrl/Cmd+K)
- **Shortcut**: `Ctrl+K` / `Cmd+K`.
- **Search capabilities**: Fuzzy search across containers, projects, pages and actions (restart, open logs, open terminal).
- **Interaction**: Keyboard-first, recent items, animated open/close.
- **RBAC enforcement**: Respects RBAC (hide actions the role cannot perform). Does not alter RBAC behavior or logic.

### Keyboard Shortcuts Overlay (press ?)
- Triggered by pressing `?`.
- Supports `g d`, `g c`, `g l` style navigation bindings:
  - `g d`: Navigate to Dashboard
  - `g c`: Navigate to Containers
  - `g l`: Navigate to Logs
- Full keyboard navigation with visible focus rings in the brand colour (`--gold`).

### Accessibility & Responsiveness
- Keep Angular Material / CDK for behaviour and accessibility (overlays, focus traps, menus, dialogs, a11y), but override its visuals completely through design tokens and custom components. No default-looking Material surface may remain visible.
- Everything must work at 1280px desktop down to 390px mobile.

## Acceptance criteria
- [ ] Sidebar renders as slim icon rail by default, smoothly expanding on hover or pin to full panel.
- [ ] Active sidebar item features an animated sliding gold left indicator transitioning between items without discrete jump cuts.
- [ ] Custom stroke icons with 1.5px weight used exclusively across all navigation items.
- [ ] Navigation sections grouped under micro-labels `MONITOR`, `CONTROL`, and `SYSTEM` (11px uppercase, 0.12em tracking).
- [ ] Top bar styled in translucent glass with backdrop blur (`12 / 24 / 40px`).
- [ ] Live connection indicator displays pulsing dot along with latency readouts from SSE heartbeat.
- [ ] Alert bell displays animated count badge and opens a preview dropdown of active alerts.
- [ ] Command Palette opens on `Ctrl+K` / `Cmd+K` with fuzzy search across containers, projects, pages, and actions (restart, logs, terminal).
- [ ] Command Palette displays recent items, handles full arrow/enter keyboard navigation, and filters out unauthorized actions per user role without altering RBAC rules.
- [ ] Shortcuts overlay opens on `?` displaying `g d`, `g c`, `g l` navigation keys.
- [ ] Focus rings visibly rendered in brand gold (`--gold`) for all interactive shell controls.
- [ ] App shell collapses gracefully to mobile layout at 390px width up to 1280px desktop.

## Must not
- Do NOT use default Material icons or default Material navigation drawers.
- Do NOT use emoji as icons.
- Do NOT snap active navigation indicator abruptly without animated sliding motion.
- Do NOT modify backend RBAC contracts, guards, or role definitions.
- Do NOT omit visible focus rings on interactive header or navigation elements.
- Do NOT hard-code colours or borders outside the token scale.
