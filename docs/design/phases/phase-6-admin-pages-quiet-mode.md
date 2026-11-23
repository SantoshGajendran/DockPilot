# Phase 6: Audit, Admin Forms, Quiet Mode & Reduced Motion

## Objective
Redesign the administrative and user settings views: the monospace audit ledger (`/audit`) with slide-out payload drawer, calm form styling across `/users`, `/profile`, and `/settings` with custom floating-label inputs and sticky unsaved-changes bar, implement the user-facing Quiet Mode toggle, and complete the project-wide reduced-motion pass.

## Read first
- .agents/rules/design-guardrails.md
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/06-states-microcopy.md
- docs/design/spec/07-quality-gates.md
- docs/design/pages/audit.md
- docs/design/pages/users-profile-settings.md

## Scope
### In Scope
- `/audit`: Time-ordered ledger layout, monospace typography, subtle row dividers, status chips (`pending`, `success`, `failure`), expandable payload inspection drawer sliding from the right.
- `/users`, `/profile`, `/settings`: Calm, spacious forms grouped into glass sections; custom inputs with floating labels and animated gold underlines (no Material outlines); sticky save bar appearing on unsaved form state (`pendingChangesGuard` integration).
- Quiet Mode toggle: User-facing switch in Settings and Profile that cleanly disables ambient background canvas, tilt, and parallax while keeping simple fades.
- Reduced-motion pass: Ensure `prefers-reduced-motion: reduce` globally disables spring tweens, parallax, canvas rendering, and animated indicators, retaining only accessible opacity fades.

### Out of Scope
- Final performance profiling, responsive pass, and a11y sign-off -> Phase 7.

## Steps
1. Redesign `/audit` per `pages/audit.md`. Implement monospace ledger formatting, status chips, and right-sliding JSON payload inspection drawer.
2. Build custom form input components/directives: floating labels, animated gold underlines on focus, error message formatting without Material field dependencies.
3. Redesign `/users`, `/profile`, and `/settings` per `pages/users-profile-settings.md`. Group settings into spacious `GlassPanel` containers.
4. Implement the sticky unsaved changes save bar; integrate with existing `pendingChangesGuard` to guard navigation.
5. Implement the user-facing "Quiet Mode" toggle in Settings and Profile. Connect toggle state to `MotionService` / `PointerFxService` to disable ambient canvas, tilt, and parallax.
6. Verify `@media (prefers-reduced-motion: reduce)` rules globally across all components.

## Verification
- Run `npm test` and `ng build`.
- Inspect `/audit`: click a ledger record and verify the right-side payload drawer smoothly slides in; test `Escape` key dismissal.
- Inspect `/settings` and `/profile`: test form field focus animations and dirty state triggering the sticky save bar.
- Test `pendingChangesGuard`: attempt to navigate away with unsaved changes and confirm confirmation guard blocks navigation.
- Toggle "Quiet Mode": confirm background canvas immediately pauses, and tilt/parallax effects are suppressed.
- Test operating system reduced motion setting: verify all non-fade animations are suppressed.
- Capture screenshots at 1280px and 390px for `/audit`, `/users`, `/profile`, and `/settings`.

## Report back
- Summary of page implementations.
- Desktop and mobile screenshots for `/audit`, `/users`, `/profile`, and `/settings`.
- Verification confirmation for Quiet Mode and reduced-motion states.
- Any open questions or deviations.

## Stop
Stop here. Do NOT proceed to Phase 7 until this phase report has been reviewed and approved.
