# Plan 015: Add unit tests for cron auth and autoMarkOverdue

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 123f019..HEAD -- src/lib/cron/ src/lib/finance/service.ts src/lib/auth/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 010 (the cron route for finance-overdue must exist first)
- **Category**: tests
- **Planned at**: commit `123f019`, 2026-06-12
- **Issue**: none yet

## Why this matters

The cron authorization module (`src/lib/cron/auth.ts`) has no unit tests. This module is security-critical: it gates all cron endpoints. The `autoMarkOverduePaymentsService` also lacks direct unit tests (it's only tested indirectly via the finance page integration). Adding focused unit tests for these modules improves coverage and catches regressions.

## Current state

- `src/lib/cron/auth.ts` — `authorizeCronRequest(request)` function: checks Bearer token against `env.CRON_SECRET` using `safeCompare`. No test file exists.
- `src/lib/finance/service.ts:19-60` — `autoMarkOverduePaymentsService()`: runs in a transaction, calls `markOverduePaymentsForAudit`, logs audit entries, emits domain events. No dedicated test file.
- Existing test exemplar: `src/app/api/v1/cron/gmail-watch/route.test.ts` — shows the mocking pattern for cron routes (mock `@/lib/env`, mock service functions, test GET with valid/invalid bearer).

## Commands you will need

| Purpose   | Command                              | Expected on success          |
|-----------|--------------------------------------|------------------------------|
| Typecheck | `npm run typecheck`                  | exit 0, no errors            |
| Lint      | `npm run lint`                       | exit 0                       |
| Tests     | `npm run test`                       | all pass                     |
| One file  | `npx vitest run src/lib/cron/auth.test.ts` | all pass             |

## Scope

**In scope** (the only files you should create/modify):
- `src/lib/cron/auth.test.ts` (create)
- `src/lib/finance/service.test.ts` (create, if doesn't exist)

**Out of scope**:
- Integration tests (those require a live DB)
- E2E tests for cron routes
- Modifying the production code being tested

## Git workflow

- Branch: `advisor/015-cron-auth-finance-tests`
- Commit message: `test: add unit tests for cron auth and autoMarkOverduePayments`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create cron auth tests

Create `src/lib/cron/auth.test.ts` following the mocking pattern from `gmail-watch/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {
    CRON_SECRET: 'test-secret-123',
  },
}));

describe('authorizeCronRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ok=true for valid bearer token', async () => {
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test', {
      headers: { authorization: 'Bearer test-secret-123' },
    });

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(true);
  });

  it('returns ok=false with 401 when no authorization header', async () => {
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test');

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const response = result.response;
      expect(response.status).toBe(401);
    }
  });

  it('returns ok=false with 401 for invalid bearer token', async () => {
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const response = result.response;
      expect(response.status).toBe(401);
    }
  });

  it('returns ok=false with 503 when CRON_SECRET is not configured', async () => {
    vi.mocked(await import('@/lib/env')).env.CRON_SECRET = '';
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test', {
      headers: { authorization: 'Bearer some-token' },
    });

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const response = result.response;
      expect(response.status).toBe(503);
    }
  });

  it('handles bearer prefix case-insensitively', async () => {
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test', {
      headers: { authorization: 'BEARER test-secret-123' },
    });

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(true);
  });

  it('strips whitespace from bearer token', async () => {
    const { authorizeCronRequest } = await import('./auth');
    const request = new Request('http://localhost/api/v1/test', {
      headers: { authorization: 'Bearer  test-secret-123  ' },
    });

    const result = authorizeCronRequest(request);
    expect(result.ok).toBe(true);
  });
});
```

**Verify**: `npx vitest run src/lib/cron/auth.test.ts` → all 6 tests pass

### Step 2: Create autoMarkOverdue service tests

Create `src/lib/finance/service.test.ts`. Check first if it already exists — if so, add new tests to it. If not, create it:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all dependencies
vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn((fn: unknown) => fn),
  },
}));

vi.mock('./repository', () => ({
  markOverduePaymentsForAudit: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/lib/sanitize-pii', () => ({
  sanitizePiiValue: vi.fn((v: unknown) => v),
}));

describe('autoMarkOverduePaymentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 0 when no payments are overdue', async () => {
    const { autoMarkOverduePaymentsService } = await import('./service');
    const count = await autoMarkOverduePaymentsService();
    expect(count).toBe(0);
  });

  it('returns the count of transitioned payments', async () => {
    const mockPayments = [
      { id: 1, associateId: 10, year: 2026, month: 5, paymentMethod: 'boleto', paidAt: null },
      { id: 2, associateId: 20, year: 2026, month: 5, paymentMethod: 'pix', paidAt: null },
    ];

    const repository = await import('./repository');
    vi.mocked(repository.markOverduePaymentsForAudit).mockResolvedValue(mockPayments);

    const { autoMarkOverduePaymentsService } = await import('./service');
    const count = await autoMarkOverduePaymentsService();
    expect(count).toBe(2);
  });

  it('calls markOverduePaymentsForAudit inside a transaction', async () => {
    const db = await import('@/lib/db');
    const { autoMarkOverduePaymentsService } = await import('./service');

    await autoMarkOverduePaymentsService();

    expect(db.db.transaction).toHaveBeenCalled();
  });
});
```

**Verify**: `npx vitest run src/lib/finance/service.test.ts` → all 3 tests pass

### Step 3: Run full test suite

```bash
npm run test        # → all pass (existing + new tests)
npm run lint        # → exit 0
npm run typecheck   # → exit 0
```

## Test plan

- 6 new tests for `authorizeCronRequest`: valid token, missing token, invalid token, missing CRON_SECRET, case-insensitive bearer, whitespace handling.
- 3 new tests for `autoMarkOverduePaymentsService`: no overdue, with overdue, transaction usage.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test` exits 0
- [ ] `npx vitest run src/lib/cron/auth.test.ts` → 6 tests pass
- [ ] `npx vitest run src/lib/finance/service.test.ts` → 3 tests pass (or more if file already existed)
- [ ] No files outside the in-scope list are modified (`git status`)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- The mock setup doesn't match the actual module exports (the codebase has changed).
- `src/lib/finance/service.test.ts` already exists with different tests.

## Maintenance notes

- These tests mock the DB layer. For integration-level testing of `autoMarkOverduePaymentsService`, see the `test:integration` suite which requires a live PostgreSQL database.
- If `markOverduePaymentsForAudit` or `emitDomainEvent` signatures change, update the mocks accordingly.
- The cron auth tests are security-critical: ensure `safeCompare` is used (not `===`) by checking that wrong tokens are rejected.
