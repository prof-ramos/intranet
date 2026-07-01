# Plan 002: Migrate audit `executor: tx` siblings to default `db`

> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the expected result before moving on. If a STOP condition fires,
> stop and report — do not improvise. When done, update your row in
> `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/assinafy/service.ts src/lib/finance/service.ts src/lib/associates/service.ts src/lib/oficios/service.ts src/lib/activities/service.ts`
> If any in-scope file changed, compare "Current state" excerpts against live code; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: `advisor-plans/001-outbox-atomicity-test.md` (recommended guardrail — NOT strictly required; each site adds its own `executor`-undefined assertion)
- **Category**: bug
- **Planned at**: commit `844df3b`, 2026-06-30 (re-stamped: rewrote away the ADR 018 dependency — see Maintenance notes)
- **Issue**: (to be created — non-security)

## Why this matters

`logAuditAction` is best-effort audit. When it is called with `executor: tx`
**inside** a `db.transaction`, a failure of the audit INSERT puts the Postgres
transaction into `aborted` state — every subsequent statement in the tx fails,
and the mutation rolls back. That contradicts the best-effort contract: a
broken audit log should not destroy the user's mutation. The fix is structural:
call `logAuditAction` **after** `db.transaction()` returns, with the default
`db` executor (no `executor` field), wrapped in a `try/catch` that logs and
swallows. An audit INSERT failure then cannot abort the mutation's tx, because
the mutation has already committed.

The repo already has this canonical shape: `src/lib/activities/service.ts`
calls `logAuditAction` with no `executor` and no wrapping `db.transaction`
(it operates on repository helpers directly). 4 sibling sites still pass
`executor: tx` inside a `db.transaction`; each carries the abort-on-audit-failure
bug. The drift is silent because audit INSERT failure is rare (happy path works).

The 4 sites (all at commit `844df3b`):

- `src/lib/assinafy/service.ts:103` — Assinafy status-update webhook handler
- `src/lib/finance/service.ts:340` — `cancelMonthlyPayment`
- `src/lib/associates/service.ts:484` — `createAssociate` (audit is the last tx statement before `return { id }`)
- `src/lib/oficios/service.ts:280` — `sendForSignature`

## Current state (all excerpts verified at commit `844df3b`)

**Exemplar of the canonical pattern** — `src/lib/activities/service.ts:5,89,153`.
It imports `logAuditAction` from `@/lib/audit/service` (line 5) and calls it
with no `executor` field and **no surrounding `db.transaction`** (the file
contains no `db.transaction` and no `emitDomainEvent` calls). This is the shape
to copy: `logAuditAction({ adminId, action, entityType, entityId, changes })`
called directly, no `executor`. The mutation it audits happens via repository
helpers that use the default `db`, so audit and mutation are independent of a
shared tx — a failed audit cannot roll back the mutation.

**Exemplar test pattern** — `src/lib/activities/service.test.ts:11-13,269,325`:
```ts
vi.mock('@/lib/audit/service', () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
}));
// ...
expect(audit.logAuditAction).toHaveBeenCalledWith(
  expect.objectContaining({ action: 'activity_created', /* … */ }),
);
```
Note: activities never passes `executor`, so its tests assert the call args
**without** an `executor` field — they do NOT assert `executor undefined`
explicitly. For this plan, assert that the audit call's `executor` field is
`undefined` (the field is absent → `undefined`), which is the migration's
correctness signal.

**The 4 buggy sites** (each verified at `844df3b`):

Site 1 — `src/lib/assinafy/service.ts:90-104` (inside `db.transaction`, with
tx-internal statements AFTER the audit call):
```ts
// Audit inside transaction for atomicity.
// Extra try-catch because logAuditAction mock throws in tests.
try {
  await logAuditAction({
    adminId: null,
    action: 'official_letter_status_changed',
    entityType: 'official_letter',
    entityId: oficio.id,
    changes: { old: { assinafyStatus: previousStatus }, new: { assinafyStatus: mappedStatus, ...additionalFields } },
    metadata: { source: 'assinafy_webhook', event: eventName },
    executor: tx,
  });
} catch {
  logger.error('Audit log failed (non-critical, inside transaction)', { oficioId: oficio.id });
}
const activeAdmins = await tx.select({ id: admins.id }).from(admins).where(eq(admins.isActive, true));
// ... createNotificationsBatch(tx) ...
```
Migration: capture the values the audit needs (`oficio.id`, `previousStatus`,
`mappedStatus`, `additionalFields`, `eventName`) from inside the tx, remove the
in-tx `try { logAuditAction(..., executor: tx) } catch`, and after
`db.transaction()` resolves, call `logAuditAction({ ..., /* no executor */ })`
inside a `try/catch` that logs and swallows. The `tx.select(admins)` and
`createNotificationsBatch` stay inside the tx (they are not audit).

