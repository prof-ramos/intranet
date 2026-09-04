<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# App Router Root

Public routes and app entry points for the ASOF intranet.

## Purpose

Next.js App Router root — serves public routes and provides the root layout.

## Key Files

| File | Purpose |
|------|---------|
| `favicon.ico` | Site favicon |
| `global-error.tsx` | Global error boundary |
| `globals.css` | Global styles |
| `layout.tsx` | Root layout |
| `page.tsx` | Root page (redirects to app or login) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `api/` | Route handlers for downloads, v1 APIs, crons and webhooks (see `api/AGENTS.md`) |
| `app/` | Authenticated app area (src/app/app/) |
| `fonts/` | Google Sans and Playfair Display fonts |
| `login/` | Login page + actions |
| `change-password/` | Change password page + actions |
| `forgot-password/` | Public password-reset request flow |
| `reset-password/` | Token-based password-reset completion flow |

## Auth

Public auth routes: `/login`, `/forgot-password` and `/reset-password`. `/change-password` requires a valid session or forced-password-change state.

Authenticated routes under `src/app/app/` are protected by `requireAuth()`.

## For AI Agents

- Keep route authorization in server components/actions and `src/proxy.ts`; client-only checks are not a security boundary.
- Route handlers that accept external traffic must enforce the integration, cron or webhook authentication contract documented in `api/AGENTS.md`.
- Test route handlers with colocated Vitest tests and page flows with the focused E2E spec.

<!-- MANUAL: -->
