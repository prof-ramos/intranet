# Plan 022: Declare `engines.node` and align `@types/node`

> **Executor instructions**: Follow step by step. Verify each step. STOP → report.
>
> **Drift check (run first)**: `git diff --stat 874ed21..HEAD -- package.json`
> If changed, compare against live code; on mismatch, STOP. (Re-stamped @874ed21: #270 landed —
> `lint-staged` now includes `prettier --write` for `*.{ts,tsx}` and `*.{json,md,css}`, and
> `prettier` / `prettier-plugin-tailwindcss` were added to devDeps. That is OUT OF SCOPE for this
> plan — do not touch `lint-staged` or the prettier deps. The two fields this plan touches are
> unchanged at `874ed21`: `engines` is still absent, `@types/node` is still `^25.9.1`. Premise holds.)

## Status

- **Priority**: P3 | **Effort**: S | **Risk**: LOW | **Depends on**: none
- **Category**: deps | **Planned at**: `844df3b`, 2026-06-30 (re-stamped @`874ed21` after #270 landed — premise confirmed: `engines` still absent, `@types/node` still `^25.9.1`; `lint-staged` changed but is out of scope) | **Issue**: [#260](https://github.com/prof-ramos/intranet/issues/260)

## Why this matters

`package.json` declares no `engines` field. `@types/node` is `^25.9.1` while CI runs
Node 20.x (GitHub Actions runners) and production runs the Vercel Node runtime. Without
an `engines` constraint, a contributor on Node 18 or a future Node 26 gets no signal
that they're outside the supported range; with `@types/node@25`, `process.*` APIs that
don't exist on Node 20 can slip into the build and fail at runtime.

## Current state (verified at commit `874ed21`)

- `package.json` — no `engines` field (verified; `python3 -c "import json;print(json.load(open('package.json')).get('engines'))"` → `None`).
- `@types/node` — `^25.9.1` (devDeps, line 76).
- CI — Node 20.x (`.github/workflows/`).
- Vercel — Node runtime (per `vercel.json` / platform default).
- `lint-staged` — now includes `prettier --write` (changed by #270); **out of scope** — do not touch.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Typecheck | `npm run typecheck` | exit 0 |
| Build | `npm run build` | exit 0 |
| Lint | `npm run lint` | exit 0 |

## Scope

**In scope**: `package.json` (`engines` field, `@types/node` version).
**Out of scope**: CI workflow Node version (already 20.x), `vercel.json`, the `lint-staged`
block and `prettier`/`prettier-plugin-tailwindcss` devDeps (changed by #270 — leave them).

## Steps

### Step 1: Add `engines.node`

Add `"engines": { "node": ">=20" }` (or `"^20"`) to `package.json`. Prefer `>=20` to
allow 20/22/24 (current LTS chain) without forcing a bump.

**Verify**: `cat package.json | grep -A2 engines` shows the field.

### Step 2: Align `@types/node`

Downgrade `@types/node` to `^20.x` (or `^22` if the team targets 22). Run
`npm install` to update the lockfile.

> **Note**: This is a dependency install — the executor runs it in its disposable
> worktree; the user reviews the lockfile diff before merge.

**Verify**: `npm run typecheck` → exit 0 (no `process.*` API removed by the downgrade
> should surface; if one does, STOP).

### Step 3: Validate

**Verify**: `npm run lint && npm run typecheck && npm run build` → all exit 0.

## Test plan

- No new tests; typecheck + build is the gate.
- Verification: `npm run validate:quick` → exit 0.

## Done criteria

- [ ] `engines.node` declared in `package.json`
- [ ] `@types/node` aligned to the runtime Node version
- [ ] `npm run typecheck` exits 0
- [ ] `npm run build` exits 0
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- Downgrading `@types/node` surfaces type errors (the codebase uses Node 22+ APIs
  not in `@types/node@20`) — STOP; report the API list and either pin `@types/node` to
  the lowest version that compiles or bump the CI/runtime Node instead.
- `engines.node` is rejected by a deploy platform constraint — STOP; report and use the
  platform's supported range.

## Maintenance notes

- Reviewer: confirm the lockfile change is only `@types/node` and its dependents.
- If the team later bumps CI to Node 22/24, update `engines` and `@types/node` together.