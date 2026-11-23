# Design Guardrails (ALWAYS ON)

For design documentation map and run order, see `docs/design/00-INDEX.md`.

## Hard Constraints
1. Presentation layer only. Do NOT change backend, API contracts, route paths, guards, interceptors, Signal store logic, models, RBAC behaviour, or the two-phase confirmation/audit flows. You may add presentation-only services (e.g. MotionService, PointerFxService).
2. Angular 19 standalone + Signals, zoneless-ready. No new state-management libraries.
3. Keep Angular Material / CDK for behaviour and accessibility (overlays, focus traps, menus, dialogs, a11y), but override its visuals completely through design tokens and custom components. No default-looking Material surface may remain visible.
4. Fonts self-hosted (e.g. @fontsource). No external CDN calls at runtime (the app may run on an isolated network).
5. Animate only transform and opacity (plus CSS custom properties driving them). No layout-thrashing animation. Target a steady 60fps with the 2-second SSE telemetry updates running.
6. Honor prefers-reduced-motion and add a user-facing "Quiet Mode" toggle in Settings/Profile that disables ambient effects, tilt, parallax and the background canvas, keeping only fades.
7. WCAG AA contrast on all text. Full keyboard navigation with visible focus rings in the brand colour.
8. Everything must work at 1280px desktop down to 390px mobile.

## Token Usage Rules
- All tokens must be defined in `styles/theme.scss` as CSS custom properties.
- Remove all hard-coded colours or font stacks outside token files.
- Gold and violet usage:
  - `gold`: primary actions, key numbers, active nav, focus. Gold must cover under ~8% of any screen.
  - `violet`: live data, selection, hover glows, charts.
  - Never use gold-to-violet gradients on large areas or text (avoid the generic AI-gradient look).

## Anti-Patterns (do NOT do these)
- Generic white cards on grey
- Default Material look
- Inter/Roboto
- Purple-to-blue gradient hero blobs
- Emoji as icons
- Identical equal-sized card grids
- Drop-shadow-everything
- Centered-everything layouts
- Decorative animation that doesn't carry meaning
- Stock illustration
- Neon overload
