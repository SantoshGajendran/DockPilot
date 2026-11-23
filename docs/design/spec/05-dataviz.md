# Data Visualization: Chart.js & xterm.js Theming

## Purpose
Governs the presentation styling, custom theming helper (`ChartTheme`), tooltip specifications for Chart.js charts, and dark obsidian token integration for the xterm.js web terminal.

## Read first
- docs/design/spec/01-foundations.md

## Requirements

### Data-Viz Theming
Charts: no heavy gridlines, 1px dim horizontal guides only, 2px lines in violet-hi with a gradient fill fading to transparent, crosshair with a glass tooltip, gold only for the highlighted/selected series or threshold line. Animate on first draw and use smooth interpolation on update. Keep Chart.js unless profiling shows dropped frames; wrap it in a single ChartTheme helper so all charts inherit the style. Re-theme xterm.js to the token palette.

#### Chart.js Specifications
- **ChartTheme helper**: Wrap Chart.js configurations in a single `ChartTheme` helper so all charts inherit the style.
- **Guides**: 1px dim horizontal guides only (`--line-soft rgba(255,255,255,.05)`), no heavy gridlines, no vertical gridlines.
- **Series lines**: 2px lines in `--violet-hi` (`#B39DFF`) with gradient fill fading to transparent.
- **Accents**: Gold (`--gold #D4AF37`) strictly for highlighted/selected series or threshold warning lines.
- **Crosshair & tooltips**: Glass tooltip with obsidian backdrop, 1px highlight, and `tabular-nums`.

#### xterm.js Palette Specifications
- Re-theme `xterm.js` to token palette:
  - Background: `--bg-0` (`#060609`) / bezel container `--bg-1` (`#0B0B11`)
  - Foreground: `--text` (`#ECEAF4`)
  - Cursor: `--gold` (`#D4AF37`)
  - Selection: `--violet-lo` (`#4B2FA8`)
  - ANSI mapped to status tokens: Green `#34D399`, Warning `#F59E0B`, Critical `#F43F5E`, Restarting `#60A5FA`, Stopped `#6B6980`
  - Font: `JetBrains Mono`

## Acceptance criteria
- [ ] Central `ChartTheme` service or utility created to supply Chart.js defaults across all views.
- [ ] Charts render without vertical gridlines and use only 1px dim horizontal guide lines.
- [ ] Primary telemetry series drawn with 2px stroke in `--violet-hi` and gradient transparent area fill.
- [ ] Threshold lines and active hover series highlighted in brand gold (`--gold`).
- [ ] Glass tooltip implemented with backdrop blur and monospace numeral styling.
- [ ] Charts animate on initial draw and smoothly interpolate coordinate shifts on 2s SSE updates.
- [ ] `xterm.js` configured with exact obsidian background, JetBrains Mono font, and mapped ANSI token palette.

## Must not
- Do NOT use heavy, contrasting gridlines or vertical grid divisions.
- Do NOT use default Chart.js color schemes or tooltips.
- Do NOT use gold for standard data series (gold reserved strictly for selection or threshold limits).
- Do NOT trigger full chart redraw flicker on incremental SSE data updates.
- Do NOT render terminal text in non-monospace fonts or default xterm white-on-black styling.
