# Plan 001: Outbox atomicity characterization test (`executor` param)

> **Executor instructions**: Follow step by step. Run every verification command
> and confirm the expected result before moving on. If a STOP condition fires,
> stop and report — do not improvise. When done, update your row in
> `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/integrations/outbox.ts src/lib/integrations/outbox.test.ts src/lib/activities/service.test.ts`
> If any in-scope file changed, compare "Current state" excerpts against live code; on mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `844df3b`, 2026-06-30
- **Issue**: (to be created — non-security)

## Why this matters

The transactional outbox's central invariant is: **the event row exists iff the
mutating transaction commits.** `emitDomainEvent(input, executor)` accepts a
`DbExecutor` (`typeof db | PgTransaction`) and inserts via that executor — so when
called with `tx`, the event commits/rolls back with the wrapping transaction. No
test today threads the `executor` param or asserts commit/rollback coupling. This
is the exact characterization gap that would catch the audit-`executor: tx` drift
(plan 002) and the finance post-commit emit (plan 011). Landing this characterization
first makes those refactors verifiable.

## Current state

- `src/lib/integrations/outbox.ts` — `emitDomainEvent(input, executor)` at ~line 152;
  the `executor` param defaults to `db` and is used to `INSERT` into `domain_events`.
- `src/lib/integrations/outbox.test.ts:1-79` — only 2 unit tests; both mock `db.insert`
  directly and never exercise `executor`. The current tests call
  `emitDomainEvent({ type, entityType, entityId, actorAdminId, payload })` with no
  second argument (lines ~26, ~61).
- `src/lib/activities/service.test.ts` — mocks the outbox module entirely
  (`vi.mock('@/lib/integrations/outbox', ...)`) so it cannot characterize the tx coupling.
- Repo test conventions: Vitest + `vi.hoisted()` for mock refs referenced in
  `vi.mock()` (see `src/lib/activities/service.test.ts:7-34` — `txMock: Symbol('tx')`
  sentinel is the established pattern for asserting executor identity). Integration
  tests live in `*.integration.test.ts`, gated by `.env.test.local` (graceful skip if
  absent — see `vitest.integration.config.ts` and `src/lib/juridico/service.integration.test.ts`).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Unit tests (focused) | `npx vitest run src/lib/integrations/outbox.test.ts` | all pass |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Integration (needs PG) | `npx vitest run --config vitest.integration.config.ts src/lib/integrations/outbox.integration.test.ts` | skips gracefully if no `.env.test.local`; all pass otherwise |

## Scope

**In scope**:
- `src/lib/integrations/outbox.test.ts` (extend — unit-level tx-identity assertions)
- `src/lib/integrations/outbox.integration.test.ts` (create — real-PG rollback assertion)

**Out of scope**:
- `src/lib/integrations/outbox.ts` (no source change — characterization only)
- `src/lib/activities/service.test.ts`, `src/lib/finance/service.test.ts` — leave as-is
- Any change to `emitDomainEvent` signature or behavior

## Git workflow

- Branch: `advisor/001-outbox-atomicity-test`
- Commit style: conventional commits — `test(outbox): characterize executor param atomicity`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add unit assertions for `executor` identity

Extend `outbox.test.ts` with a test that passes a sentinel executor and asserts
`emitDomainEvent` calls `executor.insert` (not `db.insert`).

**IMPORTANT — the sentinel must mirror the Drizzle call chain.** `emitDomainEvent`
(outbox.ts:160-171) calls `executor.insert(domainEvents).values({...}).returning()`.
So the sentinel needs the chainable shape `insert → {values} → {returning} → Promise`,
exactly like the existing `insertChain` mock at `outbox.test.ts:5-22`. A bare
`insert: vi.fn().mockResolvedValue([...])` is **wrong** — `.insert(x)` would return a
Promise, then `.values(y)` throws TypeError before the assertion runs. Mirror the
existing chain.

