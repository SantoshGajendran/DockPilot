# Master Prompt 14: Users and Roles

## Global Rules

1. No hardcoded domain terms anywhere: thresholds, intervals, container names, labels, roles, colours and route titles all come from `config/*.yaml`, the database or a typed constants file.
2. Every backend feature has a service layer, a router, schemas and tests. The Docker client sits behind an abstract interface so tests use a fake.
3. Every Angular page is a lazy-loaded standalone route with a typed API service, loading, empty and error states, and a unit test.
4. Every control action writes an audit record before it runs, then updates it with the result.
5. Role checks (viewer, operator, admin) are enforced in the backend first and mirrored in the UI.
6. Never expose the backend publicly. Default bind is `127.0.0.1`.
7. Finish each prompt with: tests passing, a short README section for the page, and a stop. Wait for the next prompt.

---

**Goal:** manage who can see and do what.

**Backend**

- Admin-only CRUD for users; roles viewer, operator and admin from a constants module. Password reset by an admin, forced change on first login, optional TOTP two-factor (enrol and verify endpoints).
- Guard against removing or demoting the last admin.

**Frontend**

- `/users` route: table, create and edit dialog, role selector, disable toggle, reset-password action, and a TOTP enrol flow with a QR code on the profile page.
- `/profile` route for the current user: change password, manage 2FA, list active sessions with revoke.

**Tests:** last-admin protection, role matrix per endpoint, TOTP verification window, session revoke.
