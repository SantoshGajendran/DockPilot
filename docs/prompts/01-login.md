# Master Prompt 1: Login Page

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** secure sign-in with role-aware sessions.

**Backend**

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.
- Argon2 password hashing. Access token (short-lived) in the response body; refresh token in an httpOnly, SameSite cookie.
- Login rate limiting and lockout after N failures (N from config). Audit every login success and failure.
- First-run bootstrap: if no users exist, create an admin from environment variables.

**Frontend**

- `/login` route: reactive form, inline validation, show/hide password, loading state, generic error message (no user enumeration).
- Silent refresh on app start; redirect back to the originally requested URL after login.
- Session-expired dialog when refresh fails.

**Tests:** wrong password, lockout, refresh rotation, logout invalidates refresh, guard redirects when unauthenticated, role guard blocks viewers from admin routes.
