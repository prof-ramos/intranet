# Plan 019: Replace `Record<string, unknown>` escape hatch with typed schemas

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/email-triage/analyzer.ts src/lib/events.ts src/lib/assinafy/types.ts`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P3 | **Effort**: M | **Risk**: LOW | **Depends on**: none
- **Category**: tech-debt | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#257](https://github.com/prof-ramos/intranet/issues/257)

## Why this matters

The repo is genuinely `any`-free in src (`grep ": any\b|as any\b" src/ --include="*.ts"`
excluding tests → 0), so `Record<string, unknown>` (46 non-test sites) is the de-facto
escape hatch. Gemini API responses, Assinafy webhook payloads, and notification
metadata are untyped at the boundary, forcing `as never` casts at call sites. Typing
these with Zod schemas tightens the boundary without runtime cost.

## Current state

- Cluster: `src/lib/email-triage/analyzer.ts:93-362` (11+ sites: `isRecord`, `getRecord`,
  `getString`, `getNumber`, `getRecordArray`, `buildModelInput`, `RESPONSE_JSON_SCHEMA`, `walk`).
- `src/lib/events.ts:29` — `metadata?: Record<string, unknown> | null`.
- `src/lib/assinafy/types.ts:19` — `payload: Record<string, unknown>`.
- `src/lib/assinafy/service.ts:52`, `src/lib/server-actions/define-form-action.ts:14`.
- The repo already uses Zod 4.4.3 with `.strict()` schemas in the outbox
  (`payloadSchemaByEventType`).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Tests | `npx vitest run src/lib/email-triage` | pass |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**: `src/lib/email-triage/analyzer.ts`, `src/lib/events.ts`,
`src/lib/assinafy/types.ts`, `src/lib/assinafy/service.ts` (payload typing only).
**Out of scope**: `define-form-action.ts:14` (form metadata is intentionally open), the
outbox (already typed).

## Steps

### Step 1: Type the Gemini response shape

Replace the `analyzer.ts` `Record<string, unknown>` cluster with a Zod schema for the
Gemini response (the existing `RESPONSE_JSON_SCHEMA` is the seed). Derive TS types via
`z.infer`. Keep the `getString`/`getNumber`/`getRecordArray` helpers as thin wrappers
over the parsed schema if they're still convenient, but operate on typed values.

**Verify**: `npm run typecheck` → exit 0; `npx vitest run src/lib/email-triage` → pass.

### Step 2: Type `events.ts` metadata as a discriminated union

Per event type, define a typed metadata shape (or `Record<string, unknown>` only for
the genuinely-open cases, with a comment). Prefer the typed union for the known event types.

### Step 3: Type Assinafy payload via the existing outbox Zod schema

The outbox already has `payloadSchemaByEventType`. Reuse those schemas to type the
Assinafy webhook payload instead of `Record<string, unknown>`.

**Verify**: `npm run validate:quick` → exit 0.

## Test plan

- Existing email-triage tests pass (parsing behavior unchanged).
- Add a type-level test or a runtime `parse` assertion for the new schemas.
- Verification: `npm run validate:quick` → exit 0.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` passes
- [ ] `grep -rn "Record<string, unknown>" src/lib/email-triage/analyzer.ts src/lib/assinafy/types.ts` reduced or eliminated
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- The Gemini response shape is too variable to schema (free-form model output) — STOP;
  report and keep `Record<string, unknown>` there with a comment, schema only the
  envelope.
- Typing `events.ts` metadata breaks existing consumers that read arbitrary keys —
  STOP; report and add a typed union only for new event types, leaving legacy as
  `Record<string, unknown>`.

## Maintenance notes

- Reviewer: confirm no runtime behavior changed — this is a typing-only refactor.
- The `as never` casts in `outbox.test.ts:71` should become unnecessary after the
  Assinafy payload typing; remove them if so.