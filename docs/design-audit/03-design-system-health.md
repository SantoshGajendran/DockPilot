# Design System Health Audit

An evidence-based structural audit of DockPilot's design tokens, typography, CSS cleanliness, and Angular Material component integration.

---

## 1. Executive Metrics & Token Coverage

| Dimension | Measured Value | Standard Target | Status |
|---|---|---|---|
| **Token Coverage Ratio** | **41.2%** | > 95% | ❌ Severe Fragmentation |
| **Hardcoded Hex Colors** | **82 distinct** (425 occurrences) | 0 outside `theme.scss` | ❌ Critical Debt |
| **Hardcoded RGB/RGBA Colors**| **99 distinct** (423 occurrences) | 0 outside `theme.scss` | ❌ Critical Debt |
| **Non-4px Spacing Violations**| **11 distinct** (386 occurrences) | 0 (Strict 4px scale) | ❌ Inconsistent Rhythm |
| **`!important` Declarations** | **173 occurrences** | 0 | ❌ High Specificity Wars |
| **`::ng-deep` Overrides** | **11 occurrences** | 0 (Deprecated API) | ❌ Encapsulation Leak |
| **Inline `style="..."` Tags** | **24 occurrences** | 0 (Strict CSP) | ⚠️ Maintenance Hazard |

---

## 2. Color Inventory & Drift Analysis

### Defined Theme Tokens (`theme.scss`)
```scss
--bg-0: #060609;
--bg-1: #0B0B11;
--bg-2: #11111A;
--bg-3: #181824;
--bg-4: #20202E;
--text: #ECEAF4;
--text-dim: #A09EB4;
--text-mute: #6B6980;
--gold: #D4AF37;
--violet: #8B5CF6;
--status-running: #34D399;
--status-warning: #F59E0B;
--status-critical: #F43F5E;
--status-stopped: #6B6980;
```

### Top 15 Hardcoded Colors Bypassing Design Tokens
| Color Hex | Count | Intended Role | Associated Token Candidate | Sample Files |
|---|---|---|---|---|
| `#64748B` | 59 | Secondary text / Neutral slate | `--text-mute` (`#6B6980`) | `log-viewer.component.scss`, `resources.component.scss` |
| `#D4AF37` | 37 | Gold Brand Accent | `var(--gold)` | `host.component.scss`, `alerts.component.scss` |
| `#94A3B8` | 33 | Light slate body text | `--text-dim` (`#A09EB4`) | `compose/dialogs/job-output-dialog.component.scss` |
| `#F8FAFC` | 30 | Pure white-tint heading | `var(--text)` (`#ECEAF4`) | `users.component.scss`, `host.component.scss` |
| `#F43F5E` | 30 | Critical Rose Accent | `var(--status-critical)` | `containers-list.component.scss`, `alerts.component.scss` |
| `#10B981` | 22 | Emerald Green (Tailwind) | `var(--status-running)` (`#34D399`)| `events.component.scss`, `dashboard.component.scss` |
| `#F59E0B` | 21 | Warning Amber | `var(--status-warning)` | `events-timeline.component.scss`, `log-viewer.scss` |
| `#CBD5E1` | 16 | Light grey border/text | `--line-strong` | `audit.component.scss`, `alerts.component.scss` |
| `#0B0D14` | 15 | Off-obsidian card surface | `var(--bg-1)` / `var(--bg-2)` | `profile.component.scss`, `alerts.component.scss` |
| `#34D399` | 12 | Mint Running Accent | `var(--status-running)` | `containers-list.component.scss`, `settings.scss` |
| `#A78BFA` | 11 | Violet-400 Accent | `var(--violet-hi)` (`#B39DFF`) | `events-timeline.component.scss`, `resources.scss` |
| `#38BDF8` | 11 | Sky Blue Accent | `var(--status-restarting)` | `settings.component.scss`, `log-viewer.scss` |
| `#060609` | 9 | App Base Dark | `var(--bg-0)` | `audit.component.scss`, `compose-projects.scss` |
| `#E2E8F0` | 8 | Light border | `--line` | `compose-projects.scss`, `resources.scss` |
| `#FF9800` | 5 | Material Amber-500 | `var(--status-warning)` | `prune-wizard-dialog.component.scss` |

---

## 3. Typography Scale & Hierarchy

