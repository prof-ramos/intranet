# Plan 013: Remove stale Supabase domains from CSP

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 123f019..HEAD -- next.config.ts`
> If the file changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `123f019`, 2026-06-12
- **Issue**: none yet

## Why this matters

The Content-Security-Policy in `next.config.ts` includes `*.supabase.co` in the `connect-src` directive:
```
connect-src 'self' https://*.supabase.co wss://*.supabase.co
```

The app does NOT use Supabase — it uses Neon Postgres directly via `@neondatabase/serverless`. This wildcard entry is leftover from an earlier architecture or template. Wildcard CSP entries widen the attack surface: if any XSS vulnerability exists, an attacker could exfiltrate data to any `*.supabase.co` subdomain. Removing dead CSP entries is a security best practice (principle of least privilege).

## Current state

- `next.config.ts:36`:
  ```ts
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  ```
- The app uses Neon directly (`@neondatabase/serverless`), not Supabase.
- No `import` or usage of `@supabase/*` anywhere in the codebase (verified during audit).

## Commands you will need

| Purpose   | Command                              | Expected on success          |
|-----------|--------------------------------------|------------------------------|
| Typecheck | `npm run typecheck`                  | exit 0, no errors            |
| Lint      | `npm run lint`                       | exit 0                       |
| Tests     | `npm run test`                       | all pass                     |

## Scope

**In scope** (the only files you should modify):
- `next.config.ts` (one line change in CSP string)

**Out of scope**:
- Other CSP directives
- Adding new CSP entries for legitimate services
- Modifying security headers beyond the CSP

## Git workflow

- Branch: `advisor/013-remove-supabase-csp`
- Commit message: `fix(security): remove stale *.supabase.co from CSP connect-src`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Remove the Supabase wildcard from connect-src

In `next.config.ts:36`, change:
```ts
"connect-src 'self' https://*.supabase.co wss://*.supabase.co",
```

To:
```ts
"connect-src 'self'",
```

**Verify**: `npm run typecheck` → exit 0

### Step 2: Verify no Supabase references exist

```bash
grep -rn "supabase" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

Expected: no matches (confirms no code depends on the removed CSP entry).

### Step 3: Run quality gates

```bash
npm run lint        # → exit 0
npm run typecheck   # → exit 0
npm run test        # → all pass
```

## Test plan

- No new tests needed — this is a config change that removes an unused CSP entry.
- Verify the app still loads correctly in the browser (no CSP violations in console).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run typecheck` exits 0
- [ ] `npm run lint` exits 0
- [ ] `npm run test` exits 0
- [ ] `grep -n "supabase" next.config.ts` returns no matches
- [ ] `grep -rn "supabase" src/ --include="*.ts" --include="*.tsx"` returns no matches (excluding node_modules)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts (the codebase has drifted since this plan was written).
- A step's verification fails twice after a reasonable fix attempt.
- `grep` finds actual Supabase usage in the codebase (the CSP entry may be needed after all).

## Maintenance notes

- If Supabase is added as a service in the future, the CSP entry should be re-added with the specific project subdomain, not a wildcard: `https://<project>.supabase.co`.
- Review CSP quarterly for stale entries.
