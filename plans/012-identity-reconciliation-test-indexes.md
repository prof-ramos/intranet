# Plan 012: Stop dropping unique identity-hash indexes in reconciliation integration tests

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/associates/identity-reconciliation/identity-reconciliation.integration.test.ts src/lib/associates/identity-reconciliation/repository.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/477

## Why this matters

`identity-reconciliation.integration.test.ts` `beforeAll` runs `DROP INDEX` on `idx_associates_cpf_hash`, `idx_associates_siape_hash`, and `idx_associates_primary_email_hash`, and only recreates them in `afterAll`. An interrupted `npm run test:integration` leaves the dedicated DB (`asof_intranet_test`) without unique identity hashes. Later creates can insert duplicate hashes; `23505` mapping will not fire. The tests need duplicate-hash *fixtures*, not a globally weaker schema. Production unique indexes (migration 0033) must remain the contract the tests run against.

Do **not** implement the G0.1 lock/snapshot refactor in this plan (7-table `SHARE ROW EXCLUSIVE`). That is a separate L/HIGH-risk change. This plan is test hygiene only.

## Current state

```ts
// identity-reconciliation.integration.test.ts:73-101
beforeAll(async () => {
  await db.execute(sql`DROP INDEX IF EXISTS idx_associates_cpf_hash`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_associates_siape_hash`);
  await db.execute(sql`DROP INDEX IF EXISTS idx_associates_primary_email_hash`);
  // insert admin...
});
afterAll(async () => {
  // cleanup rows...
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_associates_cpf_hash ON associates (cpf_hash)`);
  // siape + primary_email too
});
```

Postgres unique indexes allow multiple NULLs. Duplicate **non-null** hashes are what 0033 forbids. Tests that need two rows with the same `cpfHash` currently drop the index instead of using a strategy compatible with uniqueness.

**Conventions**

- Integration tests: `vitest.integration.config.ts`, skip when `.env.test.local` is missing (`describe.skipIf(!hasTestEnv)`).
- Identity hashes: `buildPiiPatch` must not hash `''` (PR #302). Fixtures should set explicit hash strings, not empty string.
- Do not run against remote Neon. `scripts/dev-seed-safety.ts` / integration runner already guard hosts.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Integration | `npm run test:integration` (or the vitest command in `scripts/run-integration-tests.mjs` filtered to this file) | all pass; skip is OK if `.env.test.local` is absent — then STOP and report skip, do not fake pass |
| Unit | `npx vitest run src/lib/associates/identity-reconciliation` | unit files pass without DB |

## Scope

**In scope**:
- `src/lib/associates/identity-reconciliation/identity-reconciliation.integration.test.ts`
- Helpers in that folder **only if** you add a test-only fixture module next to it
- `src/lib/associates/identity-reconciliation/cli.test.ts` / `policy.test.ts` only if they also DROP those indexes (grep first)

**Out of scope**:
- `repository.ts` lock table / snapshot projection (G0.1).
- Production migrate workflows.
- `scripts/clear-duplicate-identity-hashes.ts`.

## Git workflow

- Branch: `test/issue-<N>-identity-reconciliation-indexes`
- Commit: `test(associates): não dropar índices únicos de hash na reconciliação`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Grep for DROP INDEX

`rg "DROP INDEX IF EXISTS idx_associates_(cpf|siape|primary_email)_hash" src scripts`

Every hit in tests must be removed by this plan.

### Step 2: Replace the fixture strategy

Need two associates sharing an identity component without violating unique indexes. Allowed approaches (pick one; do not invent a third without STOP):

**A (preferred). Null hashes + plaintext-free synthetic rows, then set the same hash on two rows inside a transaction that you roll back except for the test’s apply path.** Unique indexes allow duplicate NULL. For apply tests that require duplicate *non-null* hashes, you cannot insert the second row while the unique index exists.

**B. Use a deferred constraint / DEFERRABLE unique index — NOT allowed.** Would change production schema.

**C. Don’t insert two live duplicate hashes.** Build the reconciliation **snapshot/policy** unit tests with in-memory rows (`policy.test.ts` already exists). Keep the integration test for apply/reparent on **non-duplicate** graphs (reparent FKs from loser to winner where hashes are unique). If the current integration test’s whole point is “two rows same cpf_hash get merged”, then:

**D. Insert winner with hash H, insert loser with hash NULL, then `UPDATE associates SET cpf_hash = H WHERE id = loser` inside the test transaction using `SET CONSTRAINTS` — unique still rejects.**

The honest approach if apply **requires** duplicate non-null hashes: run the duplicate insert inside a transaction that **expects 23505** for the “cannot insert duplicates” characterization, and for merge tests, mock/plan at the policy layer with in-memory snapshots (`policy.ts` `buildReconciliationPlan`) plus an integration test that apply is idempotent on an already-canonical pair (unique hashes, FKs pointing at the canonical id).

Rewrite the integration file so:

- `beforeAll` does **not** drop indexes.
- Tests that previously inserted duplicate hashes move to `policy.test.ts` (pure) with two snapshot rows sharing `cpfHash`.
- Integration tests cover: apply reparents FKs when the plan says so, using two officials with **different** hashes; unknown FK inventory; evidence hash mismatch.

If you believe apply cannot be tested without duplicate hashes in Postgres, STOP and report — do not drop the index.

### Step 3: afterAll

Remove the `CREATE UNIQUE INDEX` restore block (indexes were never dropped). Keep row cleanup.

**Verify**: the test file contains no `DROP INDEX` / `CREATE UNIQUE INDEX` on those three names.

## Test plan

- `policy.test.ts` — duplicate-hash component still planned (in memory).
- Integration — no schema mutation; skipIf no test DB.
- Pattern: existing `describe.skipIf(!hasTestEnv)` and `cleanup()` helper in the same file.

## Done criteria

- [ ] `rg "DROP INDEX IF EXISTS idx_associates_cpf_hash" src` empty (and siape/email)
- [ ] Integration file still `skipIf(!hasTestEnv)`
- [ ] `npx vitest run src/lib/associates/identity-reconciliation` (unit) passes
- [ ] `test:integration` for this file passes **or** skipped with a note in the PR
- [ ] lint + typecheck pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- The only way you can see to keep apply coverage is dropping unique indexes. STOP. Do not reintroduce DROP INDEX.
- Test DB is remote/Neon. STOP (LGPD / safety).

## Maintenance notes

- Reviewer: unique indexes on identity hashes are a production invariant (0033). Tests must not weaken them.
- G0.1 (lock duration, full-table snapshot) remains open; do not hide it in this PR.
