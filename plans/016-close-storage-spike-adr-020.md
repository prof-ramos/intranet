# Plan 016: Close the ADR 020 storage spike (R2 vs Garage) without building Documentos

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- docs/adr/020-storage-r2-vs-garage-spike.md scripts/storage-spike.ts scripts/storage-spike/README.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/481 (also relates to existing GitHub #423)

## Why this matters

ADR 008 keeps Documentos/object storage out of day-1. ADR 012 rejected Papra. ADR 020 is an **isolated POC** comparing Cloudflare R2 and Garage, with closure criteria still unchecked (`docs/adr/020-storage-r2-vs-garage-spike.md:74-82`). Issue #423 tracks R2. Without a recorded choice, `@aws-sdk/*` stays in devDependencies, the `documents` table stays unused, and ADR 019 automated export stays blocked on storage. This plan is: run the existing spike (or document why it cannot run), attach a **secret-free** matrix to #423, and write an ADR 020 amendment that picks, rejects, or defers — **not** an integration into the app.

## Current state

- Spike script: `scripts/storage-spike.ts` + `scripts/storage-spike/README.md` + `scripts/storage-spike.test.ts` (guards).
- Requires `STORAGE_SPIKE_ALLOW_NETWORK=true` and `R2_POC_*` / `GARAGE_POC_*` env vars — **never commit those values**.
- ADR 020: no production bucket, no Vercel env, no documents UI, no Papra.
- `documents` table exists in schema without a product route (`PAGES.md` / ADR 008).

**Conventions**

- Do not reopen Papra (TODO-PROD / ADR 012).
- Do not add `src/lib/storage/` back (removed in PR #297).
- Issue comments: no connection strings, no access keys. Matrix = cost, region, lock-in, S3 API gaps, CORS, lifecycle, LGPD/DPA notes.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Guard tests | `npx vitest run scripts/storage-spike.test.ts` | all pass |
| Spike (optional) | `npm run storage:spike` with POC env | PUT/GET/HEAD as README; `--cleanup` removes only this run’s keys |

## Scope

**In scope**:
- `docs/adr/020-storage-r2-vs-garage-spike.md` (checkboxes + amendment section)
- A short `docs/adr/020-...` “Outcome” subsection **or** a new `docs/adr/022-object-storage-provider.md` **only if** a provider is chosen. If deferred, amend 020 with “deferred, keep spike, no app integration”.
- Comment on GitHub #423 with the matrix (no secrets)
- `scripts/storage-spike/README.md` if a flag was wrong

**Out of scope**:
- Any route, bucket in Vercel, `documents` UI, migration, Papra, wiring `@aws-sdk` into `src/`.
- Removing `@aws-sdk/*` **unless** the amendment explicitly kills the spike (then a follow-up chore PR). Default: keep deps until a provider ADR.

## Git workflow

- Branch: `docs/issue-<N>-storage-spike-outcome`
- Commit: `docs(adr): encerrar spike ADR 020 R2 vs Garage`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Read the spike README and ADR 020 in full

Confirm commands, env var names, cleanup. If POC credentials are not available in this environment, **do not** invent results. Write the ADR amendment as “spike not executed here; checklist remains; recommended next operator step is …” and STOP after the doc + #423 comment asking for POC access. That is an acceptable COMPLETE for a docs-only close **only if** the amendment clearly says “outcome: blocked on POC credentials”. Prefer executing when env exists.

### Step 2: Run against POC (when allowed)

Follow `scripts/storage-spike/README.md`. `--cleanup` after. Capture: success/fail per provider, object size, expired URL behaviour, content-type restriction. **No secret values in the ADR or issue.**

### Step 3: Amend ADR 020

Tick the criteria you actually did. Add Outcome: chosen / rejected / deferred, with 5–10 lines of why (cost, ops, LGPD, S3 compatibility). State explicitly: no app integration in this PR.

Comment on #423 linking the ADR section.

## Test plan

- `npx vitest run scripts/storage-spike.test.ts` still passes (network still gated).
- No app tests.

## Done criteria

- [ ] ADR 020 outcome section exists (chosen / rejected / deferred / blocked-on-credentials)
- [ ] Closure checkboxes match what was actually run
- [ ] #423 has a secret-free comment
- [ ] No `src/` storage integration
- [ ] `plans/README.md` status row updated

## STOP conditions

- POC env vars point at a production bucket. STOP immediately; do not PUT.
- You are asked to add an upload route. Out of scope; new plan.
- Papra is suggested. Reject; cite ADR 012.

## Maintenance notes

- Reviewer: zero credentials in git. `@aws-sdk` removal is a follow-up if the spike is abandoned.
- Documentos product work needs a **new** ADR after this one.