### Declared vs Loaded Fonts
- **Declared**: `'Space Grotesk', -apple-system, sans-serif;` for headings and display; `'JetBrains Mono', monospace;` for data, telemetry, and IDs.
- **Loaded**: Via `@fontsource/space-grotesk` and `@fontsource/jetbrains-mono` in `styles.scss`.
- **Finding**: Font loading is clean with zero FOIT/FOUT due to local bundling. However, numeric jitter occurs due to missing `font-variant-numeric: tabular-nums;` on live telemetry cards.

### Type Combinations Inventory
The codebase contains **38 distinct combinations** of font-size, weight, and line-height. Standard design systems limit this to 8-10 scale steps.

| Token Step | Font Family | Size | Weight | Line Height | Usage Areas |
|---|---|---|---|---|---|
| **Display 1** | Space Grotesk | 28px | 700 | 34px | Overview Hero, Login Brand |
| **Heading 2** | Space Grotesk | 20px | 600 | 26px | Panel headers, Page titles |
| **Heading 3** | Space Grotesk | 16px | 600 | 22px | Card titles, Dialog headers |
| **Body 1** | Space Grotesk | 14px | 400 | 20px | Table content, Descriptions |
| **Body 2** | Space Grotesk | 12px | 400 | 18px | Secondary labels, timestamps |
| **Micro** | Space Grotesk | 10px | 700 | 14px | Uppercase classification tags |
| **Mono Data**| JetBrains Mono| 13px | 500 | 18px | CPU/RAM metrics, IP addresses |
| **Mono Code**| JetBrains Mono| 11.5px | 400 | 22px | Log lines, JSON payload diffs |

---

## 4. Spacing Inventory & Non-4px Scale Violations

DockPilot targets a strict geometric 4px scale (`4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px`). The static scan detected **386 non-4px spacing values** across 27 SCSS files.

| Value (px) | Occurrences | Sample Files | Correct Token Replacement |
|---|---|---|---|
| **6px** | 94 | `resources.component.scss`, `host.component.scss` | `8px` (`var(--space-2)`) |
| **10px** | 90 | `login.component.scss`, `container-terminal.scss` | `12px` (`var(--space-3)`) |
| **1px** | 74 | `prune-wizard-dialog.scss`, `alerts.scss` | Border hairline / omit margin |
| **14px** | 46 | `dev-components.component.scss`, `login.scss` | `16px` (`var(--space-4)`) |
| **18px** | 32 | `settings.component.scss`, `dashboard.scss` | `16px` or `20px` |
| **22px** | 24 | `settings.component.scss`, `users.scss` | `24px` (`var(--space-6)`) |
| **5px** | 12 | `log-viewer.component.scss` | `4px` (`var(--space-1)`) |
| **7px** | 8 | `events-timeline.component.scss` | `8px` (`var(--space-2)`) |
| **9px** | 6 | `compose-projects.component.scss` | `8px` (`var(--space-2)`) |

---

## 5. Angular Material Overrides & Brittle Selectors

The codebase contains **11 `::ng-deep` selector blocks** and **173 `!important` flags** overriding Angular Material 19 MDC internals.

### High-Risk Overrides
1. **Slide Toggle Tracks**:
   `alerts.component.scss:313` and `settings.component.scss:391` use `::ng-deep .mat-mdc-slide-toggle .mdc-switch__track` with `!important`.
2. **Form Field Densities**:
   `logs-explorer.component.scss:27, 33, 143` forces custom heights via `::ng-deep .mat-mdc-text-field-wrapper`.
3. **Tab Headers**:
   `container-detail.component.scss:244` forces bottom borders via `::ng-deep .mat-mdc-tab-header`.
4. **Select Panel Overlays**:
   `users.component.scss:236` overrides overlay panels via `::ng-deep .mat-mdc-select-panel`.

---

## 6. Component Architecture & Missing Shared Primitives

| Missing Primitive | Current Workaround in Codebase | Recommended Refactoring |
|---|---|---|
| `<dp-metric-number>` | Hand-rolled `<span>` + inline width + manual unit formatting in 6 pages | Create atomic `<dp-metric-number [value]="v" [unit]="'MB'" [tabular]="true">` |
| `<dp-status-dot>` | Hand-rolled `width: 8px; height: 8px; border-radius: 50%` in 8 SCSS files | Standardize on `<dp-status-dot [status]="state" [pulse]="true">` |
| `<dp-empty-state>` | Plain text `<div>No items found</div>` copied across 5 feature modules | Shared `<dp-empty-state [icon]="'box'" [title]="'No containers'" [action]="'Deploy'">` |
| `<dp-code-block>` | Inline `<pre>` tags with manual overflow rules in 4 features | Shared `<dp-code-block [code]="raw" [language]="'json'" [copyable]="true">` |
