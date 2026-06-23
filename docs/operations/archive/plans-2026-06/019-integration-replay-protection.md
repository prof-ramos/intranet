# Plan 019: Add replay protection (nonce/seen-signature store) to integration request verification

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- src/lib/integrations/verify-request.ts src/lib/integrations/rate-limit.ts`
> If either file changed, re-read them before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

`verifyIntegrationRequest` in `src/lib/integrations/verify-request.ts` enforces a
timestamp-skew window (`timestampToleranceSeconds`, configurable, typically 300s) but
has no nonce or seen-signature store. A valid signed request captured in transit can
be replayed any number of times within that window. For endpoints like
`/api/v1/events/dispatch` this can trigger duplicate domain-event emissions; for
write endpoints, it means a captured request is a free-replay attack within the
tolerance window.

The fix is a short-TTL PostgreSQL table (same pattern as the existing
`rate_limit_windows` table in `src/lib/integrations/rate-limit.ts`) that stores
each accepted `(keyId, signature)` pair for `toleranceSeconds` and rejects repeats.

## Current state

`src/lib/integrations/verify-request.ts` — success path (lines 149–183 and 217–236):

```ts
// Lines 149-183: env-var path — verifies HMAC, calls updateApiKeyLastUsed, returns ok: true
// Lines 217-236: table-backed path — same verification, returns ok: true
// Neither path checks whether this (keyId, signature) was accepted before.
```

`src/lib/integrations/rate-limit.ts` — PostgreSQL-backed TTL table pattern to follow:

```ts
// Uses a table 'rate_limit_windows' with columns: key, window_start, count
// Upserting rows with ON CONFLICT DO UPDATE — same approach for the nonce store
```

`src/lib/integrations/types.ts` — contains `INTEGRATION_HEADER_NAMES` and
`IntegrationAuthResult`. The `IntegrationAuthResult` union will need a new
`reason: 'replay_detected'` variant.

`src/lib/db/schema/` — contains existing schema definitions. The new table goes here.
Check the existing migration numbering before generating a new one (`ls drizzle/postgres/`).

## Commands you will need

| Purpose       | Command                                                                | Expected on success |
|---------------|------------------------------------------------------------------------|---------------------|
| Typecheck     | `npm run typecheck`                                                    | exit 0              |
| Generate      | `npm run db:generate`                                                  | new migration file  |
| Test (scoped) | `npm run test -- src/lib/integrations/verify-request.test.ts`         | all pass            |
| Lint          | `npm run lint`                                                         | exit 0              |

## Scope

**In scope**:
- `src/lib/db/schema/integrations.ts` (or wherever integration schemas live — check the file)
- `drizzle/postgres/` (new migration, generated)
- `src/lib/integrations/verify-request.ts`
- `src/lib/integrations/types.ts` (add `replay_detected` to the failure reason union)
- `src/lib/integrations/verify-request.test.ts` (add replay test)

**Out of scope** (do NOT touch):
- `src/lib/integrations/rate-limit.ts` — do not modify; only use as a reference
- Any route handler that calls `verifyIntegrationRequest`
- Client-side signing code

## Git workflow

- Branch: `advisor/019-integration-replay-protection`
- Commits: 2 — schema + migration, then verify-request change
- Messages:
  - `feat(integrations): add integration_signature_nonces table for replay protection`
  - `feat(integrations): reject replayed integration requests within timestamp window`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Add the nonce table to the schema

In the appropriate schema file under `src/lib/db/schema/`, add:

```ts
export const integrationSignatureNonces = pgTable(
  'integration_signature_nonces',
  {
    id:          serial('id').primaryKey(),
    keyId:       text('key_id').notNull(),
    signature:   text('signature').notNull(),
    acceptedAt:  timestamp('accepted_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt:   timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('integration_signature_nonces_key_sig_idx').on(t.keyId, t.signature),
    index('integration_signature_nonces_expires_idx').on(t.expiresAt),
  ],
);
```

Export it from `src/lib/db/schema/index.ts` (check the pattern used by other tables).

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Generate the migration

```bash
npm run db:generate
```

Confirm a new SQL file is created in `drizzle/postgres/` with
`CREATE TABLE "integration_signature_nonces"` and both indexes.

**Verify**: The migration file exists and contains the expected DDL.

### Step 3: Add `replay_detected` to the failure reason union

In `src/lib/integrations/types.ts`, find the `IntegrationAuthResult` type. Add
`'replay_detected'` to the failure reason union:

```ts
type IntegrationFailureReason =
  | 'disabled'
  | 'misconfigured'
  | 'missing_headers'
  | 'invalid_key'
  | 'invalid_signature'
  | 'invalid_timestamp'
  | 'timestamp_skew'
  | 'insufficient_scope'
  | 'replay_detected';  // ← new
```

In `src/lib/integrations/verify-request.ts`, add a `replay_detected` case in
`mapIntegrationFailureToResponse` returning a 401 with code `'integration_replay'`
and message `'Replayed request detected.'`.

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Add nonce check and record to `verifyIntegrationRequest`

After HMAC verification succeeds on **both** the env-var and table-backed paths,
add the nonce check:

```ts
// After safeCompare passes (both paths), before returning ok: true:

const toleranceSec = config.timestampToleranceSeconds;
const nonce = `${key}:${signature}`;

// Check for replay
const existing = await db
  .select({ id: integrationSignatureNonces.id })
  .from(integrationSignatureNonces)
  .where(
    and(
      eq(integrationSignatureNonces.keyId, key),
      eq(integrationSignatureNonces.signature, signature),
      gt(integrationSignatureNonces.expiresAt, sql`now()`),
    ),
  )
  .limit(1);

if (existing.length > 0) {
  return { ok: false, reason: 'replay_detected' };
}

// Record the nonce — use INSERT ... ON CONFLICT DO NOTHING to handle concurrent requests
const expiresAt = new Date(Date.now() + toleranceSec * 1000);
await db
  .insert(integrationSignatureNonces)
  .values({ keyId: key, signature, expiresAt })
  .onConflictDoNothing();
```

Import `integrationSignatureNonces`, `and`, `eq`, `gt`, `sql` at the top of the file.

Note: the `onConflictDoNothing` approach means a true replay (second insert hits the
unique index) won't crash — but the first check already catches it. The nonce row is
only inserted for genuinely new signatures.

**Verify**: `npm run typecheck` → exit 0.

### Step 5: Run tests

**Verify**: `npm run test -- src/lib/integrations/verify-request.test.ts` → all pass.

The existing tests mock `db` — update the mock to handle the new `db.select(...)
.from(integrationSignatureNonces)...` and `db.insert(...)` calls. The simplest mock
returns `[]` from the select (no replay found) and resolves the insert. Add one new
test that makes the select return `[{ id: 1 }]` and asserts `reason: 'replay_detected'`.

## Test plan

New tests in `src/lib/integrations/verify-request.test.ts`:

1. `returns replay_detected when the same (keyId, signature) was already accepted`
   — mock the nonce-select to return a row; assert `{ ok: false, reason: 'replay_detected' }`.

2. `accepts the first request and records the nonce`
   — mock the nonce-select to return `[]`; assert `ok: true` and that `db.insert` was called.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run db:generate` produced a migration with `integration_signature_nonces`
- [ ] `npm run test -- src/lib/integrations/verify-request.test.ts` passes, including new replay tests
- [ ] `npm run lint` exits 0
- [ ] Both env-var path and table-backed path in `verifyIntegrationRequest` now check and record nonces
- [ ] `plans/README.md` status row updated

## STOP conditions

- `db.insert(...).onConflictDoNothing()` is not available in the current Drizzle
  version — use `sql` raw or a try/catch on unique violation (code '23505') instead.
- The existing `verify-request.test.ts` uses a db mock structure incompatible with
  the new chained queries — investigate the mock before making changes; STOP if
  significant test infrastructure refactoring is required (report and ask for guidance).
- The schema file for integrations doesn't exist as expected — locate the correct file
  first by searching for an existing integration table definition.

## Maintenance notes

- The nonce table will grow without cleanup. Add a cron to delete expired nonces:
  ```sql
  DELETE FROM integration_signature_nonces WHERE expires_at < now();
  ```
  This can be added to the existing LGPD retention cron or as its own lightweight cron.
- The `timestampToleranceSeconds` default should be as short as the client can
  reliably sign within — 60–120s is more secure than 300s once replay protection
  exists, because a shorter window means a captured request is only dangerous for
  a smaller window even without the nonce store.
