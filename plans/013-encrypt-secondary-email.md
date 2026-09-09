# Plan 013: Encrypt `secondaryEmail` with the same ciphertext + blind-index triple as `primaryEmail`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/associates/pii-mapping.ts src/lib/db/schema/associates.ts src/lib/associates/service.ts src/lib/associates/lgpd.ts src/lib/reports/queries.ts src/lib/db/schema.integration.test.ts drizzle/postgres`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/478

## Why this matters

`primaryEmail` is written through `buildPiiPatch` (ciphertext + `primary_email_hash`, plaintext column nulled). `secondaryEmail` is still a plaintext `text` column (`associates.secondary_email`) assigned in `updateAssociateData` / create (`service.ts:426-428,784`). `src/lib/associates/lgpd.ts` already lists `secondaryEmail` as sensitive. CLAUDE.md lists email as a protected field. Same LGPD class, weaker control: backups, `SELECT *`, and test clones see the alternate mailbox in the clear.

Authenticated staff may still *see* decrypted values in the app (product rule: no role mask). This plan is at-rest encryption + blind index, matching CPF/SIAPE/primary email.

## Current state

- `src/lib/associates/pii-mapping.ts:60-87` — `PII_FIELDS` has cpf, siape, primaryEmail, phone, whatsapp, address, rg. No secondaryEmail.
- `src/lib/db/schema/associates.ts:73` — `secondaryEmail: text('secondary_email')`.
- Unique indexes exist for `primaryEmail` / `primaryEmailHash` (`associates.ts:121-124`), not for secondary.
- `buildPiiPatch` F-008: blank → clear hash (never hash `''`). Copy that exactly.
- Reports: `queries.ts` decrypts `primaryEmail` via `shouldDecryptPii`; `secondaryEmail` is mapped from the plaintext column today (`queries.ts` around the `secondaryEmail: row.secondaryEmail` field). After this plan, decrypt like primary when selected.

**Conventions**

- Triple-column PII: `foo`, `fooCiphertext`, `fooHash` (see `primaryEmail` in the same schema file).
- Unique hash: PostgreSQL unique allows multiple NULL. Add `uniqueIndex('idx_associates_secondary_email_hash').on(table.secondaryEmailHash)` like primary.
- Do **not** keep writing plaintext after the patch. `buildPiiPatch` sets `plaintextCol` to null.
- Migration naming: `drizzle/postgres/0036_secondary_email_pii.sql` (next after `0035_mailing_campaigns.sql`). Update `drizzle/postgres/meta/_journal.json` the way previous migrations did — prefer `npm run db:generate` if it produces a matching file; if generate wants to DROP 0034 indexes, STOP (plan 014 owns that drift).
- `schema.integration.test.ts` `expectedColumns` / `expectedIndexes` must be updated or `test:db` fails.
- Never log secondary email plaintext.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/associates/pii-mapping.ts src/lib/associates/service.test.ts src/lib/reports/queries.test.ts` | all pass |
| Schema contract | `npm run test:db` | pass if `.env.local` exists; otherwise STOP after unit+typecheck and say test:db was not run |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/associates/pii-mapping.ts` (+ tests)
- `src/lib/db/schema/associates.ts`
- `src/lib/associates/service.ts` (create/update: pass `secondaryEmail` through `buildPiiPatch`, stop assigning plaintext)
- `src/lib/associates/lgpd.ts` if decrypt mapping needs the new columns
- `src/lib/reports/queries.ts` decrypt secondary when selected
- `src/lib/db/schema.integration.test.ts` expected columns/indexes
- `drizzle/postgres/0036_*.sql` + journal
- Associate form helpers/tests if they map secondary email
- `scripts/migrate-legacy-transforms.ts` only if it writes `secondaryEmail` as plaintext today (grep; include if yes)

**Out of scope**:
- Encrypting `fullName`, `birthDate`, `neighborhood` (legacy plaintext accepted).
- Search-by-secondary-email product feature (blind index is for uniqueness/collision, not a new UI).
- Production migrate (runbook / GHA `Migrate Production`). Executor only adds the SQL file.
- Plan 014 index declarations.

