# Plan 015: Add pre-commit hooks (husky + lint-staged) for typecheck and lint

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 93ab643..HEAD -- package.json`
> If `package.json` changed since this plan was written, re-read it before
> proceeding; on a mismatch with the excerpts below, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: plans/010-revalidatetag-arity.md (typecheck must pass before hooks can be enforced)
- **Category**: dx
- **Planned at**: commit `93ab643`, 2026-06-17

## Why this matters

There are currently no pre-commit hooks. Typecheck and lint only run in CI. The
direct evidence of the cost: Plan 010 exists because a `revalidateTag` arity error
was committed to `main` and passed undetected until the advisor audit. A local gate
that runs `tsc --noEmit` and ESLint before every commit would have caught it in seconds.
The project already has a `validate:quick` script that is the right candidate for this.

Risk note: `npm run typecheck` (full `tsc --noEmit`) takes a few seconds; on slow
machines it can add ~10–15s to every commit. The lint-staged config runs lint only on
staged files (fast). Typecheck runs on the whole project because TypeScript cannot
type-check in isolation per file. If the team finds this too slow, the STOP condition
describes a lighter alternative.

## Current state

`package.json` has no `prepare` script and no `husky`/`lint-staged`/`simple-git-hooks`
dependencies:

```json
// package.json (devDependencies excerpt) — no hooks tooling present
{
  "scripts": {
    "validate:quick": "npm run typecheck && npm run lint",
    ...
  }
}
```

The `.git/hooks/` directory exists but contains only sample hooks (no `pre-commit`).

## Commands you will need

| Purpose          | Command                         | Expected on success                    |
|------------------|---------------------------------|----------------------------------------|
| Install          | `npm install`                   | exit 0                                 |
| Typecheck        | `npm run typecheck`             | exit 0 (Plan 010 must land first)      |
| Lint             | `npm run lint`                  | exit 0                                 |
| Verify hook file | `cat .husky/pre-commit`         | shows the hook script                  |
| Test hook        | `git commit --allow-empty -m "test hook"` | typecheck + lint run and pass |

## Scope

**In scope**:
- `package.json` (add `devDependencies`, `prepare` script, `lint-staged` config)
- `.husky/pre-commit` (created by husky init)
- `.husky/_/husky.sh` (created automatically)

**Out of scope** (do NOT touch):
- Any source files
- `.github/workflows/` — CI already has its own gates; this adds only the local gate
- `vitest` or test config — tests are intentionally excluded from the pre-commit hook
  (too slow; they run in CI)

## Git workflow

- Branch: `advisor/015-precommit-hooks`
- Commits: two — one for the `npm install` lock file update, one for the hook config
- Message style: `chore(dx): add husky pre-commit hook for typecheck and lint`
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Install husky and lint-staged

```bash
npm install --save-dev husky lint-staged
```

**Verify**: `package.json` now has `"husky"` and `"lint-staged"` in `devDependencies`.

### Step 2: Initialise husky

```bash
npx husky init
```

This creates `.husky/pre-commit` with a sample command and adds `"prepare": "husky"`
to `package.json` scripts.

**Verify**: `cat .husky/pre-commit` exists.

### Step 3: Write the pre-commit hook

Replace the contents of `.husky/pre-commit` with:

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run typecheck
npx lint-staged
```

**Verify**: `cat .husky/pre-commit` matches the above.

### Step 4: Add lint-staged config to `package.json`

In `package.json`, add a `"lint-staged"` key at the top level (not inside `scripts`):

```json
"lint-staged": {
  "*.{ts,tsx}": [
    "eslint --fix"
  ]
}
```

Note: `eslint --fix` auto-fixes style issues. If the team prefers check-only (no
auto-fix), use `"eslint"` instead. For this repo, `--fix` is safe because ESLint is
already configured and the codebase passes `npm run lint` cleanly.

**Verify**: `npm run lint` exits 0 (confirms no pre-existing lint errors that would
block future commits).

### Step 5: Run a dry-run commit to confirm the hook works

```bash
git commit --allow-empty -m "chore: test pre-commit hook"
```

The hook should run `npm run typecheck` (should pass after Plan 010) and then
`npx lint-staged` (should pass with zero staged files = no-op).

**Verify**: The commit succeeds and the output shows typecheck and lint-staged ran.

Then drop the test commit:
```bash
git reset HEAD~1
```

## Test plan

No unit tests needed — this is tooling configuration. The test is the dry-run commit
in Step 5.

## Done criteria

- [ ] `npm install` exits 0 and `package.json` includes `husky` and `lint-staged` in `devDependencies`
- [ ] `.husky/pre-commit` exists and contains `npm run typecheck` and `npx lint-staged`
- [ ] `package.json` has `"prepare": "husky"` in `scripts`
- [ ] `package.json` has `"lint-staged"` config targeting `*.{ts,tsx}`
- [ ] `git commit --allow-empty` triggers and passes both hooks
- [ ] `npm run typecheck` exits 0 (pre-condition — Plan 010 must be done first)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `npm run typecheck` exits non-zero — do not install the hook until Plan 010 is
  complete; a broken typecheck hook will block all commits.
- The team uses a monorepo or pnpm workspaces setup that makes `npx husky init`
  behave differently than expected — investigate before proceeding.
- An existing `.husky/` directory or `prepare` script is already present (check
  with `ls .husky/ 2>/dev/null`).

## Maintenance notes

- Full test suite (`npm run test`) is deliberately excluded from the pre-commit hook
  to keep commit latency low. Tests run in CI on every push.
- If the team finds `npm run typecheck` too slow in the hook (>15s), an alternative
  is `npx tsc --noEmit --incremental` which uses a `.tsbuildinfo` cache and is
  significantly faster after the first run. Add `"tsbuildinfo"` to `.gitignore`.
- When a new developer joins, `npm install` runs `prepare` automatically and installs
  the hooks. No manual step required.
