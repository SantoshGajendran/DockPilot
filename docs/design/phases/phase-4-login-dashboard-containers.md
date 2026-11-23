# Phase 4: Login, Dashboard & Containers Core Pages

## Objective
Redesign the primary tier of application pages: the cinematic authentication portal (`/login`), the operations command deck (`/dashboard`) with orbital container visualization and bento telemetry grid, the dense container inventory table (`/containers`), and the deep container inspection view (`/containers/:id`) with bezel-mounted web terminal.

## Read first
- .agents/rules/design-guardrails.md
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/03-app-shell.md
- docs/design/spec/04-components.md
- docs/design/spec/05-dataviz.md
- docs/design/spec/06-states-microcopy.md
- docs/design/spec/07-quality-gates.md
- docs/design/pages/login.md
- docs/design/pages/dashboard.md
- docs/design/pages/containers.md
- docs/design/pages/container-detail.md

## Scope
### In Scope
- `/login`: Full-screen cinematic layout, pointer-driven pixel grid parallax, gold logo ignition, sliding two-stage TOTP panel, card collapse into sidebar logo on success.
- `/dashboard`: First-load "systems online" boot sequence (<1.2s skippable), central orbital visualization (host core rings + orbiting container craft nodes), unequal bento grid tiles, live SSE streaming number tweens and sliding sparklines.
- `/containers`: Dense monospace table, inline sparklines that illuminate on row hover, quick actions fade-in, floating bottom bulk-action bar, saved filter chips, compose project grouping, shared-element transition to detail view.
- `/containers/:id`: Shared-element header transition, large radial gauges for CPU and RAM, sliding tab underline, bezel terminal container with subtle scanlines and cathode glow, `JetBrains Mono` font, session timer.
- Designed skeleton, empty, error (with retry), and offline states across all four routes.

### Out of Scope
- Host server, logs, events, alerts, projects, resources pages -> Phase 5.
- Admin, audit, settings, and profile pages -> Phase 6.

## Steps
1. Redesign `/login` template and styles per `pages/login.md`. Wire up pointer parallax, TOTP slide animation, and login success collapse animation.
2. Build the orbital visualization component for `/dashboard` hero section. Map host core concentric rings and orbiting container nodes scaled by telemetry load.
3. Build the `/dashboard` bento grid layout with unequal adjacent tile geometries. Integrate `ChartTheme` host load chart, top consumers list, alerts feed, events timeline, donut container state breakdown, and I/O sparklines.
4. Implement the skippable <1.2s boot sequence on first dashboard session load.
5. Redesign `/containers` table per `pages/containers.md`. Integrate inline `Sparkline` components, row hover quick actions, filter chips, and floating bottom bulk-action bar.
6. Configure the shared-element view transition linking container row title/status dot to `/containers/:id` header.
7. Redesign `/containers/:id` detail view per `pages/container-detail.md`. Add large `RadialGauge` components, sliding tab underline indicator, and bezel-mounted `xterm.js` terminal with scanlines and session timer.
8. Wire up skeleton loading states, empty states, error states with retry, and offline indicators across all four pages.

## Verification
- Run `npm test` and `ng build`. Fix any broken component markup in existing unit tests.
- Navigate to `/login`: verify parallax movement and TOTP panel slide.
- Log in and verify card collapses into sidebar while dashboard boots in.
- Verify `/dashboard` orbital visualization renders at 60fps with live 2s SSE telemetry updates; ensure numbers tween and sparklines slide without layout shifts.
- Navigate to `/containers`: verify inline sparklines illuminate on row hover; click a row and confirm shared-element transition morphs smoothly into container detail header.
- On `/containers/:id`: test tab switching with sliding underline; verify terminal renders scanline bezel and `JetBrains Mono` text.
- Capture screenshots at 1280px and 390px for each of the four routes.

## Report back
- Summary of page implementations.
- Desktop and mobile screenshots for `/login`, `/dashboard`, `/containers`, and `/containers/:id`.
- Frame-rate profiling confirmation during live SSE updates on dashboard.
- Any open questions or deviations.

## Stop
Stop here. Do NOT proceed to Phase 5 until this phase report has been reviewed and approved.
