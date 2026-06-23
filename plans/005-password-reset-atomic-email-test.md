# Plan 005: Make password reset atomic and add sendEmail coverage

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7178dd5..HEAD -- src/lib/auth/service.ts src/lib/email/index.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug + tests
- **Planned at**: commit `7178dd5`, 2026-06-10
- **Issue**: https://github.com/prof-ramos/intranet/issues/161

## Why this matters

The `resetPassword` function in `src/lib/auth/service.ts` executes the password update and audit log insert as two separate `retryTransientConnection` calls with no transaction envelope. If the audit insert fails after the password was updated (network blip, constraint violation), the admin's password is changed without a traceable LGPD audit record. Separately, `sendEmail()` (Mailjet HTTP call) has zero unit tests — a regression in the mail-sending path goes undetected until production.

Fixing the atomicity gap closes a LGPD compliance exposure; adding a test for `sendEmail` locks down a critical integration path.

## Current state

- `src/lib/auth/service.ts` — Lines 205-223: password update and audit insert are sequential, independent DB calls:

```typescript
  // Line 205 — password update
  await retryTransientConnection(() =>
    db.update(admins).set({ passwordHash, mustChangePassword: true, updatedAt: sql`now()` })
      .where(eq(admins.id, targetId)),
  );

  // Line 216 — audit insert (separate connection, no transaction)
  await retryTransientConnection(() =>
    db.insert(auditLogs).values({
      action: 'password_reset',
      entityType: 'admin',
      entityId: targetId,
      performedBy: actorId,
    }),
  );
```

- `src/lib/email/index.ts` — Lines 22-51: `sendEmail()` is a plain `fetch` call to Mailjet REST API; no tests exist (`src/lib/email/` contains only `templates.test.ts`).

- Repo conventions: Multi-table writes use `db.transaction()`. Example from `src/lib/assinafy/service.ts:68`: `db.transaction(async (tx) => { ... })`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |
| Tests     | `npm run test`           | all pass            |

## Scope

**In scope**:
- `src/lib/auth/service.ts`
- `src/lib/email/index.ts`
- `src/lib/email/index.test.ts` (create)

**Out of scope**:
- `src/lib/email/templates.ts` — unrelated template rendering.
- `src/lib/auth/service.test.ts` — existing tests, no changes needed beyond adding the new sendEmail import mock.

## Git workflow

- Branch: `advisor/005-password-reset-atomic`
- Commit per step or per logical unit; message style: `fix(auth): wrap password reset in db.transaction for audit atomicity` and `test(email): add sendEmail unit tests`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Wrap password reset in a transaction

In `src/lib/auth/service.ts`, replace the two sequential calls with a single `db.transaction`:

```typescript
  const result = await db.transaction(async (tx) => {
    await tx.update(admins)
      .set({ passwordHash, mustChangePassword: true, updatedAt: sql`now()` })
      .where(eq(admins.id, targetId));

    await tx.insert(auditLogs).values({
      action: 'password_reset',
      entityType: 'admin',
      entityId: targetId,
      performedBy: actorId,
    });
  });
```

Remove both `retryTransientConnection` wrappers. The password update and audit insert are now one atomic operation — if either fails, both roll back.

**Verify**: `npm run typecheck` → exit 0

### Step 2: Add sendEmail unit tests

Create `src/lib/email/index.test.ts`. The test should:

1. **Send success**: mock `global.fetch` to return `{ ok: true }`, call `sendEmail(...)`, assert no throw.
2. **Send failure**: mock `global.fetch` to return `{ ok: false, status: 401, text: () => Promise.resolve('Unauthorized') }`, assert `EmailSendError` with `status === 401`.
3. **Network error**: mock `global.fetch` to reject, assert the error propagates.

Use the repo's existing test conventions (Vitest, `vi.fn()`, from `src/lib/email/templates.test.ts` as structural reference). Do **not** make real HTTP calls — mock `fetch` with `vi.spyOn(globalThis, 'fetch')`.

**Verify**: `npm run test -- src/lib/email/index.test.ts` → all pass

## Test plan

- `src/lib/email/index.test.ts` — 3 test cases (success, HTTP error, network error)
- Run all unit tests afterward to confirm no regression: `npm run test`

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0; `sendEmail` tests exist and pass
- [ ] `grep -n "db.transaction" src/lib/auth/service.ts` returns at least one match in `resetPassword`
- [ ] `grep -n "retryTransientConnection" src/lib/auth/service.ts` in `resetPassword` returns 0 matches (removed)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
- `resetPassword` structure changed substantially (e.g. the audit insert was moved or removed)
- A step's verification fails twice after a reasonable fix attempt
- `db.transaction` cannot accept the calls as extracted (check Drizzle API compatibility)

## Maintenance notes

- If `resetPassword` gains additional writes in the future, keep them inside the same transaction.
- `sendEmail` tests depend on `global.fetch` — if the project switches from native fetch to a library (e.g. `mailjet`), update the mock accordingly but keep the test surface.
