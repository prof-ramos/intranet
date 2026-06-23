# Plan 012: Replace Promise.race timeout with AbortSignal in email-triage analyzer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- src/lib/email-triage/analyzer.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpts before proceeding.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security / perf
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

`src/lib/email-triage/analyzer.ts` uses `Promise.race` to enforce a 30-second timeout
on the Gemini API call. When the timeout fires, the race rejects — but the underlying
`ai.models.generateContent(...)` call keeps running (orphaned). Orphaned requests
consume a live HTTP connection, hold any buffered response in memory, and continue
accumulating billable Gemini tokens with no mechanism to cancel them.

`src/lib/ai/gemini.ts` already solves this correctly with `runWithAbort`, which
passes an `AbortSignal` to the SDK so the underlying request is actually cancelled
when the timeout fires. The email-triage analyzer should use the same approach.

## Current state

`src/lib/email-triage/analyzer.ts` — the `analyzeEmailWithGemini` function, lines 319–354:

```ts
// src/lib/email-triage/analyzer.ts:22 and 336-354
const GEMINI_TIMEOUT_MS = 30_000;

const response = await Promise.race([
  ai.models.generateContent({
    model: modelName,
    contents: [
      { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
      { role: 'user', parts: [{ text: JSON.stringify(modelInput) }] },
    ],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
    },
  }),
  new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error('Gemini timed out after 30s')),
      GEMINI_TIMEOUT_MS,
    ),
  ),
]);
```

The correct pattern from `src/lib/ai/gemini.ts`:

```ts
// src/lib/ai/gemini.ts:58-80
/**
 * Executa uma chamada ao SDK com timeout que efetivamente ABORTA a requisição
 * subjacente via AbortSignal (ao contrário de um Promise.race que apenas deixa
 * a chamada órfã rodando até o fim).
 */
export async function runWithAbort<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await task(controller.signal);
  } catch (error) {
    const isAbort = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
    if (isAbort && controller.signal.aborted) {
      throw new GeminiError(timeoutMessage);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
```

Note that `runWithAbort` throws a `GeminiError` on timeout. In the analyzer, the
timeout currently throws a plain `Error('Gemini timed out after 30s')`. Check what
type the caller expects and use the appropriate error type (see STOP condition).

## Commands you will need

| Purpose       | Command                                                | Expected on success |
|---------------|--------------------------------------------------------|---------------------|
| Typecheck     | `npm run typecheck`                                    | exit 0              |
| Test (scoped) | `npm run test -- src/lib/email-triage/analyzer.test.ts` | all pass           |
| Lint          | `npm run lint`                                         | exit 0              |

## Scope

**In scope**:
- `src/lib/email-triage/analyzer.ts`

**Out of scope** (do NOT touch):
- `src/lib/ai/gemini.ts` — do not modify `runWithAbort`
- Any test file unless an existing test for the timeout needs updating (verify first)

## Git workflow

- Branch: `advisor/012-email-triage-abort-signal`
- Single commit; message: `fix(email-triage): replace Promise.race timeout with AbortSignal to cancel orphaned Gemini requests`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Import `runWithAbort` from the AI module

At the top of `src/lib/email-triage/analyzer.ts`, add:

```ts
import { runWithAbort } from '@/lib/ai/gemini';
```

Check the existing imports in the file — if `@google/genai` is only imported for the
`GoogleGenAI` constructor and `runWithAbort` wraps the call, the direct import of
`GoogleGenAI` inside the function body can be kept (it is a dynamic import — do not
remove it).

**Verify**: `npm run typecheck` → exit 0 (import resolves).

### Step 2: Replace `Promise.race` with `runWithAbort`

Replace the `Promise.race([...])` block with:

```ts
const response = await runWithAbort(
  (signal) =>
    ai.models.generateContent({
      model: modelName,
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'user', parts: [{ text: JSON.stringify(modelInput) }] },
      ],
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_JSON_SCHEMA,
        abortSignal: signal,
      },
    }),
  GEMINI_TIMEOUT_MS,
  'Gemini timed out after 30s',
);
```

Note: `@google/genai` v2 accepts `abortSignal` inside the `config` object. Confirm
the exact field name by checking `ai.models.generateContent` types — if the field is
named differently (e.g. `signal`), use the correct name. If `abortSignal` is not
supported in the `config` shape, pass it as a top-level `GenerateContentRequest`
option instead.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Remove the now-unused `setTimeout` import (if any)

Check if `setTimeout` was the only usage or if there are other `setTimeout` calls
in the file. Remove the `Promise.race`-specific timer only; do not remove other timers.

**Verify**: `npm run lint` → exit 0 (no unused-variable warnings).

## Test plan

- Run `src/lib/email-triage/analyzer.test.ts` — existing tests must pass unchanged.
- If there is a test that asserts on the `'Gemini timed out after 30s'` error message
  or checks for `Promise.race` behaviour, update it to mock `runWithAbort`'s abort
  path instead. Check by running the test suite first before making any test changes.
- No new test needed for this mechanical substitution.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test -- src/lib/email-triage/analyzer.test.ts` passes
- [ ] `npm run lint` exits 0
- [ ] `grep "Promise.race" src/lib/email-triage/analyzer.ts` returns no matches
- [ ] `grep "runWithAbort" src/lib/email-triage/analyzer.ts` returns exactly one match
- [ ] Only `src/lib/email-triage/analyzer.ts` is modified (plus test file if needed)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `runWithAbort` is not exported from `src/lib/ai/gemini.ts` (check: `grep "export.*runWithAbort" src/lib/ai/gemini.ts`).
- The `@google/genai` SDK version in use does not accept `abortSignal` in the config object (check the SDK types).
- The caller of `analyzeEmailWithGemini` expects a specific error type on timeout and `GeminiError` (thrown by `runWithAbort`) would break it — investigate before proceeding.
- Any existing `analyzer.test.ts` test fails after the change.

## Maintenance notes

- If `analyzeEmailWithGemini` is ever refactored to use the shared `getGeminiClient()`
  from `src/lib/ai/gemini.ts`, the `runWithAbort` wiring is already the correct
  pattern used there (lines 131 and 183 of that file).
- `GEMINI_TIMEOUT_MS` at line 22 of the analyzer is the same value (30 000 ms) as
  `REQUEST_TIMEOUT_MS` in `gemini.ts`. Consider consolidating to a shared constant
  in `src/lib/ai/constants.ts` in a future cleanup pass.
