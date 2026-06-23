# Plan 013: Extract mapAssociateListRow helper to eliminate 4× PII-decrypt duplication

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- src/lib/associates/repository.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpts before proceeding.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

`src/lib/associates/repository.ts` contains four identical `.map()` callbacks,
each decrypting the same four PII fields (`primaryEmail`, `siape`, `phone`,
`whatsapp`) from their `*Ciphertext` / plaintext pairs. The four sites are at
lines 117–128, 162–173, 243–254, and 293–303. Any change to which PII fields are
decrypted (e.g. adding `address` to the list view) must be applied in all four
places — and the `whatsapp` field was previously missing from some sites,
demonstrating the maintenance risk is real.

## Current state

`src/lib/associates/repository.ts` — the repeated 4-field decrypt block appears in
every `.map()` over a paginated or cursor-based associate result set:

```ts
// lines 125-128 (also identical at 170-173, 251-254, 301-304)
primaryEmail: decryptPiiField(row.primaryEmailCiphertext ?? null, row.primaryEmail ?? null),
siape:        decryptPiiField(row.siapeCiphertext ?? null,        row.siape ?? null),
phone:        decryptPiiField(row.phoneCiphertext ?? null,        row.phone ?? null),
whatsapp:     decryptPiiField(row.whatsappCiphertext ?? null,     row.whatsapp ?? null),
```

The four `.map()` sites also copy the non-PII fields (`id`, `fullName`, `assignment`,
`classPattern`, `functionalStatus`, `associationStatus`, `contributionStatus`).
The raw row type for all four sites is the result of `publicAssociateListColumns`
(defined around line 34).

`AssociateListItem` is the exported interface that each `.map()` produces (check its
definition near the top of the file to confirm the exact fields).

## Commands you will need

| Purpose       | Command                                                  | Expected on success |
|---------------|----------------------------------------------------------|---------------------|
| Typecheck     | `npm run typecheck`                                      | exit 0              |
| Test (scoped) | `npm run test -- src/lib/associates/repository.test.ts`  | all pass            |
| Lint          | `npm run lint`                                           | exit 0              |

## Scope

**In scope**:
- `src/lib/associates/repository.ts`

**Out of scope** (do NOT touch):
- Any caller of the repository functions — the return type `AssociateListItem` is
  unchanged.
- Any test files.

## Git workflow

- Branch: `advisor/013-pii-decrypt-map-helper`
- Single commit; message: `refactor(associates): extract mapAssociateListRow to deduplicate PII-decrypt logic`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Identify the raw row type

Read `src/lib/associates/repository.ts` from the top to find:
1. The `publicAssociateListColumns` constant (around line 34) — this is the Drizzle
   select projection used in all four query paths.
2. The `AssociateListItem` interface — this is the return type of the helper.

Use these to type the new function precisely.

### Step 2: Extract `mapAssociateListRow`

After the `publicAssociateListColumns` constant (and after the `AssociateListItem`
interface), add a private helper function:

```ts
type PublicAssociateRow = typeof publicAssociateListColumns extends Record<string, infer _>
  ? Awaited<ReturnType<typeof db.select<typeof publicAssociateListColumns>>>extends (infer R)[]
    ? R
    : never
  : never;
```

If the Drizzle inference above is too complex, use a simpler form: define the raw
row type as `{ id: number; fullName: string; assignment: string | null; classPattern: string | null; functionalStatus: string | null; associationStatus: string | null; contributionStatus: string | null; primaryEmailCiphertext: string | null; primaryEmail: string | null; siapeCiphertext: string | null; siape: string | null; phoneCiphertext: string | null; phone: string | null; whatsappCiphertext: string | null; whatsapp: string | null }`.

Then extract the helper:

```ts
function mapAssociateListRow(row: {
  id: number;
  fullName: string;
  assignment: string | null;
  classPattern: string | null;
  functionalStatus: string | null;
  associationStatus: string | null;
  contributionStatus: string | null;
  primaryEmailCiphertext: string | null;
  primaryEmail: string | null;
  siapeCiphertext: string | null;
  siape: string | null;
  phoneCiphertext: string | null;
  phone: string | null;
  whatsappCiphertext: string | null;
  whatsapp: string | null;
}): AssociateListItem {
  return {
    id: row.id,
    fullName: row.fullName,
    assignment: row.assignment,
    classPattern: row.classPattern,
    functionalStatus: row.functionalStatus,
    associationStatus: row.associationStatus,
    contributionStatus: row.contributionStatus,
    primaryEmail: decryptPiiField(row.primaryEmailCiphertext ?? null, row.primaryEmail ?? null),
    siape:        decryptPiiField(row.siapeCiphertext ?? null,        row.siape ?? null),
    phone:        decryptPiiField(row.phoneCiphertext ?? null,        row.phone ?? null),
    whatsapp:     decryptPiiField(row.whatsappCiphertext ?? null,     row.whatsapp ?? null),
  };
}
```

Adjust the parameter type to exactly match what Drizzle infers for
`publicAssociateListColumns` if TypeScript complains. Run `npm run typecheck` after
adding the function to confirm the type is right before proceeding.

**Verify**: `npm run typecheck` → exit 0.

### Step 3: Replace the four `.map()` callbacks

Find and replace each of the four `rows.map((row) => ({ ... }))` blocks with
`rows.map(mapAssociateListRow)`. The four locations are approximately:

- Line ~117 inside `findAssociatesPaginated` (CPF/SIAPE search path)
- Line ~162 inside `findAssociatesPaginated` (name-based search path)
- Line ~243 inside `findAssociatesPaginatedCursor` (CPF/SIAPE cursor path)
- Line ~293 inside `findAssociatesPaginatedCursor` (name-based cursor path)

Replace the entire multi-line object literal in each `.map()` with just:

```ts
rows: rows.map(mapAssociateListRow),
```

**Verify**: `npm run typecheck` → exit 0.

### Step 4: Run the test suite

**Verify**: `npm run test -- src/lib/associates/repository.test.ts` → all pass.

## Test plan

No new tests required — this is a pure refactor with identical runtime behavior.
The existing `repository.test.ts` covers the decrypt paths. If any test was testing
the inline mapping, it will continue to pass because the output shape is unchanged.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test -- src/lib/associates/repository.test.ts` passes
- [ ] `npm run lint` exits 0
- [ ] `grep -c "decryptPiiField" src/lib/associates/repository.ts` returns exactly 4 (one per field, inside `mapAssociateListRow`)
- [ ] Only `src/lib/associates/repository.ts` is modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- The four `.map()` sites in the live file have different fields (e.g. one adds
  `location` that the others don't) — do NOT merge them; report back.
- TypeScript cannot infer a common row type for `mapAssociateListRow` after attempts
  to use the Drizzle projection type — ask for guidance rather than using `any`.
- Any existing repository test fails after the refactor.

## Maintenance notes

- When adding a new PII field to the associate list view (e.g. encrypting `address`),
  add it once in `mapAssociateListRow` and update `publicAssociateListColumns` once.
- If the cursor-based pagination ever uses a different column projection from the
  offset-based pagination, the row types would diverge; at that point, keep separate
  helpers rather than forcing a union.
