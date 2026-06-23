# Plan 006: Use timing-safe comparison in webhook secret validation

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7178dd5..HEAD -- src/lib/integrations/webhook-handler.ts src/lib/integrations/webhook-handler.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `7178dd5`, 2026-06-10
- **Issue**: https://github.com/prof-ramos/intranet/issues/162

## Why this matters

The `requireSecretHeader` function in `webhook-handler.ts` compares the provided secret against the expected secret using `!==` (line 74). This is a timing-unsafe comparison — an attacker can brute-force the secret character by character by measuring response time differences. Since the same secret protects Assinafy webhook callbacks, a compromised secret allows forging webhook events that mutate `oficios` status (e.g. marking a document as signed without actual signing).

The project already has `safeCompare` (`src/lib/crypto/safe-compare.ts`) using `crypto.timingSafeEqual` — this plan switches the comparison to use it.

## Current state

- `src/lib/integrations/webhook-handler.ts` — Lines 56-84, `requireSecretHeader` function:

```typescript
export function requireSecretHeader(options: {
  request: Request;
  secret: string | undefined;
  headerName: string;
  missingSecretResponse: Response | (() => Response);
  unauthorizedResponse: Response | (() => Response);
}): WebhookAuthResult<undefined> {
  // ...

  const providedSecret = options.request.headers.get(options.headerName);
  if (!providedSecret || providedSecret !== options.secret) {  // ← line 74: timing-unsafe
    // ...
  }

  return { ok: true, context: undefined };
}
```

- `src/lib/crypto/safe-compare.ts` — Lines 11-21: existing `safeCompare(expected, actual)` using `crypto.timingSafeEqual`.

- Repo conventions: Other auth functions (e.g. `src/lib/cron/auth.ts:30`) already use `safeCompare`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |
| Tests     | `npm run test`           | all pass            |

## Scope

**In scope**:
- `src/lib/integrations/webhook-handler.ts`
- `src/lib/integrations/webhook-handler.test.ts` (if tests exist — update or create)

**Out of scope**:
- `src/lib/crypto/safe-compare.ts` — no changes needed.
- Other callers that already use `safeCompare`.

## Git workflow

- Branch: `advisor/006-webhook-timing-safe`
- Message style: `fix(security): use timing-safe comparison in requireSecretHeader`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Import safeCompare

In `src/lib/integrations/webhook-handler.ts`, add the import:

```typescript
import { safeCompare } from '@/lib/crypto/safe-compare';
```

**Verify**: `npm run typecheck` → exit 0

### Step 2: Replace !== with safeCompare

Change line 74 from:

```typescript
  if (!providedSecret || providedSecret !== options.secret) {
```

to:

```typescript
  if (!providedSecret || !safeCompare(options.secret, providedSecret)) {
```

**Verify**: `npm run typecheck` → exit 0

### Step 3: Update or confirm test coverage

Check if `src/lib/integrations/webhook-handler.test.ts` exists. If it does, run it to confirm existing tests still pass:

```
npx vitest run src/lib/integrations/webhook-handler.test.ts
```

If the file does **not** exist, or existing tests don't cover `requireSecretHeader`, add tests for:
- Valid secret → returns `{ ok: true }`
- Invalid secret → returns `{ ok: false }` with the unauthorized response
- Missing header → returns `{ ok: false }` with the unauthorized response
- Secret is `undefined` → returns `{ ok: false }` with missing-secret response

**Verify**: `npx vitest run src/lib/integrations/webhook-handler.test.ts` → all pass

## Test plan

- Existing tests must pass.
- If no test file exists: create `src/lib/integrations/webhook-handler.test.ts` with 4 test cases (valid, invalid, missing header, undefined secret).
- If test file exists: verify coverage of `requireSecretHeader` and add missing cases.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0
- [ ] `grep "safeCompare" src/lib/integrations/webhook-handler.ts` confirms import and usage
- [ ] `grep "!==" src/lib/integrations/webhook-handler.ts` does NOT match in `requireSecretHeader` (may match elsewhere)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
- `safeCompare` signature is incompatible (check `src/lib/crypto/safe-compare.ts:11` — takes `(expected, actual)`)
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- The `safeCompare` function pads both strings to equal length before comparison — correct for using `(expected, actual)` where expected is the known secret.
- Any future addition of secret comparison should also use `safeCompare`.
