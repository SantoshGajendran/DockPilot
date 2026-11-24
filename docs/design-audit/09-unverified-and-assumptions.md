# Unverified Items & Architectural Assumptions

A transparent record of environment constraints, simulated operational states, and assumptions made during this presentation layer audit.

---

## 1. Unverified States & Environment Constraints

### 1.1 Physical Linux Docker Daemon Socket
- **Constraint**: The audit was executed on a Windows 11 host operating system lacking a local Linux Docker daemon (`/var/run/docker.sock`).
- **Audit Verification Mechanism**: The backend was executed using DockPilot's native `FakeGateway` architecture (`backend/app/docker/fake.py`), which faithfully models container lifecycles, exec PTY sessions, live telemetry streams, resource pruning, and inspect attributes.
- **Unverified Aspect**: Physical kernel-level cgroup v2 memory throttling, hardware thermal throttling, and raw socket connection dropouts (e.g. Docker daemon crash/restart) could not be verified on bare-metal Linux hardware.

### 1.2 Live External Webhook & Cloud Notification Delivery
- **Constraint**: Outbound network requests to third-party endpoints (Slack webhook, Telegram Bot API, Discord webhooks, SMTP email relays) were not connected to live external credentials during the audit.
- **Audit Verification Mechanism**: Notification channel interfaces, creation dialogs, form validation, and delivery audit log tables were verified via simulated gateway responses.
- **Unverified Aspect**: Live external webhook rate-limiting and actual Slack rich message card formatting could not be visually confirmed inside the third-party Slack/Discord client UIs.

### 1.3 High-Density Production Fleet Scale (200+ Active Containers)
- **Constraint**: The test environment was populated with a seeded fleet of 6 canonical containers (`dockpilot-redis`, `dockpilot-postgres`, etc.).
- **Audit Verification Mechanism**: Virtual scrolling performance in the log explorer and container list was tested by synthesizing 2,000 log lines and evaluating DOM node counts.
- **Unverified Aspect**: Layout density and browser rendering performance when displaying a massive fleet of 200+ distinct containers with simultaneously streaming stats was not measured under real multi-core server load.

---

## 2. Key Operational Assumptions

1. **Authentication Architecture**:
   - Assumed that production installations enforce authentication via HTTP-only session cookies and bearer JWTs, matching the test runner configuration.
2. **Viewport Representation**:
   - Assumed that the 5 audited viewports (`1920x1080`, `1440x900`, `1280x720`, `768x1024`, `390x844`) accurately represent the primary workstation, laptop, tablet, and mobile devices utilized by operations teams.
3. **Browser Engine Consistency**:
   - Automated visual and accessibility checks were executed on Chromium. It is assumed that Chromium's rendering of Angular Material MDC and flexbox layouts represents parity with Gecko (Firefox) and WebKit (Safari), subject to standard CSS vendor prefixing.
