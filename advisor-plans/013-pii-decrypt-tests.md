# Plan 013: PII decrypt fallback tests for reports

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 874ed21..HEAD -- src/lib/reports/queries.ts src/lib/reports/queries.test.ts`
> If changed, compare against live code; on mismatch, STOP. (Re-stamped @874ed21: #271 landed —
> `getAssociatesForReport` now takes a `limit` param and bounds the query with `limit + 1` + a
> truncation throw; `queries.test.ts` grew from 7 → 9 tests, adding `applies a bounded limit on
> the query` (@108) and `throws and logs a PII-free warning when result exceeds the cap` (@114).
> The decrypt-fallback path is STILL untested — those 2 new tests cover pagination, not PII
> decrypt. This plan's scope is unchanged and complementary: add decrypt-fallback tests.)

## Status

- **Priority**: P2 | **Effort**: S | **Risk**: LOW | **Depends on**: none
- **Category**: tests | **Planned at**: `844df3b`, 2026-06-30 (re-stamped @`874ed21` after #271 landed — test count + line refs refreshed, scope unchanged) | **Issue**: [#251](https://github.com/prof-ramos/intranet/issues/251)

## Why this matters

`getAssociatesForReport` calls `decryptPiiField(row.cpfCiphertext ?? null, row.cpf ?? null)`
for 6+ PII fields. The ciphertext-fallback-to-plaintext branch is the LGPD-sensitive
path: a regression (wrong fallback order, dropped `?? null`, swapped args) silently
leaks or drops PII in CSV exports. The existing 7 tests in `queries.test.ts` mock the
repository and never exercise `decryptPiiField` — the least-tested path is the one
that must not break.

## Current state (verified at commit `874ed21`)

- `src/lib/reports/queries.ts:188-204` — the decrypt-fallback mapping in `getAssociatesForReport`'s
  row-to-DTO mapper: `cpf: decryptPiiField(row.cpfCiphertext ?? null, row.cpf ?? null)` and the same
  shape for `rg`, `primaryEmail`, `phone`, `whatsapp`, `address`, `siape` (6+ fields). `decryptPiiField`
  is imported at `queries.ts:4` (`import { decryptPiiField } from '@/lib/crypto/pii'`).
- `src/lib/crypto/pii.ts:33-40` — `decryptPiiField(ciphertext, plaintext)`:
  ```ts
  export function decryptPiiField(ciphertext: string | null, plaintext: string | null): string | null {
    if (ciphertext) { return decryptPii(ciphertext); }   // ciphertext WINS (truthy → decrypt)
    return plaintext ?? null;                              // else plaintext, else null
  }
  ```
  **Precedence: ciphertext wins.** It is NOT pure — `decryptPii` calls `getMasterKey()` which reads
  env (`SESSION_SECRET`/PII keys), so the real decrypt path is unavailable in the unit test without
  env. **Mock at the `decryptPiiField` boundary** (see Step 1) — do NOT call the real impl.
- `src/lib/reports/queries.test.ts` — uses `vi.hoisted()` with `dbMock` (chainable `selectChain`:
  `from`/`where`/`orderBy`/`limit`/`then`), `MOCK_ASSOCIATE`, `loggerMock`; `vi.mock('@/lib/db', ...)`
  and `vi.mock('@/lib/logger', ...)`. 9 tests in `describe('getAssociatesForReport')` (7 original + 2
  from #271). `MOCK_ASSOCIATE` has plaintext fields (`cpf: '12345678901'`, `phone`, `siape`, etc.) but
  NO `*Ciphertext` fields. grep `decrypt|ciphertext` → 0 hits. The decrypt path is untested.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Focused tests | `npx vitest run src/lib/reports/queries.test.ts` | pass |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**: `src/lib/reports/queries.test.ts` (extend).
**Out of scope**: `src/lib/reports/queries.ts`, `src/lib/crypto/*` (no source change).

## Steps

### Step 1: Mock `decryptPiiField` and test the four row shapes

Add a mock for the PII crypto boundary so the test controls the decrypt outcome without
needing env keys. At the top of the file, alongside the existing `vi.mock('@/lib/db', ...)`
and `vi.mock('@/lib/logger', ...)`, add (using `vi.hoisted` so the spy is available to the
factory):
```ts
const { decryptPiiFieldMock } = vi.hoisted(() => ({
  decryptPiiFieldMock: vi.fn(
    (ciphertext: string | null, plaintext: string | null): string | null =>
      ciphertext ? `DEC:${ciphertext}` : (plaintext ?? null),
  ),
}));
vi.mock('@/lib/crypto/pii', () => ({ decryptPiiField: decryptPiiFieldMock }));
```
The mock mirrors the real precedence (ciphertext wins) AND returns a deterministic,
PII-free sentinel (`DEC:<ct>` or the plaintext) so the test can assert both call args
and DTO mapping without touching real keys.

Add a new `describe('getAssociatesForReport PII decrypt fallback')` block (separate from
the existing 9 tests so they stay undisturbed). For each of the 4 row shapes, set
`dbMock.setSelectResult([row])`, call `getAssociatesForReport()`, and assert:

- (a) **only ciphertext** — row has `cpfCiphertext: 'enc:cpf'`, `cpf: null` →
  `decryptPiiFieldMock` called with `('enc:cpf', null)`; `results[0].cpf === 'DEC:enc:cpf'`.
- (b) **only plaintext** — row has `cpfCiphertext: null`, `cpf: '12345678901'` →
  called with `(null, '12345678901')`; `results[0].cpf === '12345678901'`.
- (c) **both** — row has `cpfCiphertext: 'enc:cpf'`, `cpf: 'PLAIN'` →
  called with `('enc:cpf', 'PLAIN')`; `results[0].cpf === 'DEC:enc:cpf'` (ciphertext wins).
- (d) **neither** — row has `cpfCiphertext: null`, `cpf: null` →
  called with `(null, null)`; `results[0].cpf === null`.

Use `expect(decryptPiiFieldMock).toHaveBeenCalledWith('enc:cpf', null)` for the arg order
(ciphertext FIRST, plaintext SECOND — a swapped-args regression fails this). Pick `cpf` as
the exemplar field; optionally repeat for one more field (e.g. `primaryEmail`) to confirm
the wiring isn't cpf-specific. Build rows as `{ ...MOCK_ASSOCIATE, cpfCiphertext, cpf }`
(only override the fields under test).

Reset the mock in the existing `beforeEach` (`vi.clearAllMocks()` already does this — confirm
`decryptPiiFieldMock` is cleared too; if `vi.clearAllMocks()` doesn't clear hoisted mocks,
add `decryptPiiFieldMock.mockClear()` to `beforeEach`).

**Verify**: `npx vitest run src/lib/reports/queries.test.ts` → all pass (existing 9 + new 4+).

### Step 2: Assert no PII leakage in error paths

Make `decryptPiiFieldMock` throw for one call
(`decryptPiiFieldMock.mockImplementationOnce(() => { throw new Error('decrypt-failed') })`)
with a row whose `cpfCiphertext` is a sentinel like `'enc:SECRET'`. Call
`getAssociatesForReport()` and assert: the error propagates (the mapper does not swallow
it into the DTO) AND no `loggerMock` call's stringified payload contains the ciphertext
sentinel `'enc:SECRET'` or the plaintext — grep `JSON.stringify(loggerMock.warn.mock.calls)`,
`.error.mock.calls`, `.info.mock.calls` for the sentinel and expect no match. This guards
against a future catch-and-log that leaks ciphertext into logs.

**Verify**: `npx vitest run src/lib/reports/queries.test.ts` → pass; `npm run lint` → exit 0.

## Test plan

- New tests in `queries.test.ts`: 4 row shapes + error path.
- Pattern: existing `queries.test.ts` mock structure.
- Verification: `npx vitest run src/lib/reports/queries.test.ts` → all pass.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npx vitest run src/lib/reports/queries.test.ts` passes with 4-shape + error tests
- [ ] No source change to `queries.ts` (`git diff src/lib/reports/queries.ts` empty)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- `decryptPiiField` precedence (ciphertext vs plaintext) is opposite of what the test
  asserts — STOP; confirm the real precedence in `src/lib/crypto/` and assert that.
- The function is not pure (has side effects / needs keys) — STOP; report and mock at
  the `decryptPiiField` boundary instead of testing through it.

## Maintenance notes

- Reviewer: confirm the test covers the ciphertext-wins vs plaintext-wins precedence
  exactly as the code does — a test that asserts the wrong precedence is worse than none.