```ts
const { txSentinel } = vi.hoisted(() => ({
  txSentinel: {
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn(),
  },
}));

// in the existing beforeEach, add:
txSentinel.insert.mockReturnValue({ values: txSentinel.values });
txSentinel.values.mockReturnValue({ returning: txSentinel.returning });
txSentinel.returning.mockResolvedValue([{ id: 999 }]);

it('uses the passed executor (tx) to insert, not the default db', async () => {
  await emitDomainEvent(
    {
      type: 'legal_consultation.created',
      entityType: 'legal_consultation',
      entityId: 1,
      actorAdminId: 1,
      payload: {
        internalNumber: 'JUR-2026-010',
        status: 'aberta',
        associateId: null,
        slaDueDate: new Date('2026-05-20T12:00:00.000Z').toISOString(),
        title: 'Consulta',
        links: { app: '/app/juridico/consultas/1' },
      },
    },
    txSentinel,
  );
  expect(txSentinel.insert).toHaveBeenCalled();
  expect(insertChain.insert).not.toHaveBeenCalled(); // db.insert NOT used when tx passed
});
```

The payload above is a COMPLETE valid shape for `legal_consultation.created`, copied from
the existing passing test at `outbox.test.ts:25-41`. The schema (the
`'legal_consultation.created'` entry in `payloadSchemaByEventType` in `outbox.ts`) is
`.strict()` and requires: `internalNumber`, `status`, `slaDueDate` (ISO datetime string),
`title`, `links` (`{ app: string }`), with `associateId` nullable-optional. Do NOT drop a
required field or add an extra field — `.parse()` throws ZodError.

Also add a test asserting the default (`db`) path is used when `executor` is omitted
(i.e. `insertChain.insert` IS called). Note: existing test #1 already exercises the
default path; the new test should make the "default = db" assertion explicit and
self-contained.

**Verify**: `npx vitest run src/lib/integrations/outbox.test.ts` → all pass (existing 2 + new 2).

### Step 2: Add an integration test asserting rollback discards the event row

Create `src/lib/integrations/outbox.integration.test.ts`. Import `db`, `domainEvents`
(`@/lib/db` and `@/lib/db/schema/integrations`), `emitDomainEvent`
(`@/lib/integrations/outbox`), `eq` from `drizzle-orm`, and `existsSync`/`resolve` from
`node:fs`/`node:path`.

