# Plan 002: Reject empty CSV field lists instead of decrypting every PII column

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/reports/export-filters.ts src/lib/reports/export-filters.test.ts src/lib/reports/queries.ts src/lib/reports/queries.test.ts src/lib/reports/csv.ts src/lib/reports/service.ts src/app/app/associados/relatorio/download/route.ts src/app/app/associados/relatorio/RelatorioForm.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/467

## Why this matters

The report form refuses to submit with zero fields (`RelatorioForm.tsx` `selected.size === 0`). The download route and CSV generator do the opposite: empty `fields` means “every column”, and `shouldDecryptPii` decrypts all seven PII ciphertexts when `selectedKeys` is missing or empty. An authenticated admin/diretoria GET to `/app/associados/relatorio/download` without `fields` therefore decrypts up to 5 000 rows × 7 fields and ships a full CSV. Authenticated staff already have operational PII visibility (product rule); this is still a contract bug and an avoidable decrypt spike. Align the server with the UI: no fields → 400, no decrypt-all.

## Current state

- `src/lib/reports/export-filters.ts:89-97` — `selectedKeys` is `getAll('fields')` filtered by allowlist; empty is valid.
- `src/lib/reports/export-filters.test.ts:53-57` — asserts empty params → `selectedKeys: []`.
- `src/lib/reports/queries.ts:188-191` — empty/missing keys decrypt every PII field.
- `src/lib/reports/csv.ts:136-138` — empty `selectedKeys` uses `ALL_FIELDS`.
- `src/lib/reports/service.ts:24-30` — forwards `selectedKeys` into both query and CSV.
- `src/app/app/associados/relatorio/download/route.ts:36-41` — no empty-list check after parse.
- `src/app/app/associados/relatorio/RelatorioForm.tsx:272-275` — client `preventDefault` only.

Excerpt (`queries.ts`):

```ts
function shouldDecryptPii(field: PiiDecryptField, selectedKeys?: string[]): boolean {
  if (!selectedKeys || selectedKeys.length === 0) return true;
  return selectedKeys.includes(field);
}
```

Excerpt (`csv.ts`):

```ts
const selectedFields =
  selectedKeys.length > 0 ? ALL_FIELDS.filter((f) => selectedKeys.includes(f.key)) : ALL_FIELDS;
```

**Conventions**

- `requireReportAccess()` already limits download to `admin`/`diretoria` (`src/lib/reports/policy.ts`). Keep that.
- Exportable keys live in `ASSOCIATE_EXPORT_FIELDS` (`src/lib/associates/lgpd.ts`). Do not invent new keys.
- User-facing error Portuguese, no PII in logs (`toSafeErrorLog` already used on the route).
- Wave C already skips decrypt when keys are present; this plan only changes the empty/default path.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/reports/export-filters.test.ts src/lib/reports/queries.test.ts src/lib/reports/csv.ts src/app/app/associados/relatorio/download/route.ts` | all pass (include any new `*.test.ts` you add) |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/reports/export-filters.ts`
- `src/lib/reports/export-filters.test.ts`
- `src/lib/reports/queries.ts`
- `src/lib/reports/queries.test.ts`
- `src/lib/reports/csv.ts` (and `csv.test.ts` if it exists; create cases there or in queries tests)
- `src/lib/reports/service.ts` (only if you throw there instead of the route)
- `src/app/app/associados/relatorio/download/route.ts`
- `src/app/app/associados/relatorio/download/route.test.ts` (create if missing)

**Out of scope**:
- Changing `REPORT_DEFAULT_LIMIT` (5000).
- Narrowing the SQL `select(reportColumns)` projection (nice-to-have; do it only if it stays a few lines and tests still pass — otherwise leave for later).
- RelatorioForm UI (already blocks empty submit).
- Finance/email-triage V2.

## Git workflow

- Branch: `fix/issue-<N>-reject-empty-report-fields`
- Commit: `fix(relatorio): recusar export CSV sem campos selecionados`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Fail closed at the download boundary

After `parseReportExportParams`, if `selectedKeys.length === 0` return HTTP 400 with body `Selecione ao menos um campo para exportar.` (plain text, same style as the existing 429/500 responses). Do not call `generateReport`.

**Verify**: a unit test on the route (mock `requireReportAccess` + `generateReport`) or a direct test of a small helper. If the route is hard to unit-test, throw a dedicated error from `generateReport` when `selectedKeys.length === 0` and map it to 400 in the route `catch` **only if** you distinguish it from the truncation error (do not turn “relatório excede o limite” into 400).

Preferred: explicit `if (selectedKeys.length === 0)` in the route before `generateReport`.

### Step 2: Stop treating empty keys as decrypt-all / all CSV columns

- `shouldDecryptPii`: return `false` when `!selectedKeys || selectedKeys.length === 0`. Decrypt only when the field is in the list.
- `generateCsv`: if `selectedKeys.length === 0`, either throw or emit only the header-less empty document — **must not** expand to `ALL_FIELDS`. Throwing is better so a missed route check cannot dump PII.

**Verify**: `rg -n "selectedKeys.length === 0" src/lib/reports/csv.ts src/lib/reports/queries.ts` shows the new fail-closed branches.

### Step 3: Update tests that documented the old contract

- `export-filters.test.ts`: empty params may still parse as `selectedKeys: []` (parser stays dumb). Add a comment that the download route rejects that list. Do not change parser semantics unless you also update every caller.
- `queries.test.ts`: add a case `getAssociatesForReport(filters, limit, ['fullName'])` that expects `decryptPiiField` **not** to be called. Keep existing ciphertext-precedence tests but pass an explicit PII key list (e.g. `['cpf']`) so they still decrypt.
- CSV: assert empty `selectedKeys` does not include `cpf` / `siape` headers.

**Verify**: `npx vitest run src/lib/reports` — all pass.

## Test plan

- Pattern: `src/lib/reports/export-filters.test.ts` and `src/lib/reports/queries.test.ts` (hoisted `decryptPiiFieldMock`).
- New cases listed in Step 3.
- If `download/route.test.ts` does not exist, create it next to the route, mock `requireReportAccess` to `{ userId: 1 }` and `generateReport` to throw if called on empty keys.

Verification: `npx vitest run src/lib/reports src/app/app/associados/relatorio` → pass.

## Done criteria

- [ ] Download with zero `fields` returns 400 and does not call decrypt
- [ ] `shouldDecryptPii` is false for empty/missing keys
- [ ] `generateCsv([], [])` does not emit all associate columns
- [ ] Existing decrypt precedence tests still pass with an explicit PII key
- [ ] `npm run lint` and `npm run typecheck` exit 0
- [ ] No files outside scope
- [ ] `plans/README.md` status row updated

## STOP conditions

- `RelatorioForm` or the route already rejects empty fields and `shouldDecryptPii` no longer defaults to true — mark REJECTED.
- Changing `generateCsv` empty behaviour breaks an intentional “export all” documented in `PAGES.md` / product copy. STOP and report rather than silently removing a documented operator shortcut. (The form UI currently forbids it; if you find a documented shortcut, ask.)

## Maintenance notes

- Reviewer: empty `fields` must not be a synonym for “all” anywhere in `src/lib/reports`.
- If a future “select all fields” control is added, it must send the explicit key list, not omit `fields`.
