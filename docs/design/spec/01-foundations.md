# Design Foundations: Concept, Tokens, Typography & Motion

## Purpose
Governs the core "Flight Deck" product metaphor, global design tokens in CSS custom properties, self-hosted typography scale, status colours, elevation rules, and timing/motion tokens.

## Read first
none

## Requirements

### Role
You are a senior product designer and Angular 19 engineer. Redesign the ENTIRE presentation layer of DockPilot so it feels immersive, interactive, smooth and premium, like mission control for a private spacecraft, not a generic admin dashboard.

### Design Concept
Product metaphor: a pilot's flight deck for your containers. The host is the "core", containers are "craft" in orbit around it, alerts are "warnings on the panel". Everything should feel like looking at a lit instrument panel in a dark cockpit: depth, glow used with restraint, precise typography, data as the hero.

### Design Tokens (put in styles/theme.scss as CSS custom properties; remove all hard-coded colours elsewhere)

#### Surfaces (obsidian scale)
- `--bg-0`: `#060609` (app base)
- `--bg-1`: `#0B0B11`
- `--bg-2`: `#11111A`
- `--bg-3`: `#181824`
- `--bg-4`: `#20202E`

#### Lines
- `--line-soft`: `rgba(255,255,255,.05)`
- `--line`: `rgba(255,255,255,.09)`
- `--line-strong`: `rgba(255,255,255,.16)`

#### Text
- `--text`: `#ECEAF4`
- `--text-dim`: `#A09EB4`
- `--text-mute`: `#6B6980`

#### Brand Tokens
- Gold:
  - `--gold`: `#D4AF37`
  - `--gold-hi`: `#F2D27A`
  - `--gold-lo`: `#8C7424`
- Violet:
  - `--violet`: `#8B5CF6`
  - `--violet-hi`: `#B39DFF`
  - `--violet-lo`: `#4B2FA8`

#### Palette Usage Rules
- **Gold**: primary actions, key numbers, active nav, focus. Gold must cover under ~8% of any screen.
- **Violet**: live data, selection, hover glows, charts.
- Never use gold-to-violet gradients on large areas or text (avoid the generic AI-gradient look).

#### Status Tokens (kept distinct from brand)
- Running: `#34D399`
- Warning: `#F59E0B`
- Critical: `#F43F5E`
- Stopped: `#6B6980`
- Restarting: `#60A5FA`
- Each status has a matching soft glow token.

#### Geometry, Spacing & Blur
- **Radius**: `6 / 10 / 16 / 24px`
- **Spacing**: `4px` base scale
- **Blur**: `12 / 24 / 40px`

#### Elevation
- Replace drop shadows with layered inner highlights (1px top inner light line) plus subtle outer glow, so panels look like glass machined from dark metal.

#### Typography
- **Self-hosted**: Fonts self-hosted (e.g. `@fontsource`). No external CDN calls at runtime (the app may run on an isolated network).
- **Space Grotesk**: for UI and headings (tight letter-spacing on large sizes).
- **JetBrains Mono**: for ALL numbers, IDs, logs, timestamps and terminal.
- **Tabular figures**: Always `font-variant-numeric: tabular-nums` on live metrics so digits never jitter.
- **Type scale jump**: Type scale with a dramatic jump: huge metric numerals (48 to 72px, light weight) against small uppercase micro-labels (11px, 0.12em tracking).

#### Motion Tokens
- Easing:
  - `--ease-out`: `cubic-bezier(.22,1,.36,1)`
  - `--ease-inout`: `cubic-bezier(.65,0,.35,1)`
  - `--spring`: for number tweens
- Durations: `120 / 220 / 420 / 700ms`. Use these everywhere; no ad-hoc timings.
- Animate only `transform` and `opacity` (plus CSS custom properties driving them). No layout-thrashing animation. Target a steady 60fps with the 2-second SSE telemetry updates running.

#### Angular Material Visual Override
- Keep Angular Material / CDK for behaviour and accessibility (overlays, focus traps, menus, dialogs, a11y), but override its visuals completely through design tokens and custom components. No default-looking Material surface may remain visible.

## Acceptance criteria
- [ ] All tokens defined as CSS custom properties in `styles/theme.scss`.
- [ ] Obsidian surface scale `--bg-0` through `--bg-4` defined with verbatim hex codes.
- [ ] Border line tokens (`--line-soft`, `--line`, `--line-strong`) defined with verbatim rgba values.
- [ ] Text tokens (`--text`, `--text-dim`, `--text-mute`) defined with verbatim hex codes.
- [ ] Brand tokens for gold (`--gold`, `--gold-hi`, `--gold-lo`) and violet (`--violet`, `--violet-hi`, `--violet-lo`) defined with verbatim hex codes.
- [ ] Status tokens for running (`#34D399`), warning (`#F59E0B`), critical (`#F43F5E`), stopped (`#6B6980`), restarting (`#60A5FA`) defined with soft glow tokens distinct from brand.
- [ ] Gold coverage strictly under ~8% of screen area; no gold-to-violet gradient on large surfaces/text.
- [ ] Geometry scales implemented: radius `6 / 10 / 16 / 24px`, spacing `4px` base scale, blur `12 / 24 / 40px`.
- [ ] Layered inner highlight (1px top inner light line) and subtle outer glow replace standard drop shadows.
- [ ] Fonts Space Grotesk and JetBrains Mono self-hosted via `@fontsource` with zero external CDN calls.
- [ ] Space Grotesk applied to UI/headings; JetBrains Mono applied to all numbers, IDs, logs, timestamps, terminal.
- [ ] `font-variant-numeric: tabular-nums` applied to all live metrics.
- [ ] Type scale jump implemented: 48 to 72px light weight numerals vs 11px uppercase micro-labels with 0.12em tracking.
- [ ] Motion tokens (`--ease-out`, `--ease-inout`, `--spring`, durations `120 / 220 / 420 / 700ms`) configured globally without ad-hoc timings.
- [ ] Angular Material styling overridden completely with zero default-looking Material surfaces remaining.

## Must not
- Do NOT use generic white cards on grey.
- Do NOT keep default Material look.
- Do NOT use Inter or Roboto.
- Do NOT use purple-to-blue gradient hero blobs.
- Do NOT use gold-to-violet gradients on large areas or text (avoid the generic AI-gradient look).
- Do NOT hard-code colours or font stacks outside token files.
- Do NOT use ad-hoc animation timings or easing curves.
- Do NOT animate properties other than `transform` and `opacity` (and driving CSS custom properties).
- Do NOT make external runtime CDN calls for fonts or assets.