## Git workflow

- Branch: `fix/issue-<N>-encrypt-secondary-email`
- Commit: `fix(associates): criptografar secondaryEmail com hash cego`
- Do NOT push or open a PR unless instructed. Do NOT run production migrate.

## Steps

### Step 1: Schema + SQL

Add `secondaryEmailCiphertext` and `secondaryEmailHash` columns (text, nullable) next to `secondaryEmail`. Add unique index on the hash.

SQL migration: `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`; `CREATE UNIQUE INDEX` on hash (non-concurrent form for `db:migrate` / CI; mention CONCURRENTLY in a comment pointing at `docs/runbook.md` like 0034).

Do **not** backfill in the SQL file (no PII in SQL, no encrypt in Postgres). Backfill belongs in a guarded TS script **only if** you can reuse `encryptPii`/`piiBlindIndex` and the script has the same host guards as `scripts/dev-seed-safety.ts`. If that is more than ~40 lines, skip backfill in this PR: new writes go through the patch; leftover plaintext is the same class as other legacy columns until a follow-up. **Preferred:** skip backfill here; document in the PR that existing `secondary_email` plaintext remains until a later job. New writes null plaintext.

**Verify**: drizzle schema compiles; journal lists 0036.

### Step 2: `PII_FIELDS` + service

Add `{ name: 'secondaryEmail', plaintextCol: 'secondaryEmail', ciphertextCol: 'secondaryEmailCiphertext', hashCol: 'secondaryEmailHash' }`.

Create/update: include `secondaryEmail: emptyToNull(input.secondaryEmail)` in the object passed to `buildPiiPatch`. Remove `secondaryEmail: input.secondaryEmail` from the raw `values` object so it is not written twice.

Map unique-violation `23505` on the new index to a Portuguese `ValidationError` like primary email (`Já existe um oficial cadastrado com este e-mail.` is OK for both, or specify “e-mail secundário”).

**Verify**: unit tests in `pii-mapping` / `service.test.ts`: blank secondary → hash null; non-blank → ciphertext set, plaintext null.

### Step 3: Reports + contract test

When `selectedKeys` includes `secondaryEmail`, decrypt via `decryptPiiField(ciphertext, plaintextFallback)`. Add `'secondaryEmail'` to `PII_DECRYPT_FIELDS` if you keep that list.

Update `expectedColumns` / `expectedIndexes` in `schema.integration.test.ts` (grep `secondary_email` and `idx_associates_primary_email_hash` for the pattern).

## Test plan

- `pii-mapping` tests: secondaryEmail blank/clear/encrypt. Pattern: existing field cases.
- `service.test.ts`: create with secondary email does not persist plaintext (mock repo or inspect patch).
- Reports: decrypt called for `secondaryEmail` only when selected (depends on plan 002 if that landed; if not, pass explicit `selectedKeys: ['secondaryEmail']`).
- `test:db` when local env exists.

## Done criteria

- [ ] `PII_FIELDS` includes `secondaryEmail`
- [ ] Create/update no longer assign plaintext `secondaryEmail` except via `buildPiiPatch` (which nulls it)
- [ ] Unique index on `secondary_email_hash` in schema + SQL
- [ ] `schema.integration.test.ts` expects the new columns/index
- [ ] Focused vitest + lint + typecheck pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- `db:generate` wants to DROP 0034/0029 indexes. Do not apply that generate output. Hand-write 0036 instead.
- You find duplicate non-null secondary emails in a local real clone. Do not invent a merge. STOP (no backfill; unique index would fail on migrate if you backfill). For empty/synthetic DBs, proceed.
- Production migrate is requested. Refuse; this plan only adds files.

## Maintenance notes

- Reviewer: F-008 blank handling must apply (never hash `''`).
- Follow-up: one-shot backfill of leftover plaintext `secondary_email` via guarded script, then a CHECK that plaintext is null when ciphertext is set (rg already has similar CHECKs).
- Search UI stays name/cpf/siape (`searchBy`); do not add secondary-email search without a product decision.
