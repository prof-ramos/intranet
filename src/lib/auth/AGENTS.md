<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# Authentication

## Purpose

Server-side authentication, authorization, password lifecycle, session cookies, login throttling and development identity controls.

## Key Files

| File                      | Description                                                 |
| ------------------------- | ----------------------------------------------------------- |
| `session.ts`              | Signed HTTP-only session creation, reading and invalidation |
| `require-auth.ts`         | Page/action authentication and role guards                  |
| `authorization.ts`        | Canonical role and permission checks                        |
| `actions.ts`              | Login/logout and account-related Server Actions             |
| `password.ts`             | Argon2 password hashing and verification                    |
| `password-reset.ts`       | Temporary token-based password reset flow                   |
| `login-rate-limit.ts`     | Database-backed login attempt throttling                    |
| `development-identity.ts` | Fail-closed `SKIP_AUTH` development identity handling       |

## For AI Agents

### Working In This Directory

- Authentication and authorization checks execute on the server; never trust role or identity values supplied by the client.
- Session cookies remain signed, HTTP-only and appropriately secure. Session-version changes must invalidate old sessions.
- `SKIP_AUTH=true` is development-only and ignored under production conditions; preserve this fail-closed behavior.
- Passwords, reset tokens, session payloads and credential-derived values must never be logged.
- Use timing-safe comparisons for secrets and generic user-facing errors to avoid account enumeration.

### Testing Requirements

- Run the focused unit tests for the changed auth module.
- Run login-rate-limit and development-admin integration tests for database behavior changes.
- Run `e2e/tests/login.spec.ts`, `logout.spec.ts` or `roles.spec.ts` when user-visible auth flows change.

### Common Patterns

- `requireAuth()` protects authenticated pages/actions; `requireRole()` narrows privileged operations.
- Password and reset flows separate validation, domain service and persistence concerns.

## Dependencies

- `src/lib/db/` — admins, sessions/versioning, login attempts and reset-token storage
- `src/lib/crypto/safe-compare.ts` — timing-safe comparison
- `src/proxy.ts` — early route guard
- `argon2` and `jose` — password hashing and session signing

<!-- MANUAL: -->
