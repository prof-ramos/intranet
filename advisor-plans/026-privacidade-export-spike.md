# Plan 026 (direction): Privacidade data-export spike

> **Executor instructions**: This is a **spike/design plan**, not a build plan. Produce
> a decision document, not a feature. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/app/app/privacidade/actions.ts src/lib/associates/lgpd.ts`
> If changed, compare against live code; on mismatch, STOP.

## Status

- **Priority**: P3 | **Effort**: M (spike) | **Risk**: LOW | **Depends on**: none
- **Category**: direction | **Planned at**: `844df3b`, 2026-06-30 | **Issue**: [#264](https://github.com/prof-ramos/intranet/issues/264)

## Why this matters

`requestDataDownload` (`src/app/app/privacidade/actions.ts:40-65`) only creates an
activity log + notifies an admin — it does not export anything. The LGPD "data
portability" right requires the data subject to actually receive their data. Today
the flow is manual (admin assembles the export by hand). This spike decides whether to
automate (async export + temporary signed link) or formalize the manual flow with an
SLA — both are defensible; the decision should be deliberate, not implicit.

## Current state

- `src/app/app/privacidade/actions.ts:40-65` — `requestDataDownload` (activity + notify).
- `src/lib/associates/lgpd.ts` — exportable fields, PII/PUBLIC classification, decrypt
  map (the building blocks for a real export already exist).
- `src/lib/reports/csv.ts` + `queries.ts` — CSV generation with PII decrypt (reuse
  candidate for the export payload).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Read action | `cat src/app/app/privacidade/actions.ts` | (inspect) |
| Read LGPD lib | `cat src/lib/associates/lgpd.ts` | (inspect) |

## Scope

**In scope**: a decision document at `docs/adr/0XX-privacidade-data-export.md`
evaluating automated vs manual-with-SLA.
**Out of scope**: building the export (separate follow-up plan), changing
`requestDataDownload` behavior.

## Steps

### Step 1: Enumerate options

- **Option A — Automated async export**: on request, enqueue a job that decrypts PII,
  builds a CSV/JSON (reuse `reports/csv.ts` + `lgpd.ts`), stores it under a temporary
  signed link (ties to plan 025 storage decision), and emails the link to the data
  subject. Pros: fulfills portability right directly. Cons: needs a job runner (cron /
  Vercel Queues), signed-link expiry/LGPD, PII-in-transit handling.
- **Option B — Manual with SLA**: keep `requestDataDownload` as the request signal;
  formalize an SLA (e.g., "admin delivers export within N days"); add a status field
  (`requested` → `in_progress` → `delivered`) and a delivery log. Pros: no new infra.
  Cons: doesn't scale, depends on admin discipline.

### Step 2: Write the ADR

Evaluate both against LGPD art. 18 (portability), the existing `lgpd.ts`/`reports/csv.ts`
building blocks, and the storage decision (plan 025). Recommend one. Record drivers,
alternatives, consequences, follow-ups. Match the `docs/adr/` format.

**Verify**: `ls docs/adr/0XX-privacidade-data-export.md` exists and renders.

### Step 3: Open the follow-up build plan

After the ADR is accepted, open a separate build plan implementing the chosen option.
Do not build here.

## Test plan

- No tests; this is a spike producing a doc.

## Done criteria

- [ ] `docs/adr/0XX-privacidade-data-export.md` exists
- [ ] ADR evaluates automated-async vs manual-with-SLA
- [ ] ADR recommends one with drivers/consequences/follow-ups
- [ ] ADR references `lgpd.ts`/`reports/csv.ts` as building blocks
- [ ] `advisor-plans/README.md` status row updated, follow-up build plan referenced

## STOP conditions

- The storage decision (plan 025) is unresolved and Option A depends on it — STOP;
  either defer Option A, recommend Option B provisionally, or sequence after 025.
- LGPD retention/expiry for the exported file is undecided — STOP; surface to the
  maintainer; the ADR records the assumed retention.

## Maintenance notes

- Reviewer: this is a decision doc; do not approve building until the ADR is accepted.
- The follow-up must respect the PII encryption boundary (decrypt only at the export
  boundary, never log plaintext) — note in the ADR.