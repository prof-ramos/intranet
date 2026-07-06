# Plan 009: Git hooks — prettier in lint-staged + pre-push validate:quick

> **Executor instructions**: Follow step by step. Run every verification and
> confirm the expected result before moving on. If a STOP condition fires, stop
> and report. When done, update your row in `advisor-plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- .husky/pre-commit package.json .prettierrc`
> If changed, compare "Current state" against live code; on mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `844df3b`, 2026-06-30
- **Issue**: (to be created — non-security)

## Why this matters

A green pre-commit today only proves typecheck + eslint-fix pass — it does not run
tests or enforce prettier formatting. Red tests or unformatted code reach the remote
before CI (the 15-minute E2E job) catches them. Adding `prettier --write` to
lint-staged and a `pre-push` hook running `validate:quick` (lint + typecheck + unit)
closes the local feedback loop without slowing per-commit work.

## Current state

- `.husky/pre-commit` contents (verified):
  ```
  npm run typecheck
  npx lint-staged
  ```
- `package.json` `lint-staged` config (verified):
  ```json
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix"]
  }
  ```
  Prettier is installed (`prettier: ^3.8.3`, `prettier-plugin-tailwindcss: ^0.8.0`).
- `.husky/` contains only `_` and `pre-commit` — no `pre-push`.
- `npm run validate:quick` = `lint + typecheck + unit tests` (from CLAUDE.md).
- Repo conventions: conventional commits; `npm run format:check` exists (per audit).

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Lint-staged dry | `npx lint-staged --debug` | shows prettier in plan |
| Validate quick | `npm run validate:quick` | exit 0 |
| Format check | `npm run format:check` | exit 0 (after format applied) |

## Scope

**In scope**:
- `.husky/pre-commit` (no change, or extend if desired — keep typecheck)
- `.husky/pre-push` (create)
- `package.json` `lint-staged` block (extend)

**Out of scope**:
- `vitest.config.ts`, CI workflow, `eslint.config.mjs`, `.prettierrc`
- Adding integration/E2E to any hook (they need PG; leave to CI)

## Git workflow

- Branch: `advisor/009-git-hooks`
- Commit: `chore(hooks): add prettier to lint-staged + pre-push validate:quick`

## Steps

### Step 1: Extend `lint-staged` to run prettier

In `package.json`, change the `lint-staged` block to:

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

Keep `.husky/pre-commit` as-is (`npm run typecheck` + `npx lint-staged`).

**Verify**: `npx lint-staged --debug` on a staged `.ts` file shows both eslint and
prettier in the plan.

### Step 2: Create `.husky/pre-push`

```sh
#!/usr/bin/env sh
npm run validate:quick
```

Make it executable (`chmod +x .husky/pre-push`).

**Verify**: `cat .husky/pre-push` shows the line; `npm run validate:quick` exits 0
on a clean tree.

### Step 3: Confirm bypass path

Document (in the commit body) that `git push --no-verify` bypasses pre-push when
needed (e.g., during rebase-heavy work).

**Verify**: `npm run validate:quick` exits 0.

## Test plan

- No new automated tests (hook config). Manual verification:
  - Stage a poorly-formatted `.ts` file → commit → assert prettier reformats it in
    the staged diff.
  - Introduce a failing unit test → attempt `git push` → assert pre-push blocks
    with non-zero exit; revert the test; `git push --no-verify` succeeds.
- Verification: `npm run validate:quick` exits 0 on clean tree.

## Done criteria

- [ ] `package.json` `lint-staged` includes `prettier --write` for `*.{ts,tsx}` and `*.{json,md,css}`
- [ ] `.husky/pre-push` exists, is executable, runs `npm run validate:quick`
- [ ] `npm run validate:quick` exits 0
- [ ] `npm run lint` exits 0
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- `prettier --write` on staged files produces large unexpected diffs (e.g.,
  prettier config mismatch) — STOP; run `npm run format:check` first and report
  the scope of reformatting before committing the hook.
- `validate:quick` takes long enough that pre-push is unusable (>60s on a clean
  tree) — STOP; report and consider running only `typecheck` + `test` subsets.

## Maintenance notes

- Reviewer: confirm the hook does not run integration/E2E (they need PG and would
  block pushes on developer machines without `.env.test.local`).
- Future: if `validate:quick` grows slow, switch pre-push to a faster subset.
- The `--no-verify` escape hatch is intentional; do not remove it.