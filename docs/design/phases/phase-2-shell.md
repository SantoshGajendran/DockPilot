# Phase 2: Application Shell & Transitions

## Objective
Implement the complete "Flight Deck" application framing: responsive sidebar navigation rail with animated sliding gold indicator, translucent top bar with live SSE telemetry indicator, keyboard-first Command Palette (`Ctrl/Cmd+K`), keyboard shortcuts overlay (`?`), and router view transitions.

## Read first
- .agents/rules/design-guardrails.md
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/03-app-shell.md
- docs/design/spec/07-quality-gates.md

## Scope
### In Scope
- Sidebar navigation rail: slim icon rail expanding on hover or pin, custom stroke icons (1.5px weight), micro-labels (`MONITOR`, `CONTROL`, `SYSTEM`), sliding gold indicator between active items.
- Top bar: translucent glass surface, backdrop blur, breadcrumb path, global search trigger, live connection indicator (pulsing dot + SSE latency), alert bell with count badge and dropdown preview.
- Command Palette (`Ctrl/Cmd+K`): modal overlay, fuzzy search (containers, projects, pages, actions), recent items, keyboard navigation, RBAC action filtering.
- Shortcuts overlay (`?`): overlay displaying `g d`, `g c`, `g l` keys.
- Router transitions: configure `withViewTransitions()` in `app.config.ts`, 12px fade-and-rise transition with 40ms block stagger.
- Spotlight integration across shell panels.

### Out of Scope
- Shared signature components (`MetricNumber`, `RadialGauge`, etc.) -> Phase 3.
- Individual page interiors -> Phases 4, 5, 6.

## Steps
1. Enable `withViewTransitions()` in Angular router configuration with 12px fade-and-rise keyframe animations.
2. Build custom SVG stroke icon set with 1.5px stroke weight; replace all Material icons in navigation.
3. Implement `SidebarComponent`: collapsible rail layout, hover/pinned states, micro-labels (`11px`, `0.12em` tracking), and animated sliding active indicator using CSS custom properties.
4. Implement `TopBarComponent`: glass backdrop, breadcrumbs, live SSE status dot with latency readout, and alert bell with animated count badge and preview dropdown.
5. Implement `CommandPaletteComponent` triggered by `Ctrl+K` / `Cmd+K`: fuzzy search filtering, recent items cache, keyboard selection, and role-based action gating (respecting existing RBAC without modifying role logic).
6. Implement `ShortcutsOverlayComponent` triggered by `?` key showing navigation hotkeys (`g d`, `g c`, `g l`).
7. Verify all shell elements work down to 390px mobile viewport with responsive drawer behavior.

## Verification
- Run `npm test` and `ng build`.
- Open the application in the browser at 1280px and 390px.
- Test keyboard interactions: press `Ctrl+K` to open command palette, search and navigate; press `?` to open shortcuts.
- Verify active sidebar indicator smoothly slides between menu items without jump cuts.
- Verify live connection indicator pulses with current SSE latency.
- Verify page route transitions execute 12px fade-and-rise motion without layout jank.
- Capture desktop and mobile screenshots of open sidebar, top bar, command palette, and shortcuts overlay.

## Report back
- Summary of shell components implemented.
- Screenshots of sidebar, top bar, command palette, and shortcuts overlay at 1280px and 390px.
- Confirmation of test pass rate and build status.
- Any open questions or deviations.

## Stop
Stop here. Do NOT proceed to Phase 3 until this phase report has been reviewed and approved.
