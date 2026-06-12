# Plan 011: Add error logging to fire-and-forget calls in verify-request

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 123f019..HEAD -- src/lib/integrations/verify-request.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `123f019`, 2026-06-12
- **Issue**: none yet

## Why this matters

`verify-request.ts` has two fire-and-forget calls to `updateApiKeyLastUsed()` that silently swallow all errors via `.catch(() => {})`. If the DB write fails (connection pool exhausted, constraint violation, etc.), the failure is completely invisible — no log, no metric, no way to know. While `updateApiKeyLastUsed` is non-critical (tracking last-used timestamp), completely silent failures make debugging production issues harder. The fix is trivial: log the error at `warn` level so it appears in structured logs without affecting request flow.

## Current state

- `src/lib/integrations/verify-request.ts:173` — env-var key path:
  ```ts
  updateApiKeyLastUsed(sha256Hex(key)).catch(() => {});
  ```
- `src/lib/integrations/verify-request.ts:226` — table-backed key path:
  ```ts
  updateApiKeyLastUsed(keyHash).catch(() => {});
  ```
- `src/lib/integrations/verify-request.ts:22` — logger already exists:
  ```ts
  const logger = createLogger('integrations:auth');
  ```

## Commands you will need

| Purpose   | Command                              | Expected on success          |
|-----------|--------------------------------------|------------------------------|
| Typecheck | `npm run typecheck`                  | exit 0, no errors            |
| Lint      | `npm run lint`                       | exit 0                       |
| Tests     | `npm run test`                       | all pass                     |

## Scope

**In scope** (the only files you should modify):
- `src/lib/integrations/verify-request.ts` (two lines)

**Out of scope**:
- `updateApiKeyLastUsed` function itself
- Other fire-and-forget patterns elsewhere in the codebase
- The `verifyIntegrationRequest` function signature or return type

## Git workflow

- Branch: `advisor/011-log-fire-forget-verify-request`
- Commit message: `fix(security): log errors from fire-and-forget updateApiKeyLastUsed`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Replace the first `.catch(() => {})` (line 173)

Find:
```ts
    updateApiKeyLastUsed(sha256Hex(key)).catch(() => {});
```

Replace with:
```ts
    updateApiKeyLastUsed(sha256Hex(key)).catch((err) => {
      logger.warn('Failed to update lastUsedAt for legacy env-var key', {
        error: err instanceof Error ? err.message : String(err),
      });
    });
```

### Step 2: Replace the second `.catch(() => {})` (line 226)

Find:
```ts
  updateApiKeyLastUsed(keyHash).catch(() => {});
```

Replace with:
```ts
  updateApiKeyLastUsed(keyHash).catch((err) => {
    logger.warn('Failed to update lastUsedAt for table-backed key', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
```

**Verify**: `npm run typecheck` → exit 0

### Step 3: Run quality gates

```bash
npm run lint        # → exit 0
npm run typecheck   # → exit 0
npm run test        # → all pass
```

## Test plan

- No new tests needed — the change is adding log output to existing error paths. The behavior is identical (fire-and-forget).
- Verify existing tests still pass: `npm run test -- src/lib/integrations/`

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test` exits 0
- [ ] `grep -n "\.catch(() => {})" src/lib/integrations/verify-request.ts` returns no matches
- [ ] `grep -n "\.catch((err)" src/lib/integrations/verify-request.ts` returns exactly 2 matches

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The `logger` import is no longer available or the `createLogger` call has changed.

## Maintenance notes

- These log entries are at `warn` level, not `error`, because `updateApiKeyLastUsed` is non-critical. If the team later adds metrics/alerting on warn-level logs, these will appear but should not trigger pages.
- If the function signature of `updateApiKeyLastUsed` changes to return `void` instead of `Promise`, the `.catch()` will need to be removed.
