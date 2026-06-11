# Plan 002: Mandate schema validation in defineServerAction

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 95e67aa..HEAD -- src/lib/server-actions/define-form-action.ts src/app/app/atividades/actions.ts`

## Status

**BLOCKED**: Tornar o `schema` obrigatório em `defineServerAction` quebra a checagem de tipos em mais de 20 arquivos fora do escopo original (ex: `mensalidades`, `oficios`, `privacidade`, `search`, etc). Isso causa uma explosão de escopo. O plano precisará ser reescrito como uma migração incremental (ex: introduzir um `defineStrictServerAction` ou migrar os arquivos um a um).

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `95e67aa`, 2026-06-10
- **Issue**: https://github.com/prof-ramos/intranet/issues/157

## Why this matters

`defineServerAction` currently makes `schema` optional. Without runtime validation at the API boundary, malicious or malformed payloads can bypass TypeScript types, causing 500 crashes or polluting the DB. Enforcing schemas blocks these vectors.

## Current state

- `src/lib/server-actions/define-form-action.ts` — Lines 128-135 make `schema` optional.
- `src/app/app/atividades/actions.ts` — Actions like `createQuickActivityAction` omit `schema`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |

## Scope

**In scope**:
- `src/lib/server-actions/define-form-action.ts`
- `src/app/app/atividades/actions.ts`

**Out of scope**:
- Unrelated action files (fix them in follow-ups if discovered).

## Git workflow

- Branch: `advisor/002-server-actions-schema`
- Message style: `fix(security): enforce schema validation in defineServerAction`

## Steps

### Step 1: Make schema mandatory

In `src/lib/server-actions/define-form-action.ts` line 130, change:
`schema?: ZodType<TInput>;`
to
`schema: ZodType<TInput>;`

And adjust the logic inside `defineServerAction` to remove the `if (options.schema)` check, always parsing the input.

**Verify**: `npm run typecheck` → will fail (expected), showing where schemas are missing.

### Step 2: Add missing schemas to atividades

In `src/app/app/atividades/actions.ts`, add a `schema` using Zod for actions that are now throwing type errors (e.g. `createQuickActivityAction`). Import `z` from `zod` and define the required object shape.

**Verify**: `npm run typecheck` → exit 0

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `defineServerAction` requires a schema parameter.
- [ ] No files outside the in-scope list are modified (`git status`)

## STOP conditions

- If adding schemas to `actions.ts` breaks UI integrations that depend on malformed data.
