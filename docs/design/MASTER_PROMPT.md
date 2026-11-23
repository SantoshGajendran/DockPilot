# DockPilot: Full UI Redesign Master Prompt ("Flight Deck")

## ROLE
You are a senior product designer and Angular 19 engineer. Redesign the ENTIRE presentation layer of DockPilot so it feels immersive, interactive, smooth and premium, like mission control for a private spacecraft, not a generic admin dashboard.

## HARD CONSTRAINTS (do not violate)
1. Presentation layer only. Do NOT change backend, API contracts, route paths, guards, interceptors, Signal store logic, models, RBAC behaviour, or the two-phase confirmation/audit flows. You may add presentation-only services (e.g. MotionService, PointerFxService).
2. Angular 19 standalone + Signals, zoneless-ready. No new state-management libraries.
3. Keep Angular Material / CDK for behaviour and accessibility (overlays, focus traps, menus, dialogs, a11y), but override its visuals completely through design tokens and custom components. No default-looking Material surface may remain visible.
4. Fonts self-hosted (e.g. @fontsource). No external CDN calls at runtime (the app may run on an isolated network).
5. Animate only transform and opacity (plus CSS custom properties driving them). No layout-thrashing animation. Target a steady 60fps with the 2-second SSE telemetry updates running.
6. Honor prefers-reduced-motion and add a user-facing "Quiet Mode" toggle in Settings/Profile that disables ambient effects, tilt, parallax and the background canvas, keeping only fades.
7. WCAG AA contrast on all text. Full keyboard navigation with visible focus rings in the brand colour.
8. Everything must work at 1280px desktop down to 390px mobile.

## DESIGN CONCEPT
Product metaphor: a pilot's flight deck for your containers. The host is the "core", containers are "craft" in orbit around it, alerts are "warnings on the panel". Everything should feel like looking at a lit instrument panel in a dark cockpit: depth, glow used with restraint, precise typography, data as the hero.

## DESIGN TOKENS (put in styles/theme.scss as CSS custom properties; remove all hard-coded colours elsewhere)
Surfaces (obsidian scale):
  --bg-0 #060609 (app base), --bg-1 #0B0B11, --bg-2 #11111A, --bg-3 #181824, --bg-4 #20202E
Lines: --line-soft rgba(255,255,255,.05), --line: rgba(255,255,255,.09), --line-strong rgba(255,255,255,.16)
Text: --text #ECEAF4, --text-dim #A09EB4, --text-mute #6B6980
Brand: gold --gold #D4AF37, --gold-hi #F2D27A, --gold-lo #8C7424; violet --violet #8B5CF6, --violet-hi #B39DFF, --violet-lo #4B2FA8
Usage rule: gold = primary actions, key numbers, active nav, focus. Violet = live data, selection, hover glows, charts. Gold must cover under ~8% of any screen. Never use gold-to-violet gradients on large areas or text (avoid the generic AI-gradient look).
Status (kept distinct from brand): running #34D399, warning #F59E0B, critical #F43F5E, stopped #6B6980, restarting #60A5FA. Each status has a matching soft glow token.
Radius: 6 / 10 / 16 / 24px. Spacing: 4px base scale. Blur: 12 / 24 / 40px.
Elevation: replace drop shadows with layered inner highlights (1px top inner light line) plus subtle outer glow, so panels look like glass machined from dark metal.
Typography: Space Grotesk for UI and headings (tight letter-spacing on large sizes), JetBrains Mono for ALL numbers, IDs, logs, timestamps and terminal. Always font-variant-numeric: tabular-nums on live metrics so digits never jitter. Type scale with a dramatic jump: huge metric numerals (48 to 72px, light weight) against small uppercase micro-labels (11px, 0.12em tracking).
Motion tokens: easing --ease-out cubic-bezier(.22,1,.36,1), --ease-inout cubic-bezier(.65,0,.35,1), --spring for number tweens; durations 120 / 220 / 420 / 700ms. Use these everywhere; no ad-hoc timings.

