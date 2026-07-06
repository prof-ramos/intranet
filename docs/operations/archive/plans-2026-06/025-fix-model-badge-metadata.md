# Plan 025: Fix stale model name in UI badge and page metadata

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat f90bafe..HEAD -- src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx src/app/app/secretaria/emails/gerar/page.tsx src/lib/ai/constants.ts`
> If any of those files changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `f90bafe`, 2026-06-19

## Why this matters

The badge shown in the UI (`"Gemini 2.0 Flash"`) and the SEO metadata
description (`"Gemini 2.0"`) both refer to a model that is no longer in use.
`constants.ts` defines `EMAIL_MODEL = 'gemini-3.5-flash'`, but neither the
badge nor the metadata are derived from that constant — they are hardcoded
strings. This shows users incorrect information and will silently drift again
next time the model is updated. The fix derives the display name from the
existing constant so future model updates are reflected automatically.

## Current state

- `src/lib/ai/constants.ts` — model name definitions.

`constants.ts:10-11`:
```ts
export const LETTER_MODEL = 'gemini-3.5-flash';
export const EMAIL_MODEL = 'gemini-3.5-flash';
```

- `src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx` — client
  component; hardcoded badge at line 156.

`EmailGeneratorClient.tsx:153-158`:
```tsx
<div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
  <Sparkles className="h-3 w-3 text-[#76AEEA]" />
  Gemini 2.0 Flash
</div>
```

- `src/app/app/secretaria/emails/gerar/page.tsx` — server component; stale
  description at line 7.

`page.tsx:5-8`:
```ts
export const metadata: Metadata = {
  title: 'Gerador de E-mails com IA — ASOF',
  description: 'Gere e-mails institucionais no padrão ASOF usando Inteligência Artificial (Gemini 2.0).',
};
```

**Mapping from model ID to display name** — there is no existing helper; add
one to `constants.ts`. The display name for `'gemini-3.5-flash'` is
`'Gemini 3.5 Flash'`. For `'gemini-2.5-flash'` it is `'Gemini 2.5 Flash'`.
For `'gemini-2.5-flash-lite'` it is `'Gemini 2.5 Flash Lite'`.

## Commands you will need

| Purpose   | Command               | Expected on success        |
|-----------|-----------------------|----------------------------|
| Typecheck | `npm run typecheck`   | exit 0, zero errors        |
| Tests     | `npm run test`        | all pass                   |
| Lint      | `npm run lint`        | exit 0                     |

## Scope

**In scope**:
- `src/lib/ai/constants.ts` — add `MODEL_DISPLAY_NAMES` map and
  `getModelDisplayName` helper
- `src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx` — import and
  use the helper for the badge
- `src/app/app/secretaria/emails/gerar/page.tsx` — update the hardcoded
  description string (static metadata — cannot use the runtime helper, so just
  correct the string)

**Out of scope** (do NOT touch):
- `src/lib/ai/gemini.ts`
- Any test files

## Git workflow

- Branch: `advisor/025-fix-model-badge-metadata`
- Commit message: `fix(ai): derive model display name from constant, fix stale badge and metadata`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add `getModelDisplayName` to `constants.ts`

In `src/lib/ai/constants.ts`, append the following after the existing exports:

```ts
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'gemini-3.5-flash': 'Gemini 3.5 Flash',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
};

export function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] ?? modelId;
}
```

**Verify**: `grep -n "getModelDisplayName" src/lib/ai/constants.ts`
→ shows the new export.

### Step 2: Update the badge in `EmailGeneratorClient.tsx`

In `src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx`:

1. Add the import at the top (alongside the existing import from
   `'@/lib/associates/search-params'` or wherever constants are imported):

```ts
import { EMAIL_MODEL, getModelDisplayName } from '@/lib/ai/constants';
```

2. Replace the hardcoded badge text. Find:

```tsx
  Gemini 2.0 Flash
```

Replace with:

```tsx
  {getModelDisplayName(EMAIL_MODEL)}
```

**Verify**: `grep -n "Gemini 2.0 Flash" src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx`
→ no output (hardcoded string is gone).

### Step 3: Update the metadata description in `page.tsx`

In `src/app/app/secretaria/emails/gerar/page.tsx`, update the `description`
field. Note: Next.js `metadata` is a static export — it cannot call runtime
functions. Simply correct the string to match the current model:

Replace:
```ts
  description: 'Gere e-mails institucionais no padrão ASOF usando Inteligência Artificial (Gemini 2.0).',
```

With:
```ts
  description: 'Gere e-mails institucionais no padrão ASOF usando Inteligência Artificial (Gemini 3.5 Flash).',
```

**Verify**: `grep "Gemini 2.0" src/app/app/secretaria/emails/gerar/page.tsx`
→ no output.

### Step 4: Run full checks

```bash
npm run typecheck && npm run lint && npm run test
```

All three must exit 0.

## Test plan

No new tests needed for this cosmetic fix. The existing test suite must
continue to pass.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -rn "Gemini 2.0" src/app/app/secretaria/emails/` returns no output
- [ ] `grep "getModelDisplayName" src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx` returns a match
- [ ] Only the three in-scope files are modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- The hardcoded string `"Gemini 2.0 Flash"` is not found at
  `EmailGeneratorClient.tsx:156` — the file has drifted.
- `EMAIL_MODEL` in `constants.ts` is not `'gemini-3.5-flash'` — model was
  already updated; use the new value for `MODEL_DISPLAY_NAMES`.
- TypeScript errors after adding `getModelDisplayName` to the client component
  (e.g., the import path differs).

## Maintenance notes

- When `EMAIL_MODEL` in `constants.ts` is updated to a new Gemini version, add
  the new model ID + display name to `MODEL_DISPLAY_NAMES` in the same commit.
  The badge and all other callers of `getModelDisplayName` will then reflect
  the change automatically.
- The `page.tsx` metadata description is static and must be updated manually
  when the model changes — it cannot reference runtime constants.