Site 2 — `src/lib/associates/service.ts:478-487` (audit is the LAST tx statement):
```ts
const id = await insertAssociate(values, tx);
await logAuditAction({
  adminId: input.createdBy ?? null,
  action: 'create',
  entityType: 'associate',
  entityId: id,
  metadata: { source: 'manual_create' },
  executor: tx,
});
return { id };
```
Migration: `const id = await db.transaction(async (tx) => { await insertAssociate(values, tx); return /* the id */; });`
then call `logAuditAction({ ..., /* no executor */ })` after the tx resolves,
inside `try/catch`. Return `{ id }`.

Site 3 — `src/lib/finance/service.ts:330-343` (`cancelMonthlyPayment`):
```ts
await logAuditAction({
  // ... changes, metadata ...
  executor: tx,
});
await emitDomainEvent(
  { type: 'monthly_payment.updated', entityType: 'monthly_payment', entityId: updatedPayment.id, actorAdminId: adminId, payload: { associateId: updatedPayment.associateId, /* … */ } },
  tx,   // ← outbox invariant: MUST stay inside the tx
);
```
Migration: move ONLY `logAuditAction` out (drop `executor: tx`, call after
commit in `try/catch`). **Do NOT touch `emitDomainEvent`** — it must keep
`tx` (outbox invariant; see plan 001). Capture the audit values
(`oldState`, `newState`, `updatedPayment`) from inside the tx.

Site 4 — `src/lib/oficios/service.ts:270-283` (`sendForSignature`):
```ts
await logAuditAction({
  adminId: userId,
  action: 'official_letter_sent_for_signature',
  entityType: 'official_letter',
  entityId: oficioId,
  changes: { old: { assinafyDocumentId: null }, new: { assinafyDocumentId: doc.id, assinafyStatus: 'pending_signature' } },
  executor: tx,
});
return result;
```
Migration: capture `doc.id` and `result` from inside the tx, move
`logAuditAction` after `db.transaction()` resolves (no `executor`), in
`try/catch`. The Assinafy document may already be created externally by the
time audit runs — moving audit out of the tx means a rollback leaves an orphan
audit row (accepted tradeoff for best-effort audit); do not try to "fix" the
orphan.

Repo conventions:
- `DbExecutor` type from `src/lib/db/index.ts` (`typeof db | PgTransaction`).
- Audit best-effort: `try { await logAuditAction(...) } catch (e) { logger.error(...) }`.
- `src/lib/audit/service.ts` already has an internal try/catch but does NOT use a savepoint, so it does not un-abort a PG tx — the fix is caller-side (move audit out of the tx).
- Tests use `vi.hoisted()` for mock refs referenced in `vi.mock()`.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Unit tests (per module) | `npx vitest run src/lib/assinafy/service.test.ts src/lib/finance/service.test.ts src/lib/associates/service.test.ts src/lib/oficios/service.test.ts` | all pass |
| Lint | `npm run lint` | exit 0 |
| Full validate | `npm run validate:quick` | exit 0 |

## Scope

**In scope** (only these 4 service files + their tests):
- `src/lib/assinafy/service.ts` + `src/lib/assinafy/service.test.ts`
- `src/lib/finance/service.ts` + `src/lib/finance/service.test.ts`
- `src/lib/associates/service.ts` + `src/lib/associates/service.test.ts`
- `src/lib/oficios/service.ts` + `src/lib/oficios/service.test.ts`

**Out of scope**:
- `src/lib/audit/service.ts` — do NOT add a savepoint; the fix is caller-side (move audit out of tx).
- `src/lib/activities/service.ts` — already canonical; reference only, do not modify.
- Any change to `logAuditAction` signature.
- The `emitDomainEvent(..., tx)` calls in `finance/service.ts` and `oficios/service.ts` — those MUST stay inside their tx (outbox invariant).

## Git workflow

- Branch: `advisor/002-audit-executor-tx-siblings`
- One commit per site (4 commits) — `fix(<module>): run audit outside tx`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: assinafy/service.ts:103

Move the `try { await logAuditAction({ ..., executor: tx }) } catch` block out
of the `db.transaction` callback in the Assinafy status-update path. Capture the
audit values (`oficio.id`, `previousStatus`, `mappedStatus`, `additionalFields`,
`eventName`) from inside the tx (return them, or close over variables computed
before the audit). After `db.transaction()` resolves, call `logAuditAction`
with the same fields minus `executor`, wrapped in `try/catch` that logs and
swallows. Preserve all other tx-internal statements (`tx.select(admins)`,
`createNotificationsBatch`) inside the tx — only the audit call moves out.