## GLOBAL ATMOSPHERE (the part that makes it feel immersive)
- Ambient background canvas behind the whole app: a very faint pixel/dot grid in perspective that drifts slowly. It is DATA-DRIVEN: host load changes its energy (calm violet shimmer when healthy, slow gold pulse on warnings, a thin red edge glow on critical alerts). Cap at 30fps, pause when the tab is hidden, disable in Quiet Mode.
- Subtle film grain overlay (static, 3% opacity) and a soft vignette so black never looks flat.
- Cursor spotlight: panels get a radial highlight that follows the pointer (set --mx/--my with ONE delegated pointermove listener, rAF-throttled; never per-component listeners).
- Page transitions: enable router withViewTransitions(); content fades and rises 12px with a 40ms stagger between blocks. Container list row to detail uses a shared-element transition (the row's name and status dot morph into the detail header).
- First load of the dashboard per session: a short (under 1.2s, skippable) "systems online" boot sequence where panels power on in order.

## APP SHELL
- Sidebar: slim icon rail that expands on hover or pin to a full labelled panel; active item has a gold left indicator that slides between items (animated, not jumping), icons are custom stroke icons with 1.5px weight, not default Material icons. Group items with micro-labels (MONITOR, CONTROL, SYSTEM).
- Top bar: translucent glass with backdrop blur, breadcrumb, global search that opens the Command Palette, live connection indicator (pulsing dot + latency from SSE heartbeat), alert bell with animated count badge and a dropdown preview of active alerts.
- Command Palette (Ctrl/Cmd+K): fuzzy search across containers, projects, pages and actions (restart, open logs, open terminal), keyboard-first, recent items, animated open/close, respects RBAC (hide actions the role cannot perform).
- Keyboard shortcuts overlay (press ?). g d, g c, g l style navigation.

## SIGNATURE COMPONENTS (build once in shared/, reuse everywhere)
1. GlassPanel: layered surface with inner highlight, spotlight hover, optional animated border sweep when focused/selected.
2. MetricNumber: large mono numeral that tweens between values with a spring (never snaps), colour shifts by threshold, tiny delta arrow.
3. Sparkline: lightweight SVG, gradient area under line, draws in on first render, updates by shifting (no redraw flicker).
4. RadialGauge: thin-ring SVG gauge with glowing arc head and threshold tick marks.
5. StatusDot: status colour + soft glow + pulse only for "running"/"restarting"; static for stopped.
6. HeatTile grid: each container as a small tile coloured by load, hover shows a mini card, click navigates.
7. SkeletonShimmer: used for every loading state, shaped like the real content.
8. EmptyState: illustrated with simple line art plus a clear next action (never a bare "No data").
9. ConfirmDangerDialog: the two-phase confirmation token flow re-skinned as a hold-to-confirm button (press and hold 1.2s, ring fills) with the target name typed or displayed prominently. Logic unchanged.
10. Toast: stacked, slides from the bottom-right with progress bar, severity glyph.
Buttons: primary = solid gold with dark text and a soft inner glow; secondary = glass outline; destructive = rose outline that fills on hold. Subtle magnetic hover (max 4px pull) on primary buttons only. Press state scales to 0.97.

## PAGE-BY-PAGE DIRECTION
/login: Full-screen cinematic entry. Pixel grid field with a slow parallax tied to the pointer, the DockPilot mark igniting in gold, a single compact glass login card (username, password, TOTP step slides in as a second panel). On success, the card collapses into the sidebar logo and the dashboard boots in.
/dashboard ("Command Deck"): Hero = an orbital visualization: host core in the centre as concentric rings (CPU, memory, disk) with containers as nodes orbiting at distances scaled by resource use, status-coloured, hover to preview stats, click to open. Below, a bento grid with unequal tile sizes: live host load chart, top consumers, active alerts feed, recent events timeline, container state breakdown (donut), network/disk I/O sparklines. No two adjacent tiles may look identical. Live updates must feel alive: numbers tween, sparklines slide, new events slide in from the top.
/containers: Dense but beautiful table. Row = status dot, name, image, uptime, CPU and memory with inline sparklines, ports as chips. Quick actions fade in on row hover; multi-select reveals a floating bulk-action bar from the bottom. Saved filter chips, instant search, group-by compose project. Row hover lights up its sparklines.
/containers/:id: Glass header with morphing title, big radial gauges, tabbed body (Overview, Logs, Terminal, Inspect, Events) with a sliding tab underline. Terminal sits in a bezel-like panel with a very subtle scanline and glow, font JetBrains Mono, connection state indicator, session timer.
/host: Instrument-cluster layout: large radial gauges, per-core CPU bars that ripple, disk usage as stacked segmented bars, load average as a three-needle dial, uptime as a ticking counter.
/projects (Compose): Project cards with a mini status strip of their services; project detail adds a Topology view, an interactive node graph (SVG or canvas, drag and zoom) of services and networks using only data the API already provides; if network data is not available, skip it and tell me.
/logs: Premium log viewer: virtual scroll, level-coloured gutter bar, JSON auto-prettify on click, in-line regex highlight, pause/resume with "N new lines" pill, minimap of error density along the scrollbar, multi-container merged view with colour-coded source tags.
/events: Vertical timeline with animated connectors, OOM / crash / restart-loop events given distinct iconography and a subtle glow.
/alerts: Active alerts as prominent panels with severity-coloured edge light, rules as a clean list with toggle switches (custom, animated), channels with a "test send" button that shows delivery status inline.
/resources: Images, volumes, networks as tabbed gallery cards with size bars. Prune uses the hold-to-confirm component.
/audit: Time-ordered ledger look: monospace, subtle row dividers, status chips (pending/success/failure), expandable payload drawer that slides from the right.
/users, /profile, /settings: Calm, spacious forms. Custom inputs (floating label, animated underline, no default Material outlines), grouped into glass sections with a sticky save bar that appears only when there are unsaved changes (reuse pendingChangesGuard).

## DATA-VIZ THEMING
Charts: no heavy gridlines, 1px dim horizontal guides only, 2px lines in violet-hi with a gradient fill fading to transparent, crosshair with a glass tooltip, gold only for the highlighted/selected series or threshold line. Animate on first draw and use smooth interpolation on update. Keep Chart.js unless profiling shows dropped frames; wrap it in a single ChartTheme helper so all charts inherit the style. Re-theme xterm.js to the token palette.

## STATES & MICROCOPY
Every view needs designed loading (skeleton), empty, error (with retry), and offline/reconnecting states (a slim top banner with a pulsing indicator while SSE backs off). Replace generic copy with short, confident, operator-style language.

## ANTI-PATTERNS (do NOT do these)
Generic white cards on grey; default Material look; Inter/Roboto; purple-to-blue gradient hero blobs; emoji as icons; identical equal-sized card grids; drop-shadow-everything; centered-everything layouts; decorative animation that doesn't carry meaning; stock illustration; neon overload.

## PERFORMANCE BUDGET
Initial route JS under the current size plus 60KB gzip for all new visual code; lazy-load the ambient canvas and topology view; no animation work off-screen (use IntersectionObserver); background canvas under 4% CPU on a mid laptop; no layout shift from live updates.

## EXECUTION PLAN (do in order; stop and report after each phase)
Phase 1: Tokens, fonts, global styles, Material overrides, ambient background, grain/vignette.
Phase 2: App shell (sidebar, top bar, command palette, transitions).
Phase 3: Shared signature components and Storybook-style demo route (dev-only) to review them.
Phase 4: Login, Dashboard (Command Deck), Containers list and detail.
Phase 5: Host, Logs, Events, Alerts, Projects (+ topology), Resources.
Phase 6: Audit, Users, Profile, Settings, Quiet Mode, reduced-motion pass.
Phase 7: Polish: timing audit, a11y audit, performance profile, responsive pass.
After EACH phase: run build, lint and existing tests (fix anything broken, update tests only for changed markup), open the app in the browser, capture screenshots at desktop and mobile widths, and list what changed, what you skipped and why.

## DEFINITION OF DONE
- Zero hard-coded colours or font stacks outside the token files.
- Looks and feels cohesive across all 14 routes; no leftover default Material styling.
- 60fps during live telemetry, verified in a performance profile.
- Quiet Mode and reduced-motion both fully functional.
- All existing functionality and tests still pass.