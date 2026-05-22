# Design: Realtime Notification Validation + RLS Hardening

Date: 2026-05-21
Issue: #51
Status: implemented (pending staging validation)

## Context

The ASOF Intranet has a real-time notification system built on Supabase Realtime. Unit tests pass, but two-user isolation has never been validated in a real environment. One RLS inconsistency was identified:

1. `notifications_select_own` policy uses `TO PUBLIC` instead of `TO authenticated` (inconsistent with migration 0023/0039 convention applied to all other tables)

A second issue (`.forceRLS()` missing from Drizzle schema) was investigated and determined to be a non-issue: Drizzle ORM only provides `.enableRLS()` — `FORCE ROW LEVEL SECURITY` is applied via migration 0040 SQL only, which is the correct approach.

## Approach

Validate baseline first (pre-migration smoke test), apply RLS hardening, then re-validate on staging. Before/after comparison proves the change is safe.

## 1. RLS Migration (0044)

File: `drizzle/postgres/0044_notifications_rls_to_authenticated.sql`

```sql
-- Align notifications RLS with project convention (0039a/b/c pattern):
-- TO authenticated + get_current_admin_id() + AS RESTRICTIVE + FOR SELECT
-- Previous: TO PUBLIC + EXISTS subquery with auth.jwt() ->> 'email' (migration 0037/0038)

-- Create new policy first (safe swap — no zero-policy window under FORCE RLS)
CREATE POLICY notifications_select_authenticated ON notifications
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (user_id = get_current_admin_id());

-- Drop old policy
DROP POLICY IF EXISTS notifications_select_own ON notifications;
```

Design decisions:

- Uses `get_current_admin_id()` (from 0039a) which checks `is_active = true` internally. Replaces the inline subquery with `auth.jwt() ->> 'email'` that referenced a non-existent `status` column.
- `FOR SELECT` explicit — prevents default `FOR ALL` which would reintroduce client-side write access.
- CREATE-before-DROP — `ALTER POLICY` cannot change the `TO` clause in PostgreSQL, so CREATE-before-DROP is the only correct approach. Under `FORCE ROW LEVEL SECURITY`, having both restrictive policies briefly is safe (intersection is strictly more restrictive).
- Inactive admins (`is_active = false`) lose read access, matching convention on all other tables.

## 2. Drizzle Schema Update

File: `src/lib/db/schema/notifications.ts`

- Rename `pgPolicy('notifications_select_own', ...)` to `pgPolicy('notifications_select_authenticated', ...)`
- Change `to: 'public'` to `to: 'authenticated'`
- Replace inline EXISTS subquery with `sql\`${table.userId} = get_current_admin_id()\``
- Keep `.enableRLS()` (Drizzle ORM has no `.forceRLS()` method)
- Keep `as: 'restrictive'`
- Add comment documenting that server-side writes bypass RLS via superuser connection

## 3. Smoke Test Script

File: `scripts/smoke-realtime-notifications.ts`

Uses `@supabase/supabase-js` (already in project). Two authenticated Supabase clients, each subscribing to `postgres_changes` on `notifications` with `user_id=eq.${userId}` filter.

### Environment Variables

| Variable                  | Description          |
| ------------------------- | -------------------- |
| `SMOKE_SUPABASE_URL`      | Supabase project URL |
| `SMOKE_SUPABASE_ANON_KEY` | Anon/publishable key |
| `SMOKE_USER_A_EMAIL`      | Test user A email    |
| `SMOKE_USER_A_PASSWORD`   | Test user A password |
| `SMOKE_USER_B_EMAIL`      | Test user B email    |
| `SMOKE_USER_B_PASSWORD`   | Test user B password |

### Test Scenarios

1. **INSERT isolation** — INSERT notification for user A. Assert user A receives `INSERT` event via Realtime. Assert user B receives zero events within 10s window.

2. **UPDATE isolation** — UPDATE user A's notification (set `read_at`). Assert user A receives `UPDATE` event. Assert user B receives zero events within 10s window.

3. **Mutation isolation** — User B attempts UPDATE on user A's notification. Assert RLS blocks it (0 rows updated).

4. **Token-absent scenario** — Create unauthenticated Supabase client (no `signInWithPassword`). Subscribe to `postgres_changes`. Assert zero events received within 5s. Confirms failure mode is silent drop, not data leak.

5. **Publication check** — Query `pg_publication_tables` to confirm `notifications` in `supabase_realtime`.

## 4. Validation Procedure

1. Run baseline smoke test on staging with current `TO PUBLIC` policy (Phase 1 evidence)
2. Apply migration 0044 on staging Supabase project
3. Re-run smoke test (same 5 scenarios)
4. Compare results with baseline — all scenarios must pass identically
5. If any scenario fails: apply rollback, report findings
6. Post both baseline and post-migration evidence to issue #51
7. Close issue #51

```bash
SMOKE_SUPABASE_URL=... SMOKE_SUPABASE_ANON_KEY=... \
SMOKE_USER_A_EMAIL=... SMOKE_USER_A_PASSWORD=... \
SMOKE_USER_B_EMAIL=... SMOKE_USER_B_PASSWORD=... \
npx tsx scripts/smoke-realtime-notifications.ts
```

## 5. Rollback Plan

If `TO authenticated` breaks Realtime on staging, restore the original 0038 policy:

```sql
-- Restore original 0038 policy (exact reproduction)
CREATE POLICY notifications_select_own ON notifications
  AS RESTRICTIVE
  FOR SELECT
  TO PUBLIC
  USING (
    EXISTS (
      SELECT 1
      FROM admins
      WHERE admins.id = notifications.user_id
        AND lower(admins.email) = lower(auth.jwt() ->> 'email')
    )
  );

-- Drop the TO authenticated policy
DROP POLICY IF EXISTS notifications_select_authenticated ON notifications;
```

## 6. Server-Side Write Assumption

All notification writes (`createNotification`, `markNotificationRead`, `markAllNotificationsRead`) go through `src/lib/notifications/repository.ts` which uses the Drizzle `db` client. This client connects directly to PostgreSQL via `DATABASE_URL` as the `postgres` superuser role, which bypasses RLS regardless of `FORCE ROW LEVEL SECURITY`. Under `FORCE ROW LEVEL SECURITY`, the table owner does NOT bypass RLS — only superusers do. No RLS policy allows INSERT/UPDATE/DELETE for non-superuser roles. This is safe for the current Supabase deployment but would need a `notifications_server_manage` policy if the connection role ever changes to a non-superuser.

## Acceptance Criteria

- [ ] Baseline smoke test passes all 5 scenarios on staging (pre-migration)
- [ ] Migration 0044 uses `TO authenticated`, `FOR SELECT`, `AS RESTRICTIVE`, `get_current_admin_id()`, CREATE-before-DROP
- [ ] Drizzle schema updated: `notifications_select_authenticated`, `to: 'authenticated'`, `get_current_admin_id()`, `.enableRLS()`, `as: 'restrictive'`
- [ ] Post-migration smoke test passes all 5 scenarios on staging (identical to baseline)
- [ ] `npm run typecheck && npm run lint && npm run test` pass
- [ ] Both baseline and post-migration evidence posted to issue #51
