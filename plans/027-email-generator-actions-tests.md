# Plan 027: Add unit tests for the email generator server action

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat f90bafe..HEAD -- src/app/app/secretaria/emails/gerar/actions.ts src/app/app/email-triage/actions.test.ts`
> If either file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `f90bafe`, 2026-06-19

## Why this matters

`src/app/app/secretaria/emails/gerar/actions.ts` contains the server action
that guards email generation: it validates the email type against an allowlist,
rejects empty prompts, checks whether Gemini is configured, enforces a rate
limit, and surfaces `GeminiError` messages to the user. None of these paths
have test coverage. Compare `src/app/app/email-triage/actions.test.ts`, which
covers the analogous triage action with the same pattern. A regression in any
validation path would silently break without a failing test.

## Current state

- `src/app/app/secretaria/emails/gerar/actions.ts` — server action to test.

Full source (`actions.ts:1-73`):

```ts
'use server';

import { defineServerAction } from '@/lib/server-actions/define-form-action';
import { generateEmailContent } from '@/lib/ai/gemini';
import { GeminiError } from '@/lib/ai/errors';
import { isGeminiConfigured } from '@/lib/ai/settings';
import { ALLOWED_EMAIL_TYPES, type EmailType } from '@/lib/ai/constants';
import { toSafeErrorLog } from '@/lib/error-log';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const logger = createLogger('secretaria:emails:gerar');

function isValidEmailType(value: unknown): value is EmailType {
  return (ALLOWED_EMAIL_TYPES as readonly unknown[]).includes(value);
}

export type GenerateEmailResult =
  | { success: true; subject: string; html: string }
  | { success: false; error: string };

