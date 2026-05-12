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

## Consequences

### Positive
- Any accidental direct database connection (scripts, ad-hoc queries, Supabase dashboard SQL editor) is now blocked by default unless explicitly authorized.
- Compliance alignment: defense-in-depth is required for LGPD-sensitive data (CPF, SIAPE, email).

### Negative
- Slight maintenance overhead: new tables must have RLS enabled and policies created.
- Policies are currently permissive, which may give a false sense of security. Actual authorization still depends on the application layer.

### Neutral
- Migration 0009 affects all 10 tables. Rollback requires `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` on each.

## Future Work

If this project adopts Supabase Realtime or exposes any Supabase client to the browser, RLS policies must be rewritten to:
- Use `auth.uid()` and `auth.jwt()` for row-level filtering.
- Create role-based policies matching `admin`, `diretoria`, and `secretaria`.
- Test with both `supabase-js` client calls and server-side Drizzle access.
