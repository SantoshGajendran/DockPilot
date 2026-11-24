# Route Audit: User Profile (/profile)

## Overview & Visual Representation
- **Route Path**: `/profile`
- **Component**: `ProfileComponent` (`frontend/src/app/features/profile/profile.component.ts`)
- **Access Level**: Authenticated (`authGuard`, all roles)
- **Redesign Spec Reference**: `docs/design/pages/users-profile-settings.md`

### Screenshot Gallery
| Viewport / Theme | Dark Theme | Light Theme |
|---|---|---|
| **1920x1080 (Desktop Large)** | `screenshots/profile/populated-1920x1080-dark.png` | `screenshots/profile/populated-1920x1080-light.png` |
| **1440x900 (Laptop Standard)** | `screenshots/profile/populated-1440x900-dark.png` | `screenshots/profile/populated-1440x900-light.png` |
| **1280x720 (Desktop Compact)** | `screenshots/profile/populated-1280x720-dark.png` | `screenshots/profile/populated-1280x720-light.png` |
| **768x1024 (Tablet Portrait)** | `screenshots/profile/populated-768x1024-dark.png` | `screenshots/profile/populated-768x1024-light.png` |
| **390x844 (Mobile)** | `screenshots/profile/populated-390x844-dark.png` | `screenshots/profile/populated-390x844-light.png` |

---

## Findings

### DF-091 Session revoke icon buttons lack accessible text (button-name violation)
- Route(s): `/profile`
- Category / Severity / Impact / Effort: A11Y / S1 / 5 / XS
- What is wrong: The trash/cross icon button on each active session entry lacks an accessible name or label.
- Evidence: `frontend/src/app/features/profile/profile.component.html:142`, axe CRITICAL violation `button-name`.
- Why it matters: Screen readers announce "button" with no indication that clicking will terminate a session on another workstation.
- Recommended fix: Add `[attr.aria-label]="'Revoke session from ' + s.ip_address"` on the button.
- Related redesign file: `docs/design/spec/07-quality-gates.md`

### DF-092 Deep selector ::ng-deep overriding password input styling
- Route(s): `/profile`
- Category / Severity / Impact / Effort: CODE / S3 / 3 / XS
- What is wrong: `profile.component.scss` uses `::ng-deep .mat-mdc-form-field-icon-suffix { color: var(--gold) !important; }`.
- Evidence: `frontend/src/app/features/profile/profile.component.scss:273`.
- Why it matters: Pollutes global icon suffix colors across all other form fields in the app.
- Recommended fix: Scope the suffix color to `.profile-form-field .mat-mdc-form-field-icon-suffix` without `::ng-deep`.
- Related redesign file: `docs/design/spec/04-components.md`

### DF-093 Low contrast helper copy on 2FA enrollment card
- Route(s): `/profile`
- Category / Severity / Impact / Effort: COLOUR / S2 / 4 / XS
- What is wrong: The instructions for scanning the authenticator QR code render `#64748B` on `#08090E`, measuring 3.12:1 contrast ratio, failing WCAG AA (4.5:1 required).
- Evidence: `screenshots/profile/populated-1440x900-dark.png`, `frontend/src/app/features/profile/profile.component.scss:164`, axe violation `color-contrast`.
- Why it matters: Users configuring security credentials struggle to read recovery token warnings.
- Recommended fix: Set helper copy color to `var(--text-dim)` (`#A09EB4`, contrast 5.4:1).
- Related redesign file: `docs/design/pages/users-profile-settings.md`

### DF-094 Hardcoded white background in QR code container
- Route(s): `/profile`
- Category / Severity / Impact / Effort: VISUAL / S3 / 2 / XS
- What is wrong: The QR code canvas container uses hardcoded `#FFFFFF` with no border radius or padding, creating an unstyled stark white rectangle that breaks the dark obsidian atmosphere.
- Evidence: `screenshots/profile/populated-1440x900-dark.png`, `frontend/src/app/features/profile/profile.component.scss:188`.
- Why it matters: Blinding glare contrast in dark room cockpit environments.
- Recommended fix: Wrap the QR code in an obsidian bezel with rounded corners (`border-radius: 12px; padding: 12px; background: #FFFFFF; box-shadow: 0 0 20px rgba(212, 175, 55, 0.2);`).
- Related redesign file: `docs/design/spec/04-components.md`

### DF-095 Destructive "Revoke All Sessions" lacks prominent danger warning
- Route(s): `/profile`
- Category / Severity / Impact / Effort: COMPONENT / S2 / 4 / S
- What is wrong: The "Revoke All Other Sessions" action uses standard neutral outline styling, identical to non-destructive actions.
- Evidence: `frontend/src/app/features/profile/profile.component.html:158`, `profile.component.scss:112`.
- Why it matters: Accidental session invalidation during casual account inspection.
- Recommended fix: Apply warning borders and distinct confirmation dialog: "This will terminate 3 active sessions across other devices".
- Related redesign file: `docs/design/pages/users-profile-settings.md`

---

## What Works Well
- 2FA TOTP setup displays both camera QR code and manual base32 secret key for flexible enrollment.
- Active session list includes IP address, user agent, and expiration timestamp.
- Password change form includes real-time strength validation.

---

## Top 3 Improvements
1. Add accessible labels to session revocation icon buttons.
2. Bezel-mount the 2FA QR code with refined border radius and soft ambient glow.
3. Fix helper text contrast to comply with WCAG AA.
