# Plan 022: Delete `generateEmailContentStream` — dead exported function that produces broken output

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat f90bafe..HEAD -- src/lib/ai/gemini.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug / tech-debt
- **Planned at**: commit `f90bafe`, 2026-06-19

## Why this matters

`generateEmailContentStream` is exported from `src/lib/ai/gemini.ts` but has
zero consumers in the codebase. It is also architecturally broken: it yields
raw text chunks from the model without the JSON-parse step that the production
path (`generateEmailContent`) performs to extract `{ subject, html }`. Any
future developer who imports it expecting the same contract as
`generateEmailContent` would get silently malformed output. Deleting it removes
57 lines of maintenance surface and eliminates the trap.

## Current state

- `src/lib/ai/gemini.ts` — Gemini API client; the dead function lives at lines 231–288.

Relevant excerpt (`gemini.ts:231-288`):

```ts
export async function* generateEmailContentStream(params: {
  emailType: string;
  prompt: string;
  model?: string;
}): AsyncGenerator<string> {
  if (!(ALLOWED_EMAIL_TYPES as readonly string[]).includes(params.emailType)) {
    throw new GeminiError('Tipo de e-mail inválido.');
  }

  const userMessage = buildEmailUserMessage(params.emailType, params.prompt);

  const model = resolveModel(params.model, EMAIL_MODEL);

  const ai = await getGeminiClient();
  const controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let accumulated = '';

  try {
    const result = await ai.models.generateContentStream({
      model,
      contents: userMessage,
      config: {
        systemInstruction: EMAIL_SYSTEM_INSTRUCTION,
        temperature: 0.7,
        maxOutputTokens: 8192,
        safetySettings: getSafetySettings(),
        abortSignal: controller.signal,
      },
    });

    for await (const chunk of result) {
      clearTimeout(timer);
      timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      if (chunk.text) {
        accumulated += chunk.text;
        yield chunk.text;
      }
    }
  } catch (error) {
    const isAbort = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
    if (isAbort && controller.signal.aborted) {
      throw new GeminiError('Tempo esgotado. Tente novamente.');
    }
    if (error instanceof GeminiError) throw error;
    logger.error(
      'Email stream generation failed',
      { error: toSafeErrorLog(error) },
      error instanceof Error ? error : undefined,
    );
    throw new GeminiError('Falha ao gerar e-mail. Tente novamente.');
  } finally {
    clearTimeout(timer);
  }

  if (!accumulated.trim()) {
    throw new GeminiError('O modelo retornou conteúdo vazio. Tente novamente.');
  }
}
```

Confirm there are no consumers before deleting:

```bash
grep -rn "generateEmailContentStream" src/
```

Expected: only the definition line in `gemini.ts` itself. If any other file
imports it, STOP and report.

## Commands you will need

| Purpose   | Command               | Expected on success        |
|-----------|-----------------------|----------------------------|
| Typecheck | `npm run typecheck`   | exit 0, zero errors        |
| Tests     | `npm run test`        | all pass                   |
| Lint      | `npm run lint`        | exit 0                     |

## Scope

**In scope**:
- `src/lib/ai/gemini.ts` — delete lines 231–288 (the entire `generateEmailContentStream` function)

**Out of scope** (do NOT touch):
- `src/lib/ai/gemini.test.ts` — no test references this function; no changes needed
- Any other file

## Git workflow

- Branch: `advisor/022-delete-email-stream-dead-code`
- Commit message: `refactor(ai): remove dead generateEmailContentStream export`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Confirm no consumers exist

```bash
grep -rn "generateEmailContentStream" src/
```

Expected output: exactly one line, the function definition in `gemini.ts`.
If any import is found in another file, STOP and report.

### Step 2: Delete the function

Open `src/lib/ai/gemini.ts`. Delete everything from line 231
(`export async function* generateEmailContentStream`) through line 288
(the closing `}` of the function).

After deletion, the file should end after the closing `}` of
`generateEmailContent` (the non-streaming version that ends around line 229).

**Verify**: `grep -n "generateEmailContentStream" src/lib/ai/gemini.ts`
→ no output (function is gone).

### Step 3: Run full checks

```bash
npm run typecheck && npm run lint && npm run test
```

All three must exit 0 with no errors or failures.

## Test plan

No new tests needed — the function is deleted. The existing `gemini.test.ts`
suite must continue to pass unchanged (it never tested this function).

**Verify**: `npm run test -- gemini` → all existing tests pass.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0, all existing tests pass
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "generateEmailContentStream" src/` returns no output
- [ ] Only `src/lib/ai/gemini.ts` is modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- `grep -rn "generateEmailContentStream" src/` finds an import in any file
  other than `gemini.ts` itself — the function has a consumer that was missed.
- The code at lines 231–288 does not match the excerpt above (codebase drifted).
- Any verification command fails after the deletion.

## Maintenance notes

- If streaming email generation is ever implemented in the future, it must
  follow the same structured-JSON contract as `generateEmailContent`
  (i.e., parse `{ subject, html }` from the accumulated stream, not yield
  raw chunks). A Route Handler with SSE is the recommended architecture for
  streaming structured output in Next.js App Router.
