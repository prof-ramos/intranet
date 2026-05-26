<!-- Parent: ../../AGENTS.md -->

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
| `api/` | API routes — oficios/[id]/, v1/cron/events/health/juridico |
| `app/` | Authenticated app area (src/app/app/) |
| `fonts/` | Google Sans and Playfair Display fonts |
| `login/` | Login page + actions |
| `change-password/` | Change password page + actions |

## Auth

Public routes: `/login`, `/change-password`

Authenticated routes under `src/app/app/` are protected by `requireAuth()`.