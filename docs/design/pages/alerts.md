# Page: Alerts & Notification Channels (/alerts)

## Purpose
Governs active threshold incident reporting, severity-colored edge-lit panels, clean alert rule configuration with custom animated toggle switches, and notification channel dispatch testing.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md
- docs/design/spec/06-states-microcopy.md

## Requirements

### Route Path & Metadata
- **Route path**: `/alerts`
- **Data used**: Active alerts list (alert ID, rule ID, container ID/name, severity: `warning`/`critical`, message, triggered timestamp), alert rules list (metric threshold, evaluation window, target containers, enabled state), notification channels (channel type: webhook/Slack/email/Discord, config, delivery test status).

### Active Alerts Panels
- Rendered as prominent, high-visibility panels (`GlassPanel`):
  - **Severity-coloured edge light**: A 2px glowing left border and subtle diffuse illumination:
    - Critical alerts: Glowing rose edge (`#F43F5E`).
    - Warning alerts: Glowing amber edge (`#F59E0B`).
  - Container target name, metric value triggering threshold, duration active, and quick acknowledge/silence action buttons.

### Rules List & Custom Toggle Switches
- Alert rules displayed as a clean, structured list.
- **Custom animated toggle switches**: Custom switches with smooth sliding thumb and subtle glow when active. No default Material slide-toggles.
- Metric threshold summary chips (e.g. `CPU > 85% for 60s`).

### Notification Channels & Test Send
- Notification channels cards (Webhook, Slack, Discord, Email).
- Includes a dedicated `"TEST SEND"` button for each configured channel.
- Displays delivery confirmation or error status directly inline next to the button (e.g. `"DELIVERED 200 OK (142ms)"` in `#34D399` or failure details in `#F43F5E`) without a full-page modal.

### Signature Components Used
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Alert cards and rule list items.
- [StatusDot](file:///docs/design/spec/04-components.md#5-statusdot) - Severity and channel status indicators.
- [MetricNumber](file:///docs/design/spec/04-components.md#2-metricnumber) - Active alert count badges.
- [Toast](file:///docs/design/spec/04-components.md#10-toast) - Delivery test confirmation toasts.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Alert panels loading states.
- [EmptyState](file:///docs/design/spec/04-components.md#8-emptystate) - Zero active alerts view.

### Designed States
- **Loading state**: Active alert panels and rule rows pulse with `SkeletonShimmer`.
- **Empty state**: Prominent empty card with clean line art: `"DEFENSE SHIELD NORMAL // ZERO ACTIVE ALERTS"`.
- **Error state**: Alert sync error displays banner with retry action.
- **Offline state**: Top banner indicates offline state; test send buttons safely disabled.

## Acceptance criteria
- [ ] Active alerts feature severity-colored edge lighting (`#F43F5E` critical, `#F59E0B` warning).
- [ ] Alert rules list implements custom animated toggle switches without default Material controls.
- [ ] Notification channels render "test send" buttons with inline status resolution.
- [ ] Alert counts animate smoothly in badges.

## Must not
- Do NOT use standard Angular Material `mat-slide-toggle` styling.
- Do NOT open full-screen blocking modals for simple channel test-send actions.
- Do NOT use neon overload across the entire alert card (edge light must remain restrained).
