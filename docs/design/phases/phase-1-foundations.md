# Phase 1: Tokens, Fonts, Global Styles & Atmosphere

## Objective
Establish the foundational presentation architecture: configure self-hosted typography, implement obsidian and brand tokens in CSS custom properties, apply global Angular Material visual overrides, and render the data-driven ambient background canvas with film grain and vignette.

## Read first
- .agents/rules/design-guardrails.md
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/05-dataviz.md
- docs/design/spec/07-quality-gates.md

## Scope
### In Scope
- Install and configure self-hosted `@fontsource/space-grotesk` and `@fontsource/jetbrains-mono`.
- Implement CSS custom properties in `styles/theme.scss`: obsidian surface scale (`--bg-0` to `--bg-4`), line tokens (`--line-soft`, `--line`, `--line-strong`), text tokens (`--text`, `--text-dim`, `--text-mute`), brand gold (`--gold`, `--gold-hi`, `--gold-lo`), brand violet (`--violet`, `--violet-hi`, `--violet-lo`), status tokens (`#34D399`, `#F59E0B`, `#F43F5E`, `#6B6980`, `#60A5FA`) with soft glows.
- Implement geometry, spacing (`4px`), radius (`6 / 10 / 16 / 24px`), blur (`12 / 24 / 40px`), and elevation rules (1px top inner highlight + subtle outer glow).
- Implement motion tokens: easing (`--ease-out`, `--ease-inout`, `--spring`) and durations (`120 / 220 / 420 / 700ms`).
- Global Material / CDK theme overrides: eliminate default Material surfaces, typography, and elevation while preserving behavior and accessibility.
- Implement data-driven ambient background canvas: slow perspective dot grid, telemetry energy reaction (violet shimmer, gold pulse, red edge glow), 30fps cap, tab visibility pause, under 4% CPU budget.
- Implement static film grain overlay (3% opacity) and soft vignette.
- Create single delegated pointer listener for cursor spotlight `--mx/--my` (via `PointerFxService`).
- Create `ChartTheme` helper and `xterm.js` theme configuration.

### Out of Scope
- App shell layout components (sidebar, top bar, command palette) -> Phase 2.
- Signature shared components -> Phase 3.
- Page-level template modifications -> Phases 4, 5, 6.

## Steps
1. Install `@fontsource/space-grotesk` and `@fontsource/jetbrains-mono` as project dependencies. Verify zero external CDN links remain in `index.html`.
2. Define all CSS custom properties verbatim in `src/styles/theme.scss` according to `spec/01-foundations.md`.
3. Configure global typography rules: Space Grotesk for UI headings, JetBrains Mono for all numbers, IDs, timestamps, and terminal. Apply `tabular-nums` globally to metrics.
4. Add global styles overriding Angular Material components (buttons, dialogs, menus, overlays) to adopt obsidian tokens and 1px inner highlights.
5. Create `PointerFxService` to manage a single, rAF-throttled delegated pointer listener tracking `--mx` and `--my` on `:root`.
6. Create lazy-loaded `AmbientCanvasComponent` with perspective dot grid, host load state binding, 30fps clamp, and visibility observer.
7. Add static 3% film grain overlay and subtle vignette to the main app root layout.
8. Create `ChartTheme` helper wrapping Chart.js default options with token borders, violet lines, and glass tooltips.

## Verification
- Run `npm test` and `ng build` to ensure zero compilation or unit test regressions.
- Open the application in the browser at `http://localhost:4200`.
- Verify in browser DevTools that no requests are made to Google Fonts or external CDNs.
- Check CPU utilization of the background canvas in Chrome Task Manager (must be <4%).
- Capture screenshots at desktop (1280px) and mobile (390px) viewports showing typography, tokens, canvas, and grain.
- Verify canvas pauses when the browser tab is switched away.

## Report back
- Summary of files created and modified.
- Screenshot artifacts showing base canvas and typography.
- CPU benchmark measurements for the background canvas.
- Confirmation of zero CDN runtime calls.
- Any open questions or blockers encountered.

## Stop
Stop here. Do NOT proceed to Phase 2 until this phase report has been reviewed and approved.
