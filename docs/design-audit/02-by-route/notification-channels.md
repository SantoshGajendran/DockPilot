# Route Audit: Notification Channels (/alerts/channels)

## Overview & Visual Representation
- **Route Path**: `/alerts/channels`
- **Component**: `NotificationChannelsComponent` (`frontend/src/app/features/alerts/channels/notification-channels.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/alerts.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/notification-channels/populated-1920x1080-dark.png` | `screenshots/notification-channels/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/notification-channels/populated-1440x900-dark.png` | `screenshots/notification-channels/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/notification-channels/populated-1280x720-dark.png` | `screenshots/notification-channels/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/notification-channels/populated-768x1024-dark.png` | `screenshots/notification-channels/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/notification-channels/populated-390x844-dark.png` | `screenshots/notification-channels/populated-390x844-light.png` |

---

## Findings

### DF-064 Low contrast destination URLs in channel cards
- Route(s): `/alerts/channels`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: Webhook target URLs (e.g. `https://hooks.slack.com/services/...`) render `#64748B` on `#08090E`, measuring a 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/notification-channels/populated-1440x900-dark.png`, `frontend/src/app/features/alerts/channels/notification-channels.component.scss:84`, axe violation `color-contrast`.
- Why it matters: Operators cannot easily verify target endpoints during configuration review.
- Recommended fix: Bind destination URLs to `var(--text-dim)` (`#A09EB4` dark, `#545268` light).
- Related redesign file: `docs/design/pages/alerts.md`

### DF-065 Deep selector ::ng-deep overriding form field borders
- Route(s): `/alerts/channels`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: Custom outline colors are forced onto Angular Material fields via `::ng-deep .mat-mdc-text-field-wrapper { border-color: rgba(255, 255, 255, 0.1) !important; }`.
- Evidence: `frontend/src/app/features/alerts/channels/notification-channels.component.scss:257`.
- Why it matters: Breaks style encapsulation, overrides accessibility high-contrast focus rings, and fails on Material component updates.
- Recommended fix: Apply theme tokens (`--mdc-outlined-text-field-outline-color`) in `theme.scss`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-066 Channel test button lacks loading indicator
- Route(s): `/alerts/channels`
- Category / Severity / Impact / Effort: MOTION / S3 / 3 / S
- What is wrong: Clicking "Send Test Notification" sends an HTTP test dispatch without disabling the button or displaying a loading spinner during external API latency (Slack/Telegram webhook round-trip).
- Evidence: `frontend/src/app/features/alerts/channels/notification-channels.component.ts:134`.
- Why it matters: Users believe the click did not register and click repeatedly, triggering webhook rate-limiting.
- Recommended fix: Bind button state to `[disabled]="isTesting()"` and display an inline spinning radar icon.
- Related redesign file: `docs/design/spec/06-states-microcopy.md`

### DF-067 Channel delivery log collapses on mobile viewports
- Route(s): `/alerts/channels`
- Category / Severity / Impact / Effort: RESPONSIVE / S2 / 3 / S
- What is wrong: The delivery audit table showing recent dispatch attempts, HTTP status codes, and latency truncates error response messages on 390px screens.
- Evidence: `screenshots/notification-channels/populated-390x844-dark.png`.
- Why it matters: Mobile administrators cannot read webhook rejection error details.
- Recommended fix: Stack delivery log rows into expandable incident cards on mobile.
- Related redesign file: `docs/design/pages/alerts.md`

### DF-068 Non-standard 10px and 14px padding in channel headers
- Route(s): `/alerts/channels`
- Category / Severity / Impact / Effort: LAYOUT / S3 / 3 / XS
- What is wrong: The channel card header uses `padding: 10px 14px;` instead of the 4px geometric scale.
- Evidence: `frontend/src/app/features/alerts/channels/notification-channels.component.scss:48`.
- Why it matters: Visual rhythm misalignment relative to standard 16px and 24px container cards.
- Recommended fix: Change padding to `12px 16px` (`var(--space-3) var(--space-4)`).
- Related redesign file: `docs/design/spec/01-foundations.md`

---

## What Works Well
- Integration type logos (Slack, Telegram, Webhook, Discord) provide immediate visual brand recognition.
- Delivery status chips (Delivered, Failed, Retrying) clearly convey external pipeline health.
- Test dispatch modal allows quick verification of webhook payloads.

---

## Top 3 Improvements
1. Fix webhook URL contrast ratio to satisfy WCAG AA minimum 4.5:1.
2. Add inline loading spinner on the test notification action.
3. Migrate `::ng-deep` form field borders to Angular Material design tokens.
