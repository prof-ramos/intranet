# GEMINI.md

This file provides the primary instructional context for Gemini CLI when working in the ASOF Intranet codebase.

## Project Overview

**ASOF Intranet** is a specialized internal management system for the **Associação dos Oficiais de Chancelaria (ASOF)** of the Brazilian Ministry of Foreign Affairs (MRE). It manages approximately 763 associates (foreign service administrative officers), 63% of whom serve abroad in ~220 diplomatic posts.

### Core Technologies

- **Framework:** Next.js 16.2.6 (App Router)
- **Runtime:** Node.js 20+
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS 4, DaisyUI 5 (being phased out for custom tokens)
- **Database:** PostgreSQL (Supabase in production, Homebrew local)
- **ORM:** Drizzle ORM
- **Authentication:** Supabase Auth plus local admin revalidation, managed via `src/proxy.ts` (Next.js 16 proxy) and `requireAuth` guards. Password hashes still use `bcryptjs`.
- **Testing:** Vitest (unit/integration), Playwright (E2E).

## Architecture & Data Patterns

### Data Access

- **No API Routes for internal fetching:** Server Components query Drizzle directly.
- **Repository Pattern:** Newer modules (like `juridico` and `activities`) use a repository/service/query layer structure:
  - `repository.ts`: Pure SQL/Drizzle queries.
  - `service.ts`: Business logic and validation.
  - `queries.ts`: Cached data access for Server Components (using `unstable_cache`).
- **Server Actions:** Handle all mutations, located in `src/app/app/.../actions.ts` or `src/lib/server-actions`.

### Authentication & Authorization

- **Proxy Guard:** `src/proxy.ts` performs a coarse Supabase user lookup for `/app/*`.
- **Session Revalidation:** `requireAuth()` in `src/app/app/layout.tsx` ensures the session is valid against the database.
- **Role-Based Access Control (RBAC):** `requireRole(['admin', 'diretoria'])` protects specific routes and actions. Roles: `admin`, `diretoria`, `secretaria`.
- **Password Policy:** 8+ chars, 1 number, 1 special character. Forced change on first login.

### Directory Structure

- `src/app/`: Next.js App Router routes.
  - `src/app/app/`: Authenticated intranet area.
- `src/lib/`: Core logic and utilities.
  - `src/lib/db/schema/`: Drizzle table definitions.
  - `src/lib/auth/`: Session management and guards.
  - `src/lib/juridico/`, `src/lib/activities/`, `src/lib/associates/`: Domain-specific logic.
- `drizzle/postgres/`: SQL migration files.
- `scripts/`: Seed and diagnostic scripts.
- `proxy.ts`: Next.js 16 route guard (replacement for `middleware.ts`).

## Building and Running

### Development

```bash
npm install
cp .env.example .env.local
# Update DATABASE_URL with your local postgres connection
npm run db:migrate
npm run db:seed  # Seeds initial admin user
npm run dev      # Uses Webpack by default
```

### Testing

- **Unit Tests:** `npm run test` (Vitest)
- **Integration Tests:** `npx vitest run --config vitest.integration.config.ts` (Requires a separate test DB)
- **E2E Tests:** `npm run test:e2e` (Playwright). Uses `http://localhost:3001` and a dedicated `asof_test` database.
- **Database Schema Tests:** `npm run test:db` (Validates DB structure against Drizzle schema).

### Production

- **Build:** `npm run build`
- **Migrations:** Always run migrations against the direct (non-pooling) URL before deploying.

## Development Conventions

### Coding Style

- **TypeScript:** Strict typing is required. Avoid `any`.
- **UI Components:** Prefer the design tokens in `src/lib/ui/tokens.ts` over DaisyUI utility classes for new components.
- **Error Handling:** Use localized error boundaries (e.g., `src/app/app/juridico/error.tsx`).
- **Data Validation:** Use Zod schemas in `src/lib/validation/schemas.ts` for all forms and actions.

### Testing Practices

- **TDD:** Highly recommended. Use `vitest.integration.config.ts` for database-dependent logic.
- **E2E:** All critical flows (login, associate editing, juridico consultations) must be covered by Playwright tests in `e2e/tests/`.

### Security (LGPD)

- **PII Protection:** Never log or expose sensitive associate data (CPF, SIAPE, address) in public API responses or console logs.
- **Audit Logs:** All sensitive actions (e.g., report downloads) are logged in the `audit_logs` table.
- **Rate Limiting:** IP-based and email-based rate limiting are enforced via PostgreSQL tables (`rate_limits`, `login_attempts`).

## Domain Glossary

- **Associado:** ASOF member.
- **Lotação:** Current diplomatic post or MRE department.
- **SIAPE:** Federal servant registration number.
- **Jurídico:** Legal module for member consultations and legal processes.
- **Oficial de Chancelaria:** The specific career represented by ASOF.

Refer to `ARCHITECTURE.md` and `CLAUDE.md` for deeper technical details.