const _generateEmailAction = defineServerAction({
  auth: 'any',
  schema: z.object({
    emailType: z.string(),
    prompt: z.string(),
  }),
  rateLimit: { key: 'ai_generate_email', windowMs: 60_000, maxRequests: 5 },
  service: async (input: { emailType: string; prompt: string }): Promise<GenerateEmailResult> => {
    const trimmedPrompt = input.prompt?.trim();
    if (!trimmedPrompt) {
      return { success: false, error: 'Descreva o conteúdo do e-mail.' };
    }

    if (!isValidEmailType(input.emailType)) {
      return { success: false, error: 'Tipo de e-mail inválido.' };
    }

    const configured = await isGeminiConfigured();
    if (!configured) {
      return {
        success: false,
        error:
          'A chave da API Gemini não está configurada. Solicite ao administrador que configure em Configurações → Integrações → IA.',
      };
    }

    try {
      const { subject, html } = await generateEmailContent({
        emailType: input.emailType,
        prompt: trimmedPrompt,
      });
      return { success: true, subject, html };
    } catch (error) {
      logger.error(
        'Failed to generate email',
        { error: toSafeErrorLog(error) },
        error instanceof Error ? error : undefined,
      );
      if (error instanceof GeminiError) {
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Falha ao gerar e-mail.' };
    }
  },
});

export async function generateEmailAction(
  emailType: string,
  prompt: string,
): Promise<GenerateEmailResult> {
  return _generateEmailAction({ emailType, prompt });
}
```

- `src/app/app/email-triage/actions.test.ts` — **pattern file**: use its
  mock structure as a model. Key patterns to copy:
  - `vi.mock('next/headers', ...)` with a `headersMock` spy
  - `vi.mock('@/lib/rate-limit', ...)` with `consumeIpRateLimitMock`
  - `vi.mock('@/lib/auth/authorization', ...)` with `requireRoleMock`
  - `vi.mock('next/cache', ...)` for `revalidatePath` / `revalidateTag`
  - `beforeEach(() => { vi.clearAllMocks(); ... })` resetting mocks

The `defineServerAction` factory (at `@/lib/server-actions/define-form-action`)
reads IP from `next/headers`, calls `requireAuth` / `requireRole`, and calls
the rate-limiter — those must be mocked. The `service` callback receives the
validated input directly; we test its behaviour by mocking the dependencies
it calls (`isGeminiConfigured`, `generateEmailContent`).

## Commands you will need

| Purpose   | Command                                                                       | Expected on success        |
|-----------|-------------------------------------------------------------------------------|----------------------------|
| Lint      | `npm run lint`                                                                 | exit 0                     |
| Typecheck | `npm run typecheck`                                                            | exit 0, zero errors        |
| Tests     | `npx vitest run src/app/app/secretaria/emails/gerar/actions.test.ts`          | all pass                   |
| Full test | `npm run test`                                                                 | all pass                   |

## Scope

**In scope**:
- `src/app/app/secretaria/emails/gerar/actions.test.ts` — create this file

**Out of scope** (do NOT touch):
- `src/app/app/secretaria/emails/gerar/actions.ts` — source under test; do NOT modify
- Any other file

## Git workflow

- Branch: `advisor/027-email-generator-actions-tests`
- Commit message: `test(secretaria): add unit tests for email generator server action`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Read the pattern file in full before writing

Read `src/app/app/email-triage/actions.test.ts` in full. Note:
- How `vi.mock` paths match the import paths in the source under test
- How `headersMock`, `consumeIpRateLimitMock` are used in `beforeEach`
- The `fd()` helper for building `FormData`

The email generator action does not use `FormData` (it receives plain
arguments via `_generateEmailAction({ emailType, prompt })`), but the same
mock infrastructure applies.

### Step 2: Create `src/app/app/secretaria/emails/gerar/actions.test.ts`

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateEmailAction } from './actions';
import { GeminiError } from '@/lib/ai/errors';

// ── Mocks ────────────────────────────────────────────────────────────────────

const headersMock = vi.fn();
const consumeIpRateLimitMock = vi.fn();
const requireAuthMock = vi.fn();
const isGeminiConfiguredMock = vi.fn();
const generateEmailContentMock = vi.fn();

vi.mock('next/headers', () => ({
  headers: (...args: unknown[]) => headersMock(...args),
}));

vi.mock('@/lib/rate-limit', () => ({
  consumeIpRateLimit: (...args: unknown[]) => consumeIpRateLimitMock(...args),
}));

vi.mock('@/lib/ip', () => ({
  getTrustedClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/auth/require-auth', () => ({
  requireAuth: (...args: unknown[]) => requireAuthMock(...args),
}));

vi.mock('@/lib/ai/settings', () => ({
  isGeminiConfigured: (...args: unknown[]) => isGeminiConfiguredMock(...args),
}));

vi.mock('@/lib/ai/gemini', () => ({
  generateEmailContent: (...args: unknown[]) => generateEmailContentMock(...args),
}));

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  headersMock.mockResolvedValue(new Headers());
  consumeIpRateLimitMock.mockResolvedValue({ allowed: true });
  requireAuthMock.mockResolvedValue({ userId: 1, role: 'secretaria' });
  isGeminiConfiguredMock.mockResolvedValue(true);
  generateEmailContentMock.mockResolvedValue({
    subject: 'Assunto gerado',
    html: '<!doctype html><html><body>Conteúdo</body></html>',
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('generateEmailAction', () => {
  it('returns success with subject and html on happy path', async () => {
    const result = await generateEmailAction('newsletter', 'Conteúdo da newsletter');
    expect(result).toEqual({
      success: true,
      subject: 'Assunto gerado',
      html: '<!doctype html><html><body>Conteúdo</body></html>',
    });
  });

  it('rejects empty prompt', async () => {
    const result = await generateEmailAction('newsletter', '   ');
    expect(result).toEqual({ success: false, error: 'Descreva o conteúdo do e-mail.' });
    expect(generateEmailContentMock).not.toHaveBeenCalled();
  });

  it('rejects invalid email type', async () => {
    const result = await generateEmailAction('invalid_type', 'Conteúdo válido');
    expect(result).toEqual({ success: false, error: 'Tipo de e-mail inválido.' });
    expect(generateEmailContentMock).not.toHaveBeenCalled();
  });

  it('accepts all allowed email types', async () => {
    const types = ['newsletter', 'convite', 'comunicado', 'aviso'] as const;
    for (const type of types) {
      const result = await generateEmailAction(type, 'Conteúdo');
      expect(result).toMatchObject({ success: true });
    }
  });

  it('returns error when Gemini is not configured', async () => {
    isGeminiConfiguredMock.mockResolvedValue(false);
    const result = await generateEmailAction('aviso', 'Conteúdo do aviso');
    expect(result).toMatchObject({ success: false });
    expect((result as { success: false; error: string }).error).toContain('chave da API Gemini');
    expect(generateEmailContentMock).not.toHaveBeenCalled();
  });

  it('surfaces GeminiError message to the user', async () => {
    generateEmailContentMock.mockRejectedValue(
      new GeminiError('Conteúdo bloqueado pela política de segurança.'),
    );
    const result = await generateEmailAction('comunicado', 'Texto do comunicado');
    expect(result).toEqual({
      success: false,
      error: 'Conteúdo bloqueado pela política de segurança.',
    });
  });

  it('returns generic error for unknown exceptions', async () => {
    generateEmailContentMock.mockRejectedValue(new Error('Network timeout'));
    const result = await generateEmailAction('newsletter', 'Conteúdo da newsletter');
    expect(result).toEqual({ success: false, error: 'Falha ao gerar e-mail.' });
  });

  it('enforces rate limit — returns error when limit is exceeded', async () => {
    consumeIpRateLimitMock.mockResolvedValue({ allowed: false });
    const result = await generateEmailAction('convite', 'Conteúdo do convite');
    expect(result).toMatchObject({ success: false });
    expect(generateEmailContentMock).not.toHaveBeenCalled();
  });
});
```

**Verify**: `npx vitest run src/app/app/secretaria/emails/gerar/actions.test.ts`
→ all tests pass.

If a mock path causes an import error, check the actual import paths in
`actions.ts` and align the `vi.mock(...)` strings accordingly. Common
divergences: `@/lib/auth/require-auth` vs `@/lib/auth/authorization` (check
which one `defineServerAction` uses internally by reading
`src/lib/server-actions/define-form-action.ts`).

### Step 3: Run the full test suite

```bash
npm run test
```

All existing tests plus the new action tests must pass.

### Step 4: Typecheck and lint

```bash
npm run typecheck && npm run lint
```

Both must exit 0.

## Done criteria

- [ ] `src/app/app/secretaria/emails/gerar/actions.test.ts` exists
- [ ] `npx vitest run src/app/app/secretaria/emails/gerar/actions.test.ts` passes with ≥ 8 tests
- [ ] `npm run test` exits 0, no regressions
- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] Only the new test file is created (`git status`)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- Any `vi.mock` path throws `Cannot find module` — read the actual import
  paths in `actions.ts` and `src/lib/server-actions/define-form-action.ts`,
  correct the paths, and retry once. If still failing, report back.
- The rate-limit test fails because `defineServerAction` does not call
  `consumeIpRateLimit` — investigate `define-form-action.ts` to find the
  actual rate-limit hook and mock accordingly.
- TypeScript errors in the test file that cannot be resolved with obvious type
  annotations.

## Maintenance notes

- When new validation paths are added to the `service` callback in `actions.ts`
  (e.g., a maximum prompt length check, a new allowed email type), add a
  corresponding test case here.
- The mock for `@/lib/auth/require-auth` returns `role: 'secretaria'` —
  if the action ever gains role-gating at the `defineServerAction` level
  (currently `auth: 'any'`), add a test that rejects non-authorised roles.
- The `generateEmailContentMock` in the happy path returns a minimal valid
  HTML string. If `generateEmailContent` ever validates the returned HTML
  differently, update the mock value accordingly.
