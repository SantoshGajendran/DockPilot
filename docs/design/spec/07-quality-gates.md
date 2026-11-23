# Quality Gates: Anti-Patterns, Performance, Accessibility & DoD

## Purpose
Governs the non-negotiable quality criteria, performance budgets, accessibility rules, banned design anti-patterns, and project-wide Definition of Done.

## Read first
- docs/design/spec/01-foundations.md

## Requirements

### Anti-Patterns (do NOT do these)
- Generic white cards on grey.
- Default Material look.
- Inter or Roboto fonts.
- Purple-to-blue gradient hero blobs.
- Emoji as icons.
- Identical equal-sized card grids.
- Drop-shadow-everything.
- Centered-everything layouts.
- Decorative animation that doesn't carry meaning.
- Stock illustration.
- Neon overload.

### Performance Budget
- **Bundle size**: Initial route JS under the current size plus 60KB gzip for all new visual code.
- **Lazy loading**: Lazy-load the ambient canvas and topology view.
- **Off-screen execution**: No animation work off-screen (use `IntersectionObserver`).
- **CPU consumption**: Background canvas under 4% CPU on a mid laptop.
- **Layout stability**: No layout shift from live updates (zero Cumulative Layout Shift from incoming SSE telemetry).
- **Frame rate**: Target a steady 60fps with the 2-second SSE telemetry updates running. Animate only `transform` and `opacity` (plus CSS custom properties driving them); no layout-thrashing animation.

### Accessibility Standards
- **Contrast**: WCAG AA contrast on all text elements across all views.
- **Keyboard navigation**: Full keyboard navigation with visible focus rings in the brand colour (`--gold`).
- **Reduced motion**: Honor `prefers-reduced-motion` and support user-facing Quiet Mode toggle.
- **Material CDK integration**: Keep Angular Material / CDK for behaviour and accessibility (overlays, focus traps, menus, dialogs, a11y), but override its visuals completely through design tokens and custom components. No default-looking Material surface may remain visible.

### Responsive Standards
- Everything must work seamlessly from `1280px` desktop down to `390px` mobile viewport widths.

### Hard Architectural Boundaries
- Presentation layer only. Do NOT change backend, API contracts, route paths, guards, interceptors, Signal store logic, models, RBAC behaviour, or the two-phase confirmation/audit flows.
- Angular 19 standalone + Signals, zoneless-ready. No new state-management libraries.
- Fonts self-hosted (e.g. `@fontsource`). No external CDN calls at runtime (isolated network compatibility).

### Definition of Done
- Zero hard-coded colours or font stacks outside the token files.
- Looks and feels cohesive across all 14 routes; no leftover default Material styling.
- 60fps during live telemetry, verified in a performance profile.
- Quiet Mode and reduced-motion both fully functional.
- All existing functionality and tests still pass.

## Acceptance criteria
- [ ] Automated or manual audit confirms zero anti-patterns present in codebase.
- [ ] Initial route JS verified under original bundle size + 60KB gzip.
- [ ] Background canvas verified under 4% CPU load and lazy-loaded.
- [ ] Steady 60fps frame rate maintained during 2s SSE telemetry stream.
- [ ] WCAG AA compliance verified across all text and interactive tokens.
- [ ] Complete keyboard navigation functional with brand gold focus outlines.
- [ ] Full responsiveness verified at 1280px, 768px, and 390px breakpoints.
- [ ] 100% of existing unit and e2e tests continue to pass.

## Must not
- Do NOT alter backend services, database schemas, API routes, or audit pipelines.
- Do NOT alter Angular route paths, guards, interceptors, or Signal store logic.
- Do NOT add external state management libraries (e.g. NgRx, Akita).
- Do NOT load external assets or fonts from CDNs.
- Do NOT animate layout properties (`width`, `height`, `top`, `margin`, `padding`).
- Do NOT allow default Material surfaces, typography, or ripple effects to appear.
