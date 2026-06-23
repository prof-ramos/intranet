# Plan 008: Wire orphaned integration tests into CI and npm scripts

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 7178dd5..HEAD -- package.json vitest.integration.config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `7178dd5`, 2026-06-10
- **Issue**: https://github.com/prof-ramos/intranet/issues/163

## Why this matters

Two integration test files exist in the repository but are never executed by any npm script or CI pipeline:

- `src/lib/auth/login-rate-limit.integration.test.ts` — tests login rate-limiting against a real DB
- `src/lib/juridico/service.integration.test.ts` — tests juridico SLA and service operations against a real DB

Because these tests are not wired, regressions in rate-limit enforcement or juridico SLA logic pass CI without detection. Fixing this is a one-line change to add them to the test runner configuration.

## Current state

- `package.json` line 23 — `test:integration` runs only one file:
  ```
  "test:integration": "node -e \"if(!require('fs').existsSync('.env.test.local')){...}\" && ... vitest run --config vitest.integration.config.ts src/lib/email-triage/persister.integration.test.ts"
  ```

  This explicitly lists only `persister.integration.test.ts`, ignoring all other `*.integration.test.ts` files.

- `vitest.integration.config.ts` line 17 — `include: ['src/**/*.integration.test.{ts,tsx}']` — this would match all integration test files, but the explicit file argument in `package.json` overrides the config-level include pattern.

- The two orphaned files:
  - `src/lib/auth/login-rate-limit.integration.test.ts` (~50 lines, tests login attempt tracking)
  - `src/lib/juridico/service.integration.test.ts` (~80 lines, tests juridico SLA workflows)

- CI: `.github/workflows/ci.yml` runs `npm run test:integration` as part of the test job.

- Repo conventions: Integration tests require PostgreSQL on `localhost` and a `.env.test.local` file.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `npm run typecheck`      | exit 0, no errors   |
| Lint      | `npm run lint`           | exit 0              |

## Scope

**In scope**:
- `package.json` (the `test:integration` script)

**Out of scope**:
- The integration test files themselves — no code changes.
- `vitest.integration.config.ts` — keep config-level `include` as-is for manual `npx vitest run --config vitest.integration.config.ts` usage.
- `.github/workflows/ci.yml` — CI automatically picks up the script change.

## Git workflow

- Branch: `advisor/008-orphan-integration-tests`
- Message style: `test: wire login-rate-limit and juridico integration tests into npm script`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Update test:integration script

In `package.json`, change the `test:integration` script to add the two orphaned test files alongside the existing one:

```json
"test:integration": "node -e \"if(!require('fs').existsSync('.env.test.local')){console.warn('[test:integration] .env.test.local not found — skipping DML tests (see README)');process.exit(0)}\" && node --env-file=.env.test.local scripts/guard-integration-db.js && node --env-file=.env.test.local ./node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts src/lib/email-triage/persister.integration.test.ts src/lib/auth/login-rate-limit.integration.test.ts src/lib/juridico/service.integration.test.ts"
```

Or, simpler and future-proof: remove the explicit file arguments and let the config-level `include` pattern match all `*.integration.test.ts` files:

```json
"test:integration": "node -e \"if(!require('fs').existsSync('.env.test.local')){console.warn('[test:integration] .env.test.local not found — skipping DML tests (see README)');process.exit(0)}\" && node --env-file=.env.test.local scripts/guard-integration-db.js && node --env-file=.env.test.local ./node_modules/vitest/vitest.mjs run --config vitest.integration.config.ts"
```

The second approach is preferred — it automatically picks up new integration tests without additional package.json changes.

**Verify**: `npm run typecheck` → exit 0
**Verify**: `npm run lint` → exit 0

### Step 2: Run the integration tests locally

If you have a `.env.test.local` configured with a PostgreSQL database, run:

```
npm run test:integration
```

Expected: all integration tests pass (existing `persister` tests + now-enabled `login-rate-limit` and `juridico` tests).

If you don't have `.env.test.local`, the script will skip with exit 0 — the config change is still correct.

**Verify**: `npm run test:integration` → exit 0 (or skipped with message if no `.env.test.local`)

## Test plan

- No new tests needed — this plan enables orphaned tests.
- Verify `login-rate-limit.integration.test.ts` and `service.integration.test.ts` are executed as part of `npm run test:integration`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] The `test:integration` script in `package.json` either lists all 3 test files or uses no explicit file arguments (relying on config-level `include`)
- [ ] `npm run test:integration` exits 0 when `.env.test.local` is configured
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The current `test:integration` script has already been updated (drift check reveals the script already includes all test files)
- Removing explicit file arguments causes `persister.integration.test.ts` to be skipped or fail
- A step's verification fails twice after a reasonable fix attempt

## Maintenance notes

- New integration tests added in the future will be automatically picked up if the config-level `include` approach is used.
- The `guard-integration-db.js` script rejects non-localhost DB URLs — production safety is maintained.
