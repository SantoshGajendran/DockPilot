# Signature Presentation Components & Buttons

## Purpose
Governs the design specifications for the 10 reusable signature components built once in `shared/` and the standardized button interaction variants.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md

## Requirements

### 10 Signature Components (build once in shared/, reuse everywhere)

#### 1. GlassPanel
- Layered surface with inner highlight (1px top inner light line) and subtle outer glow.
- Spotlight hover interaction tied to pointer `--mx/--my`.
- Optional animated border sweep when focused or selected.
- Replaces standard drop shadows.

#### 2. MetricNumber
- Large monospace numeral (`JetBrains Mono`, light weight, 48px to 72px).
- Tweens smoothly between values with a spring (`--spring`, never snaps).
- Always `font-variant-numeric: tabular-nums` to eliminate jitter.
- Colour shifts dynamically based on status thresholds.
- Tiny delta arrow displaying trend direction.

#### 3. Sparkline
- Lightweight SVG sparkline.
- Gradient area under the line fading towards transparent.
- Draws in smoothly on first render.
- Updates by shifting data points horizontally without redraw flicker.

#### 4. RadialGauge
- Thin-ring SVG gauge.
- Glowing arc head following current value.
- Threshold tick marks clearly visible along the track.

#### 5. StatusDot
- Displays status colour matching status tokens:
  - Running: `#34D399`
  - Warning: `#F59E0B`
  - Critical: `#F43F5E`
  - Stopped: `#6B6980`
  - Restarting: `#60A5FA`
- Soft glow token matching each status.
- Soft pulse animation ONLY for `running` and `restarting`.
- Completely static for `stopped`.

#### 6. HeatTile Grid
- Each container represented as a small interactive tile coloured by compute/memory load.
- Hover displays a floating mini card with quick container telemetry.
- Click immediately navigates to container detail.

#### 7. SkeletonShimmer
- Used across every loading state throughout the application.
- Shaped like the actual real content cards and metrics being loaded.
- Subtle moving sheen highlight across obsidian surface tokens.

#### 8. EmptyState
- Illustrated with simple line art.
- Provides a clear next action button/link.
- Never displays a bare "No data" message.

#### 9. ConfirmDangerDialog
- Re-skins the existing two-phase confirmation token flow.
- Formatted as a hold-to-confirm button: press and hold for 1.2s while circular ring fills.
- Target container/resource name typed or displayed prominently.
- Two-phase confirmation backend logic, token payload, and audit flows remain completely unchanged.

#### 10. Toast
- Stacked toast notification container.
- Slides in smoothly from the bottom-right of the viewport.
- Contains an animated progress bar timing auto-dismissal.
- Severity glyph denoting informational, warning, or critical status.

### Button Variants & Micro-Interactions

#### Primary Button
- Solid gold (`--gold #D4AF37`) with dark text (`--bg-0 #060609`).
- Soft inner glow.
- Subtle magnetic hover with a maximum 4px pull towards cursor.

#### Secondary Button
- Glass outline with translucent backdrop and subtle hover highlight.

#### Destructive Button
- Rose outline (`#F43F5E`) that fills on hold.
- Integrates with hold-to-confirm interaction.

#### Button Press State
- All button variants scale down to `0.97` on active press.

## Acceptance criteria
- [ ] All 10 signature components implemented in `shared/` with standalone Angular 19 architecture.
- [ ] `GlassPanel` renders 1px top highlight and responds to delegated `--mx/--my` spotlight values.
- [ ] `MetricNumber` animates values with spring curve, tabular figures, threshold colour transitions, and directional delta arrow.
- [ ] `Sparkline` SVG updates by shifting coordinates without canvas redraw flicker.
- [ ] `RadialGauge` renders glowing arc head and calibrated threshold markers.
- [ ] `StatusDot` pulses only when status is `running` or `restarting`; stopped dots remain static.
- [ ] `HeatTile` renders load colour mapping and reveals telemetry hover card.
- [ ] `SkeletonShimmer` matches precise geometry of target cards and data grids.
- [ ] `EmptyState` includes custom line art and designated action button.
- [ ] `ConfirmDangerDialog` enforces 1.2s press-and-hold ring fill before dispatching token confirmation.
- [ ] `Toast` stacks at bottom-right with progress bar and severity icon.
- [ ] Primary buttons display gold styling with 4px magnetic cursor pull; all buttons scale to 0.97 on press.

## Must not
- Do NOT use standard drop shadows instead of layered inner highlights.
- Do NOT snap `MetricNumber` digits without spring tweening.
- Do NOT cause digits to jitter by omitting `font-variant-numeric: tabular-nums`.
- Do NOT pulse `StatusDot` for stopped or paused containers.
- Do NOT render bare "No data" text without line art and actionable next step.
- Do NOT alter the underlying two-phase confirmation tokens, guards, or audit APIs.
- Do NOT apply magnetic hover exceeding 4px pull or apply magnetic pull to secondary/destructive buttons.
- Do NOT use default Material buttons or ripple effects.
