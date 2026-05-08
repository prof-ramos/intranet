# ASOF Intranet Architecture

Last updated: 2026-05-08

## Overview

ASOF Intranet is a small Next.js App Router application for internal association management. The current implementation is intentionally compact: routes render server-side by default, authentication is JWT-cookie based, and persistence uses Drizzle ORM over SQLite/libSQL.

The deployment target is still undefined. Until that is decided, the architecture should avoid coupling product code directly to local SQLite assumptions beyond the current Drizzle boundary.

## System Flow

```text
User
  -> Next.js App Router pages/layouts
  -> middleware route guard for /app and /change-password
  -> auth helpers for session/user lookup
  -> Drizzle ORM
  -> SQLite/libSQL database
```

The root route redirects to `/app`. Authenticated application routes live under `src/app/app`, with login under `src/app/login`.

## Project Structure

```text
src/app/                 App Router routes, layouts, global CSS and local fonts
src/app/app/             Authenticated intranet area
src/app/login/           Login page and login server action
src/components/          Shared navigation and shell components
src/lib/auth/            Auth config, sessions, role labels, logout and requireAuth
src/lib/db/              Drizzle client and schema exports
src/lib/db/schema/       Tables for admins, associates, activities and audit logs
scripts/                 Local diagnostics, database checks and seed scripts
docs/                    Product, theme and runtime-diagnostic notes
```

`@/*` maps to `src/*`.

## Core Components

### App Router

The application uses server components by default. `src/app/app/layout.tsx` requires an authenticated user and provides the sidebar shell. `src/app/app/associados/page.tsx` currently handles the associated-members list, including data query, pagination, filtering and table rendering.

### Authentication

Sessions are signed with `jose` and stored in the `asof-session` HTTP-only cookie. `middleware.ts` checks the JWT before protected routes are rendered, while `requireAuth()` loads the active admin record from the database for server-side rendering.

Local development can bypass login with `.env.local`:

```bash
SKIP_AUTH=true
DEV_USER_ID=1
DEV_USER_NAME="ASOF Dev User"
DEV_USER_EMAIL=dev@asof.local
DEV_USER_ROLE=admin
DEV_USER_MUST_CHANGE_PASSWORD=false
```

Accepted roles are `admin`, `diretoria` and `secretaria`.

### Data Layer

The database client is created in `src/lib/db/index.ts`. `DATABASE_URL` is used when present, otherwise the application falls back to `file:sqlite.db`.

Drizzle schemas are split by table:

- `admins`
- `associates`
- `activities`
- `audit_logs`

Migrations are generated under `drizzle`, and local seed scripts populate admins and associates.

### Runtime

This project uses Next.js 16.2.6. Turbopack is the framework default, but this repository uses Webpack for normal local development/builds because a local investigation reproduced Turbopack/Tailwind/PostCSS resolution and memory-pressure problems.

Normal scripts:

```bash
npm run dev
npm run build
```

Explicit Turbopack checks:

```bash
npm run dev:turbo
npm run build:turbo
```

`scripts/run-dev-60s.sh` is the safe runtime diagnostic wrapper for testing the dev server with automatic shutdown.

## Current Architectural Debts

- `src/app/app/associados/page.tsx` mixes auth, query parsing, Drizzle queries, pagination and UI rendering. The next modularity pass should extract query/filter logic before extracting UI components.
- Auth rules are now centralized enough for local development, but route authorization is still shallow. Role-based access should be made explicit before adding admin/user-management screens.
- SQLite local fallback is useful for development, but deploy architecture is undecided. Before production, decide whether the target is single-host local SQLite, remote libSQL/Turso, Postgres, or another managed database.
- Test coverage is minimal. Auth config has unit coverage; login, session cookies, middleware and member-list queries still need focused tests.
- Documentation had drifted from scripts before this pass. Keep `README.md`, `AGENTS.md`, this file and `docs/diagnostico-travamento-next-dev.md` aligned when runtime scripts change.

## Near-Term Roadmap

1. Extract the associates list data access into a small module that owns filters, pagination and selected columns.
2. Add integration-style tests for login/session behavior and protected-route middleware.
3. Decide the deployment target and database persistence model.
4. Introduce explicit role guards for routes that are not available to `secretaria`.