**Verify**: `npx vitest run src/lib/assinafy/service.test.ts` → pass. Add/extend
a test that captures the `logAuditAction` call args for the
`official_letter_status_changed` action and asserts `callArgs.executor` is
`undefined` (model on `activities/service.test.ts:269` — `vi.mock` of
`@/lib/audit/service` returning `vi.fn().mockResolvedValue(undefined)`, then
`expect(vi.mocked(logAuditAction)).toHaveBeenCalledWith(expect.objectContaining({ action: 'official_letter_status_changed' }))`
and separately assert the call's `executor` is `undefined`).

### Step 2: finance/service.ts:340 (`cancelMonthlyPayment`)

Move only `logAuditAction` out of the tx. Capture `oldState`, `newState`, and
`updatedPayment` from inside the tx. After commit, call `logAuditAction` in
`try/catch` with no `executor`. **Do NOT touch `emitDomainEvent(..., tx)`** at
~line 343 — it must keep `tx` (outbox invariant).

**Verify**: `npx vitest run src/lib/finance/service.test.ts` → pass. Add the
`executor undefined` assertion for the `cancelMonthlyPayment` audit call.

### Step 3: associates/service.ts:484 (`createAssociate`)

`logAuditAction` is the last statement of the tx before `return { id }`.
Restructure so `db.transaction` returns the new `id`, then call
`logAuditAction` after the tx resolves (no `executor`), in `try/catch`, then
`return { id }`.

**Verify**: `npx vitest run src/lib/associates/service.test.ts` → pass. Add the
`executor undefined` assertion for the `create` audit call.

### Step 4: oficios/service.ts:280 (`sendForSignature`)

Move `logAuditAction` after `db.transaction()` resolves. Capture `doc.id` and
`result` from inside the tx. Call `logAuditAction` (no `executor`) in
`try/catch`.

**Verify**: `npx vitest run src/lib/oficios/service.test.ts` → pass. Add the
`executor undefined` assertion for the `official_letter_sent_for_signature`
audit call.

### Step 5: full validate

**Verify**: `npm run validate:quick` → exit 0.
Then: `grep -rn "executor: tx" src/lib/assinafy/service.ts src/lib/finance/service.ts src/lib/associates/service.ts src/lib/oficios/service.ts` → no matches. (Confirm `emitDomainEvent(..., tx)` lines are NOT matched — they are not `executor: tx`.)

## Test plan

For each of the 4 service test files, add (or extend) a test that captures the
`logAuditAction` call args for the relevant action and asserts the call's
`executor` field is `undefined`. Pattern: `activities/service.test.ts:11-13`
(mock shape) + `:269` / `:325` (assertion shape). If a service test file does
not currently mock `@/lib/audit/service`, add the mock following the
`activities/service.test.ts:11-13` shape (`logAuditAction: vi.fn().mockResolvedValue(undefined)`).

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run validate:quick` exits 0
- [ ] `grep -rn "executor: tx" src/lib/assinafy/service.ts src/lib/finance/service.ts src/lib/associates/service.ts src/lib/oficios/service.ts` returns no matches
- [ ] Each of the 4 service test files has a passing assertion that the audit call's `executor` is `undefined`
- [ ] `emitDomainEvent` calls in `finance/service.ts` and `oficios/service.ts` still receive `tx` (outbox invariant preserved) — `git diff` shows no change to those lines
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- Any of the 4 sites has additional tx-internal statements after `logAuditAction`
  that depend on audit having run — STOP and report; the move-out may not be safe there.
- A service test file cannot be made to assert `executor` without restructuring its
  mocks — STOP and report which file.
- `emitDomainEvent(..., tx)` is accidentally moved out of the tx in finance/oficios
  — STOP; that breaks the outbox invariant.
- The `activities/service.ts` exemplar at this commit does NOT match "no
  `db.transaction`, no `executor`" (drift) — STOP and report; do not proceed
  without a valid exemplar.

## Maintenance notes

- After this lands, the canonical pattern is "audit outside tx, default `db`."
  Any new service that adds `executor: tx` to `logAuditAction` is a regression —
  grep `logAuditAction.*executor: tx` in review.
- Reviewer: confirm `emitDomainEvent` calls in `finance/service.ts` and
  `oficios/service.ts` still receive `tx` (outbox invariant preserved); only
  `logAuditAction` lost the `executor` field.
- Follow-up (out of scope): a repo-wide lint rule or codemod that forbids
  `executor: tx` on `logAuditAction` — track as a separate issue if desired.
- **Drift vs uncommitted work (recorded during re-stamp):** the original draft of
  this plan grounded the fix in "ADR 018 §2" and cited `activities/service.ts`
  as a *migrated* exemplar (with `emitDomainEvent(..., tx)` + `dispatchDomainEventById`
  fire-and-forget) and `activities/service.test.ts:151-171` as an
  `executor undefined` assertion. At commit `844df3b` none of that exists: ADR 018
  is uncommitted in the main working tree, `activities/service.ts` has no
  `db.transaction`/`emitDomainEvent`/`dispatchDomainEventById`, and
  `activities/service.test.ts:151-171` is validation tests (invalid dueDate/assignee/associate).
  An executor in an isolated worktree would not see any of it and would correctly STOP.
  The rewrite grounds the fix in the *best-effort audit* invariant (self-justifying,
  independent of ADR 018) and uses the *real* `activities/service.ts` @844df3b shape
  (audit called directly, no executor, no tx). When the ADR 018 work lands, a
  follow-up can re-reference it as the normative record; the refactor itself is
  unchanged. See memory `feedback_advisor_plans_vs_uncommitted_work`.