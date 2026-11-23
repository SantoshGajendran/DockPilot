# Global Atmosphere: Ambient Canvas, Effects & Transitions

## Purpose
Governs the ambient background canvas, data-driven visual energy, film grain, vignette, cursor spotlight, router page transitions, session boot sequence, and Quiet Mode behavior.

## Read first
- docs/design/spec/01-foundations.md

## Requirements

### Ambient Background Canvas
- **Visual styling**: Ambient background canvas behind the whole app: a very faint pixel/dot grid in perspective that drifts slowly.
- **Data-driven energy**: It is DATA-DRIVEN: host load changes its energy:
  - Calm violet shimmer when healthy
  - Slow gold pulse on warnings
  - A thin red edge glow on critical alerts
- **Performance & controls**:
  - Cap at 30fps.
  - Pause when the tab is hidden.
  - Disable in Quiet Mode.
  - Lazy-load the ambient canvas.
  - Background canvas under 4% CPU on a mid laptop.

### Film Grain & Vignette
- Subtle film grain overlay (static, 3% opacity) and a soft vignette so black never looks flat.

### Cursor Spotlight
- Panels get a radial highlight that follows the pointer.
- Set `--mx/--my` with ONE delegated `pointermove` listener, rAF-throttled; never per-component listeners.
- May be managed via presentation-only services (e.g. `PointerFxService`).

### Page & View Transitions
- Enable router `withViewTransitions()`.
- Content fades and rises 12px with a 40ms stagger between blocks.
- Container list row to detail uses a shared-element transition (the row's name and status dot morph into the detail header).
- No animation work off-screen (use `IntersectionObserver`).
- Animate only `transform` and `opacity` (plus CSS custom properties driving them). No layout-thrashing animation. Target a steady 60fps with the 2-second SSE telemetry updates running.

### Systems Online Boot Sequence
- First load of the dashboard per session: a short (under 1.2s, skippable) "systems online" boot sequence where panels power on in order.

### Quiet Mode & Reduced Motion
- Honor `prefers-reduced-motion`.
- Provide a user-facing "Quiet Mode" toggle in Settings/Profile that disables ambient effects, tilt, parallax and the background canvas, keeping only fades.
- May be managed via presentation-only services (e.g. `MotionService`).

## Acceptance criteria
- [ ] Ambient canvas renders faint pixel/dot grid in perspective drifting slowly behind entire app.
- [ ] Canvas visual energy reacts to host telemetry: violet shimmer (healthy), slow gold pulse (warnings), thin red edge glow (critical).
- [ ] Canvas frame rate strictly capped at 30fps and pauses execution on document visibility change (hidden tab).
- [ ] Background canvas consumes under 4% CPU on a mid laptop and is lazy-loaded.
- [ ] Static film grain overlay present at 3% opacity with soft vignette.
- [ ] Cursor spotlight sets `--mx` and `--my` via a single, rAF-throttled delegated pointer listener on document root; no per-component listeners.
- [ ] Router configured with `withViewTransitions()`; view transitions fade and rise 12px with 40ms block stagger.
- [ ] Shared-element transition connects container list row (name and status dot) to container detail header.
- [ ] Dashboard displays under 1.2s skippable "systems online" boot sequence on first session load.
- [ ] `prefers-reduced-motion` and Quiet Mode disable ambient background canvas, tilt, parallax, and non-fade motion.

## Must not
- Do NOT use per-component pointermove listeners for the spotlight effect.
- Do NOT run background canvas or animation work when tab is hidden or off-screen.
- Do NOT exceed 30fps on background canvas or 4% CPU load.
- Do NOT allow background canvas, tilt, or parallax to run when Quiet Mode or `prefers-reduced-motion` is active.
- Do NOT introduce layout-thrashing animations or animate properties other than `transform` and `opacity`.
- Do NOT create neon overload or purple-to-blue gradient hero blobs.
- Do NOT use decorative animation that does not carry meaning.
