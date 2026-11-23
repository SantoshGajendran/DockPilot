# Phase 3: Signature Shared Components & Demo Route

## Objective
Build and unit-test the 10 reusable signature presentation components in `src/app/shared/`, standardize primary/secondary/destructive button variants with magnetic hover, and create a dev-only demo route to visually audit every component and state.

## Read first
- .agents/rules/design-guardrails.md
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/06-states-microcopy.md
- docs/design/spec/07-quality-gates.md

## Scope
### In Scope
- Build the 10 signature components in `src/app/shared/`:
  1. `GlassPanelComponent`: layered surface, 1px inner highlight, spotlight hover, optional border sweep.
  2. `MetricNumberComponent`: spring tweening numeral, tabular figures, threshold color shifting, delta arrow.
  3. `SparklineComponent`: lightweight SVG, area gradient, initial draw-in, shift coordinate updates.
  4. `RadialGaugeComponent`: thin-ring SVG, glowing arc head, threshold tick marks.
  5. `StatusDotComponent`: status colors, soft glow, pulse on running/restarting only.
  6. `HeatTileComponent` & `HeatTileGridComponent`: load-colored tile, telemetry hover card.
  7. `SkeletonShimmerComponent`: content-shaped shimmering loading placeholders.
  8. `EmptyStateComponent`: vector line art, clear next action.
  9. `ConfirmDangerDialogComponent`: 1.2s press-and-hold ring fill re-skinning two-phase confirmation tokens.
  10. `ToastComponent` & `ToastService`: bottom-right stacking, progress bar, severity glyphs.
- Standardize button styles: Primary (solid gold, inner glow, max 4px magnetic hover), Secondary (glass outline), Destructive (rose outline with fill on hold). Scale to 0.97 on press.
- Create dev-only demo route (e.g. `/dev/components` guarded by Angular `isDevMode()`) showcasing all components, variants, and states.

### Out of Scope
- Modifying live page templates -> Phases 4, 5, 6.
- Modifying backend two-phase confirmation tokens, services, or audit records.

## Steps
1. Implement `GlassPanelComponent` with spotlight binding and layered highlight styles.
2. Implement `MetricNumberComponent` using spring easing, `tabular-nums`, and threshold colour interpolations.
3. Implement `SparklineComponent` SVG with smooth shift updates and area gradient fills.
4. Implement `RadialGaugeComponent` SVG with glowing arc head and calibrated threshold markers.
5. Implement `StatusDotComponent` with selective pulsing for running/restarting states.
6. Implement `HeatTileComponent` with hover telemetry card.
7. Implement `SkeletonShimmerComponent` with animated sheen for card and table shapes.
8. Implement `EmptyStateComponent` with clean 1.5px stroke line art and actionable button trigger.
9. Implement `ConfirmDangerDialogComponent` enforcing 1.2s press-and-hold ring fill while binding cleanly to existing confirmation tokens.
10. Implement `ToastComponent` and updated `ToastService` for bottom-right sliding notification stack.
11. Implement button directives/styles in `styles/theme.scss` (primary magnetic hover, destructive fill, 0.97 press scale).
12. Build dev-only component gallery route `/dev/components` rendering every component across normal, loading, and edge-case states.
13. Write unit tests for each shared component.

## Verification
- Run `npm test` and `ng build`. Confirm all new component unit tests pass.
- Open `/dev/components` in the browser at 1280px and 390px.
- Test `MetricNumber`: verify numbers tween smoothly without digit jitter.
- Test `RadialGauge` and `Sparkline`: verify no SVG redraw flicker.
- Test `ConfirmDangerDialog`: verify 1.2s hold duration is required before dispatch.
- Test primary button magnetic hover (must not pull more than 4px).
- Capture screenshots of the component gallery at desktop and mobile widths.

## Report back
- Catalog of created shared components and test coverage metrics.
- Screenshots of the `/dev/components` demo gallery.
- Confirmation of test pass rate and build status.
- Any open questions or deviations.

## Stop
Stop here. Do NOT proceed to Phase 4 until this phase report has been reviewed and approved.
