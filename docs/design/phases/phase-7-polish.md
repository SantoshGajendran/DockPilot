# Phase 7: Polish, Performance Profile & Quality Sign-Off

## Objective
Execute the project-wide visual polish, timing audit, accessibility verification (WCAG AA), performance profiling against budget, responsive testing (1280px to 390px), and formal sign-off against the Definition of Done.

## Read first
- .agents/rules/design-guardrails.md
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/05-dataviz.md
- docs/design/spec/06-states-microcopy.md
- docs/design/spec/07-quality-gates.md

## Scope
### In Scope
- Animation timing audit: Verify all transitions adhere strictly to token durations (`120 / 220 / 420 / 700ms`) and token easings (`--ease-out`, `--ease-inout`, `--spring`). Remove any ad-hoc timings.
- Accessibility audit: Verify WCAG AA contrast on all text across obsidian surfaces; verify full keyboard navigation with visible brand gold focus rings; verify screen-reader labels on custom icon buttons.
- Performance budget profiling:
  - Initial route JS bundle size <= baseline + 60KB gzip.
  - Steady 60fps verified during active 2-second SSE telemetry stream.
  - Background canvas CPU load <= 4% on mid laptop.
  - Verify zero Cumulative Layout Shift (CLS) on telemetry updates.
  - Verify lazy loading of ambient canvas and topology view.
- Responsive pass: Comprehensive visual and functional audit from 1280px desktop down to 390px mobile viewports across all 14 routes.
- Definition of Done verification: Zero hard-coded colours or font stacks outside token files; zero default Material surfaces; all existing tests pass.

### Out of Scope
- Introducing new functional features or modifying backend APIs.

## Steps
1. Run automated token scan across all SCSS, CSS, and HTML files to verify zero hard-coded hex codes, rgb values, or font stacks exist outside token definitions.
2. Conduct animation timing audit: check that only `transform` and `opacity` are animated and that all durations match `120 / 220 / 420 / 700ms`.
3. Run Lighthouse accessibility and contrast audit across all 14 routes. Fix any contrast, focus ring, or ARIA deficiencies.
4. Profile rendering performance in Chrome DevTools:
   - Record 30 seconds of live dashboard telemetry.
   - Verify steady 60fps frame rate without dropped frames.
   - Verify background canvas CPU consumption remains under 4%.
   - Check bundle analyzer to ensure initial JS bundle increase is under 60KB gzip.
5. Perform responsive viewport pass across 1280px, 1024px, 768px, and 390px breakpoints. Ensure tables, grids, and dialogs adapt without horizontal clipping or broken layouts.
6. Run full unit and end-to-end test suites (`npm test`, `ng build`, `npx playwright test`).

## Verification
- Run complete test suite and production build: `npm test && ng build --configuration production`.
- Run bundle size check and record gzip delta against baseline.
- Run Lighthouse accessibility audit on all routes (target: 100% a11y score, zero contrast violations).
- Capture final verification screenshots for all 14 routes at 1280px and 390px.
- Confirm Quiet Mode and reduced-motion toggles operate cleanly across the entire app.

## Report back
- Complete Performance & Accessibility Scorecard:
  - Initial JS bundle size increase (gzip).
  - Telemetry streaming average FPS and canvas CPU usage.
  - WCAG AA contrast compliance confirmation.
  - Token audit confirmation (zero hardcoded values).
- Verification screenshot gallery covering all 14 routes at desktop and mobile widths.
- Sign-off against each item in the Definition of Done.

## Stop
Stop here. This is the final phase of the redesign. Wait for final approval and sign-off.
