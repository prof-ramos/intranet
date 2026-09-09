# Plan 010: Use `getGeminiApiKey()` in the email-triage pipeline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/email-triage/pipeline.ts src/lib/ai/settings.ts src/lib/ai/gemini.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/475

## Why this matters

Ofício/email generation reads the Gemini key via `getGeminiApiKey()` (`src/lib/ai/settings.ts:29-41`): env first, then the encrypted `app_settings` row written by Config → Integrações → IA. The daily email-triage cron (`vercel.json` → `/api/v1/email-triage/process` → `processBatch` → `processEmail`) reads **only** `env.GEMINI_API_KEY` (`pipeline.ts:148-152`). Operators can “configure IA” in the UI, ofícios work, and every triage message still fails with `GEMINI_API_KEY nao configurada.` The V2 UI is hidden (#429); the cron is not.

## Current state

```ts
// src/lib/email-triage/pipeline.ts ~148
const apiKey = env.GEMINI_API_KEY;
if (!apiKey) {
  const error = 'GEMINI_API_KEY nao configurada.';
  log.error(error);
  return { success: false, messageId, error };
}
```

```ts
// src/lib/ai/settings.ts
export async function getGeminiApiKey(): Promise<string | null> {
  const envKey = env.GEMINI_API_KEY?.trim() || null;
  if (envKey) return envKey;
  // ... decrypt app_settings row
}
```

`analyzeEmail` in `src/lib/email-triage/analyzer.ts` takes the key as an argument from the pipeline.

**Conventions**

- Never log the key. Errors go through `toSafeErrorLog` / existing pipeline logger.
- Keep processing one message at a time; do not cache the key across the whole batch unless `getGeminiApiKey` is already cheap (it hits DB when env is empty — calling once per `processBatch` is OK; calling per email is also OK).
- #429: do not un-hide email-triage UI.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/email-triage/pipeline.ts src/lib/email-triage` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/email-triage/pipeline.ts`
- `src/lib/email-triage` tests that mock `env.GEMINI_API_KEY` (update mocks to `getGeminiApiKey`)
- Do not change `src/lib/ai/settings.ts` unless a tiny helper is required (prefer reusing `getGeminiApiKey` as-is)

**Out of scope**:
- Analyzer prompt text, Gemini models allowlist.
- Gmail fetch / watch cron (plan 009).
- UI for triage.

## Git workflow

- Branch: `fix/issue-<N>-triage-gemini-key-source`
- Commit: `fix(email-triage): usar getGeminiApiKey no pipeline`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Swap the key source

In `processEmail`, `const apiKey = await getGeminiApiKey();` then the same empty check. Import from `@/lib/ai/settings`. Do not read `env.GEMINI_API_KEY` here.

Optional: resolve the key once in `processBatch` and pass it into `processEmail` to avoid N DB reads. If you do that, keep env-first behaviour inside `getGeminiApiKey`.

**Verify**: `rg -n "env.GEMINI_API_KEY" src/lib/email-triage/pipeline.ts` empty.

### Step 2: Tests

Find pipeline tests (`rg processEmail src/lib/email-triage --glob '*.test.ts'`). Mock `@/lib/ai/settings` `getGeminiApiKey`:

- resolves a key → `analyzeEmail` called
- resolves `null` → `{ success: false, error: ... }` and no Gemini call

If there is no pipeline test file, add `src/lib/email-triage/pipeline.test.ts` with those two cases, mocking Gmail/analyzer/persister like neighboring tests (`analyzer.test.ts` / `persister.test.ts`).

## Test plan

- Two cases above. Do not call live Gemini or Gmail.
- Pattern: `src/lib/email-triage/analyzer.test.ts` (heavy mocks).

## Done criteria

- [ ] Pipeline uses `getGeminiApiKey()` only
- [ ] Null key fails the message without throwing out of `processEmail`
- [ ] Focused vitest + lint + typecheck pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- `getGeminiApiKey` cannot be imported from the pipeline because of `server-only` / cycle. STOP and report.
- You discover the analyzer already reads settings internally — then the pipeline env check is dead code; still switch or delete it, but do not double-read inconsistently.

## Maintenance notes

- Reviewer: env var must still win over the UI-stored key (existing `getGeminiApiKey` order).
- Cron remains authorized with `CRON_SECRET` (untouched).
