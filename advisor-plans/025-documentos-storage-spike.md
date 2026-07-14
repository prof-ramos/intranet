# Plan 025 (direction): Documentos module storage backend spike

> **REJECTED 2026-07-14 @ `e0be30d`**: Do not execute this plan. ADR 019
> (`docs/adr/019-privacidade-data-export.md:23-29`) records this storage spike as
> obsolete, keeps object storage outside day 1, and says reopening the work
> requires a new architecture/product decision.

> **Executor instructions**: ~~This is a **spike/design plan**, not a build plan. Produce
> a decision document, not a feature. STOP → report.~~
>
> ~~**Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/storage/index.ts src/app/app/secretaria/documentos`
> If changed, compare against live code; on mismatch, STOP.~~

> Todo o conteúdo abaixo é **histórico/arquivado**. A retomada deste trabalho
> exige uma nova decisão de arquitetura/produto (ver ADR 019).

## Status

- **Plan status**: REJECTED — obsolete per ADR 019
- **Priority**: P3 | **Effort**: M (spike) | **Risk**: LOW | **Depends on**: none
- **Category**: direction | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#263](https://github.com/prof-ramos/intranet/issues/263)

## Current state

- `src/lib/storage/index.ts:54-56` — `storageDisabled()` throw-stub.
- `src/app/app/secretaria/documentos/` — module UI + actions (wired, calls storage).
- Issue #116 (referenced in prior context) — DMS spike still open.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Read storage stub | `cat src/lib/storage/index.ts` | (inspect) |
| Read module | `ls src/app/app/secretaria/documentos` | (inspect) |

## Scope

**In scope**: a decision document at `docs/adr/0XX-documentos-storage.md` evaluating
backends and recommending one.
**Out of scope**: implementing the chosen backend (separate follow-up plan), migrating
data (none exists yet), changing the UI.

## Steps

### Step 1: Enumerate candidate backends

Evaluate, against this codebase's constraints (LGPD, PII already encrypted at app
layer, Vercel deploy, Neon PG):
- **Vercel Blob (private)** — simplest, Vercel-native, private blobs, good for a
  Vercel-deployed app.
- **Cloudflare R2** — S3-compatible, egress-free, good if the team already uses CF.
- **AWS S3** — standard, mature SDK, but more ops surface.
- **Neon PG large objects / bytea** — avoid (bloats PG, bad for files > a few MB).

### Step 2: Write the ADR

For each candidate: pros, cons, LGPD fit, retention story, cost model, ops burden.
Recommend one. Record the decision, drivers, alternatives, consequences, follow-ups.
Match the `docs/adr/` format (see existing ADRs).

**Verify**: `ls docs/adr/0XX-documentos-storage.md` exists and renders as markdown.

### Step 3: Open the follow-up wiring plan

After the ADR is accepted, open a separate build plan for wiring `uploadFile`/`getFile`
to the chosen backend. Do not write that plan here.

## Test plan

- No tests; this is a spike producing a doc.
- Verification: the ADR renders and the decision is internally consistent.

## Done criteria

- [ ] `docs/adr/0XX-documentos-storage.md` exists
- [ ] ADR evaluates Vercel Blob, R2, S3 (and excludes PG bytea with rationale)
- [ ] ADR recommends one backend with drivers/consequences/follow-ups
- [ ] `advisor-plans/README.md` status row updated, follow-up wiring plan referenced

## STOP conditions

- The team can't decide retention policy (how long documentos are kept, who can purge) —
  STOP; surface the policy question to the maintainer; the ADR records the assumption.
- A candidate requires infra the project doesn't have (e.g., S3 needs an AWS account) —
  STOP; note the infra prerequisite in the ADR and recommend the no-new-infra option.

## Maintenance notes

- Reviewer: this is a decision doc; do not approve wiring until the ADR is accepted.
- The wiring follow-up must preserve the app-layer PII encryption boundary (storage
  holds ciphertext, not plaintext) — note in the ADR.
