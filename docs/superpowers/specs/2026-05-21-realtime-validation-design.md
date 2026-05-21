# Design: Realtime Notification Validation + RLS Hardening

Date: 2026-05-21
Issue: #51
Status: pending approval

## Context

The ASOF Intranet has a real-time notification system built on Supabase Realtime. Unit tests pass (31 tests, 6 files), but two-user isolation has never been validated in a real environment. Two RLS inconsistencies were identified during exploration:

1. `notifications_select_own` policy uses `TO PUBLIC` instead of `TO authenticated` (inconsistent with migration 0023 convention applied to all other tables)
2. `.forceRLS()` is missing from the Drizzle schema definition (only applied via migration 0040 SQL, not reflected in schema)

## Approach

Fix RLS first, then validate the final hardened state in staging with a scripted smoke test.

## 1. RLS Migration

Create `drizzle/postgres/0041_notifications_rls_hardening.sql`:

```sql
-- Harden notifications RLS to match project convention (TO authenticated, FORCE)
DROP POLICY IF EXISTS notifications_select_own ON notifications;

CREATE POLICY notifications_select_own ON notifications
  AS RESTRICTIVE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM admins
      WHERE email = auth.jwt() ->> 'email'
      AND status = 'active'
    )
  );

-- Ensure FORCE ROW LEVEL SECURITY is applied
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
```

Update `src/lib/db/schema/notifications.ts`:

- Replace `.enableRLS()` with `.forceRLS()`
- Update the policy definition to use `TO authenticated` instead of `TO PUBLIC`

## 2. Smoke Test Script

Create `scripts/smoke-realtime-notifications.ts`:

### Requirements

- Node.js script using `@supabase/supabase-js` directly (not via Next.js app)
- Reads credentials from environment variables
- Produces structured log output as evidence
- Exit code 0 on success, 1 on failure

### Environment Variables

| Variable | Description |
|---|---|
| `SMOKE_SUPABASE_URL` | Supabase project URL |
| `SMOKE_SUPABASE_ANON_KEY` | Anon/publishable key |
| `SMOKE_USER_A_EMAIL` | Test user A email |
| `SMOKE_USER_A_PASSWORD` | Test user A password |
| `SMOKE_USER_B_EMAIL` | Test user B email |
| `SMOKE_USER_B_PASSWORD` | Test user B password |

### Test Scenarios

1. **Realtime INSERT isolation**: INSERT a notification row for user A directly via Supabase client (`db.from('notifications').insert(...)`). Assert user A receives the `INSERT` event via Realtime. Assert user B does NOT receive any event within a 10s window.

2. **Realtime UPDATE isolation**: UPDATE user A's notification (set `read_at`) via user A's Supabase client. Assert user A receives the `UPDATE` event. Assert user B does NOT receive any event within a 10s window.

3. **Server-side mutation isolation**: Using user B's authenticated Supabase client, attempt to UPDATE user A's notification (set `read_at`). Assert the mutation has no effect (0 rows updated, RLS blocks it) and user A's notification remains unread.

4. **Publication membership**: Query `supabase_realtime` publication to confirm `notifications` table is listed.

### Implementation Details

- Authenticate both users via `supabase.auth.signInWithPassword()`
- Subscribe to `postgres_changes` on `notifications` with `user_id=eq.${userId}` filter for each user
- Use a Promise-based event collector with 10s timeout
- Clean up test data (delete test notifications) after each scenario
- Log results as structured JSON for evidence attachment

## 3. Validation Procedure

1. Apply migration 0041 on staging Supabase project
2. Verify `supabase_realtime` publication includes `notifications`:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications';
   ```
3. Ensure two test admin users exist in staging (create if needed via `db:seed`)
4. Run smoke test:
   ```bash
   SMOKE_SUPABASE_URL=... SMOKE_SUPABASE_ANON_KEY=... \
   SMOKE_USER_A_EMAIL=... SMOKE_USER_A_PASSWORD=... \
   SMOKE_USER_B_EMAIL=... SMOKE_USER_B_PASSWORD=... \
   npx tsx scripts/smoke-realtime-notifications.ts
   ```
5. If test fails: investigate RLS policy or publication config, adjust, re-run
6. Post evidence (script output) as comment on issue #51
7. Close issue #51
8. If staging passes: schedule production migration with same procedure

## 4. Rollback Plan

If the `TO authenticated` change breaks Realtime delivery:

```sql
-- Revert to TO PUBLIC policy
DROP POLICY IF EXISTS notifications_select_own ON notifications;

CREATE POLICY notifications_select_own ON notifications
  AS RESTRICTIVE
  TO PUBLIC
  USING (
    user_id IN (
      SELECT id FROM admins
      WHERE email = auth.jwt() ->> 'email'
      AND status = 'active'
    )
  );
```

## Acceptance Criteria

- [ ] Migration 0041 applied on staging, uses `TO authenticated` and `FORCE ROW LEVEL SECURITY`
- [ ] Drizzle schema updated with `.forceRLS()` and `TO authenticated` policy
- [ ] `notifications` table confirmed in `supabase_realtime` publication
- [ ] Smoke test passes: user A receives their notifications, user B does not
- [ ] Mutation isolation confirmed: user B cannot mark user A's notifications
- [ ] Evidence posted to issue #51