**IMPORTANT — in-file graceful skip (do NOT rely on `juridico`'s pattern).** The
`juridico/service.integration.test.ts` file has NO in-file skip; its graceful skip is
implemented at the **npm-script level** (`package.json` `test:integration` checks
`fs.existsSync('.env.test.local')` and exits 0 before invoking vitest). The plan's
verification command `npx vitest run --config vitest.integration.config.ts …` **bypasses**
that npm guard. So an in-file skip guard is REQUIRED here, else the test errors
(connection refused) instead of skipping when `.env.test.local` is absent. Use Vitest's
`describe.skipIf`:

```ts
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { domainEvents } from '@/lib/db/schema/integrations';
import { emitDomainEvent } from '@/lib/integrations/outbox';

const hasTestEnv = existsSync(resolve(process.cwd(), '.env.test.local'));

describe.skipIf(!hasTestEnv)('emitDomainEvent integration (real PG)', () => {
  const TEST_ENTITY_ID = 900000001;
  const validLegalConsultationCreatedPayload = {
    internalNumber: 'JUR-TEST-900000001',
    status: 'aberta',
    associateId: null,
    slaDueDate: new Date('2026-05-20T12:00:00.000Z').toISOString(),
    title: 'Consulta de caracterizacao',
    links: { app: `/app/juridico/consultas/${TEST_ENTITY_ID}` },
  };

  it('rolls back the domain_events insert when the wrapping tx rolls back', async () => {
    await expect(
      db.transaction(async (tx) => {
        await emitDomainEvent(
          { type: 'legal_consultation.created', entityType: 'legal_consultation', entityId: TEST_ENTITY_ID, actorAdminId: null, payload: validLegalConsultationCreatedPayload },
          tx,
        );
        throw new Error('force rollback');
      }),
    ).rejects.toThrow('force rollback');
    const rows = await db.select({ id: domainEvents.id })
      .from(domainEvents)
      .where(eq(domainEvents.entityId, TEST_ENTITY_ID));
    expect(rows).toHaveLength(0);
  });

  it('persists the domain_events insert when the wrapping tx commits', async () => {
    await db.transaction(async (tx) => {
      await emitDomainEvent(
        { type: 'legal_consultation.created', entityType: 'legal_consultation', entityId: TEST_ENTITY_ID, actorAdminId: null, payload: validLegalConsultationCreatedPayload },
        tx,
      );
    });
    const rows = await db.select({ id: domainEvents.id })
      .from(domainEvents)
      .where(eq(domainEvents.entityId, TEST_ENTITY_ID));
    expect(rows).toHaveLength(1);
    await db.delete(domainEvents).where(eq(domainEvents.entityId, TEST_ENTITY_ID));
  });
});
```

`actorAdminId: null` is type- and schema-valid: `domainEvents.actor_admin_id` has
`.references(...)` with no `.notNull()`, and `EmitDomainEventInput.actorAdminId: number | null`
(verify against `src/lib/db/schema/integrations.ts` and `outbox.ts`).

**Verify**: `npx vitest run --config vitest.integration.config.ts src/lib/integrations/outbox.integration.test.ts`
→ skips gracefully (0 tests run) if `.env.test.local` absent; both tests pass otherwise.

> **Note on `actorAdminId: null`**: confirm against `domainEvents` schema in
> `src/lib/db/schema/integrations.ts` that `actor_admin_id` is nullable. If it is
> `notNull`, the commit variant will FK/violate — in that case use a real seeded
> admin id (the seed base from `npm run db:seed` creates an admin) instead of null.
> The unit test in Step 1 may keep `actorAdminId: 1` because `db` is mocked there.

## Test plan

- New unit tests in `outbox.test.ts`: (a) `executor === tx` → `tx.insert` called;
  (b) `executor` omitted → `db.insert` called.
- New integration tests in `outbox.integration.test.ts`: (a) rollback discards event;
  (b) commit persists event.
- Pattern for integration skip: `src/lib/juridico/service.integration.test.ts`.
- Verification: `npx vitest run src/lib/integrations/outbox.test.ts` + the integration file → all pass.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/lib/integrations/outbox.test.ts` passes (4 tests)
- [ ] `outbox.integration.test.ts` exists and passes (or skips gracefully when `.env.test.local` absent)
- [ ] `npm run lint` exits 0
- [ ] No source change to `outbox.ts` (`git diff src/lib/integrations/outbox.ts` empty)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- `emitDomainEvent` signature in `outbox.ts` does not match `(input, executor?)` — drift; STOP.
- A valid payload for `legal_consultation.created` cannot be constructed from the existing
  `payloadSchemaByEventType` (the schema is `.strict()`) — STOP and report which field is missing.
  The schema is the `'legal_consultation.created'` entry in `payloadSchemaByEventType` (`outbox.ts`);
  a known-valid payload exists at `outbox.test.ts:25-41` — copy that shape.
- The integration test cannot connect to PG even with `.env.test.local` present — STOP; do not weaken the test to a mock.

## Maintenance notes

- This is a characterization test — it must keep passing unchanged when plans 002 and 011 land.
  If a refactor breaks it, the refactor is wrong, not the test.
- Reviewer: confirm the integration test actually runs against a real PG (check `.env.test.local`
  exists in CI or the test skips) — a silently-skipped integration test is a false green.
- **Drift vs uncommitted work (recorded after a BLOCK):** the original draft of this plan used
  `activity.created` as the example event type. That event type exists only as **uncommitted**
  work in the main working tree (ADR 018 / `drizzle/postgres/0028_activity_domain_events.sql` /
  `src/lib/activities/domain-events.ts`) — it is NOT in commit `844df3b`. Worktrees are created
  from the clean commit, so an executor in isolation could not see `activity.created` and
  correctly STOPPED. The plan now uses `legal_consultation.created`, which is stable in commit
  `844df3b` (existing payload at `outbox.test.ts:25-41`). Lesson: plan examples must reference
  symbols that exist in the base commit, not uncommitted working-tree changes — or the plan
  must declare an explicit dependency on the commit/PR that lands those changes.