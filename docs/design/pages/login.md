# Page: Login (/login)

## Purpose
Governs the presentation design for the cinematic authentication portal, pointer-driven parallax background, brand mark ignition, multi-stage glass login card, and transition handoff to the application shell.

## Read first
- docs/design/spec/01-foundations.md
- docs/design/spec/02-atmosphere.md
- docs/design/spec/04-components.md

## Requirements

### Route Path & Metadata
- **Route path**: `/login`
- **Data used**: Username, password, TOTP code, authentication response token.

### Visual Presentation & Layout
- **Full-screen cinematic entry**:
  - Pixel grid field with a slow parallax tied to the pointer.
  - The DockPilot mark igniting in gold (`--gold #D4AF37`).
  - A single compact glass login card (`GlassPanel`).
- **Authentication flow**:
  - Primary step: username and password fields with floating labels and animated underlines.
  - TOTP step: slides in smoothly as a second panel (`120 / 220ms` duration).
- **Handoff transition**:
  - On success, the login card collapses seamlessly into the sidebar logo while the dashboard boots in.

### Signature Components Used
- [GlassPanel](file:///docs/design/spec/04-components.md#1-glasspanel) - Compact auth container with inner top highlight.
- [Primary Button](file:///docs/design/spec/04-components.md#primary-button) - Solid gold button with dark text and subtle magnetic pull.
- [SkeletonShimmer](file:///docs/design/spec/04-components.md#7-skeletonshimmer) - Auth submission state.
- [Toast](file:///docs/design/spec/04-components.md#10-toast) - Session expiration and auth error alerts.

### Designed States
- **Loading state**: Input fields and submission button display `SkeletonShimmer` pulse while verifying credentials with the server.
- **Empty state**: Clean initial presentation ready for operator credential input.
- **Error state**: Auth failure displays high-contrast critical highlight (`#F43F5E`) on inputs and operator error toast without clearing valid fields.
- **Offline state**: Top banner denotes unreachable authentication server.

## Acceptance criteria
- [ ] `/login` renders full-screen with dark obsidian canvas (`--bg-0 #060609`).
- [ ] Pixel grid exhibits gentle parallax reacting to pointer movement.
- [ ] DockPilot mark animates in with brand gold ignition glow.
- [ ] Glass login card renders with 1px top highlight and obsidian backdrop blur.
- [ ] Second authentication factor (TOTP) slides in smoothly as a secondary card stage.
- [ ] Successful login animates card collapse into the sidebar logo position.
- [ ] Fully functional and accessible across viewports from 1280px down to 390px.

## Must not
- Do NOT alter authentication contracts, session cookies, tokens, or route guards.
- Do NOT use standard white Material cards or inputs with default outlines.
- Do NOT use harsh jump cuts instead of the sliding panel transition for TOTP.
- Do NOT introduce layout thrashing during the card collapse animation.
