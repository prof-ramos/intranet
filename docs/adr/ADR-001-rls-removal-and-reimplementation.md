# ADR-001: RLS Removal and Reimplementation

**Status:** Accepted (partially reverted in migration 0009)

**Date:** 2026-05-12

## Context

In migration 0000, Row-Level Security was enabled on 4 tables (`admins`, `associates`, `activities`, `audit_logs`) with permissive policies (`FOR ALL TO PUBLIC`). In migration 0001, RLS was completely removed from all tables.

At the time, the rationale was that all database access flows through the Next.js server layer (Server Components and Server Actions), and there is no Supabase client exposed to the browser. Auth enforcement via `requireAuth()` and `requireRole()` at the application layer was considered sufficient.

## Decision

RLS is reinstated in migration 0009 as a defense-in-depth layer. Policies remain permissive (`FOR ALL TO PUBLIC USING (true) WITH CHECK (true)`) because:

1. The auth layer is still server-side; there is no direct client-to-DB path.
2. Restrictive RLS would duplicate the role-based logic already in `requireRole()`, creating a maintenance burden with no concrete threat model addressed.
3. If a Supabase client is ever exposed to the browser in the future (e.g., for real-time subscriptions), RLS policies must be narrowed to per-user or per-role rules at that point.

Permissive RLS is not an LGPD access-control solution by itself. It documents the intended table posture and prevents accidental tables without policies, but the current privacy boundary remains the server-side authorization layer plus secret management. LGPD compliance still depends on not exposing low-privilege database credentials directly to clients and on keeping service-role credentials server-only.

## Consequences

### Positive

- New tables now have an explicit RLS decision point instead of silently inheriting a no-RLS posture.
- Compliance alignment improves through documented defense-in-depth intent for LGPD-sensitive data (CPF, SIAPE, email), but permissive policies do not satisfy LGPD access restriction on their own.

### Negative

- Slight maintenance overhead: new tables must have RLS enabled and policies created.
- Policies are currently permissive, which may give a false sense of security. Actual authorization still depends on the application layer.
- Direct database access with broad credentials remains high risk; `service_role` keys bypass RLS and must never be used in browsers or committed.

### Neutral

- Migration 0009 affects all 10 tables. Rollback requires `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` on each.

## Future Work

If this project adopts Supabase Realtime or exposes any Supabase client to the browser, RLS policies must be rewritten to:

- Use `auth.uid()` and `auth.jwt()` for row-level filtering.
- Create role-based policies matching `admin`, `diretoria`, and `secretaria`.
- Test with both `supabase-js` client calls and server-side Drizzle access.

Additional triggers that require revisiting this ADR before release:

- Any new browser-side database client, public API route, webhook, or storage policy that can read or mutate LGPD-sensitive data.
- Any new table containing CPF, SIAPE, address, email, financial status, audit trail, or functional history.
- Any background job or admin script that uses credentials broader than the normal runtime role.

Monitoring and verification backlog:

- Add a database check that fails if LGPD-sensitive tables have RLS disabled or no explicit policy.
- Monitor connections whose `application_name` is not `asof-intranet` and investigate unexpected direct access.
- Review service-role key use at each production release and rotate leaked or over-shared keys immediately.

Timeline:

- Before first production deployment: document the exact Supabase roles/keys in use and run explicit RLS verification in `npm run test:db`.
- Before exposing any client-side Supabase access: replace permissive policies with restrictive per-role or per-user predicates.
