# Plan 004: Replace absolute stream timeout with idle timeout

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 95e67aa..HEAD -- src/lib/ai/gemini.ts`

## Status

- **Status**: DONE
- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `95e67aa`, 2026-06-10
- **Issue**: https://github.com/prof-ramos/intranet/issues/159

## Why this matters

The Gemini stream generator uses a hardcoded 30-second `setTimeout` to abort the entire stream. If generation is healthy but simply long, it gets aborted. An idle read timeout (resetting on each chunk) prevents this while still protecting against hung connections.

## Current state

- `src/lib/ai/gemini.ts` — Lines 246-283 now implement an idle read timeout. A resetting timer inside the `for await` loop:
  ```typescript
  let timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS); // line 246
  // ...
  for await (const chunk of result) {       // line 262
    clearTimeout(timer);                     // line 263 — reset on each chunk
    timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS); // line 264
    // ...
  }
  // ...
  clearTimeout(timer);                       // line 283 — cleanup in finally
  ```

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |

## Scope

**In scope**:
- `src/lib/ai/gemini.ts`

**Out of scope**:
- Other functions in `gemini.ts` that use `runWithAbort` (they are not streams).

## Git workflow

- Branch: `advisor/004-stream-timeout`
- Message style: `fix(ai): implement idle read timeout for streams`

## Verification (applied in commit `7178dd5`)

- [x] `npm run typecheck` exits 0
- [x] Stream resets the timer on each chunk (lines 263-264 in `gemini.ts`).

## STOP conditions
