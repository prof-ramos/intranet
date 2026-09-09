# Plan 001: Derive the must-change-password allowlist from the request URL, not a client header

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/auth/require-auth.ts src/lib/auth/require-auth.test.ts src/proxy.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/466

## Why this matters

When `admins.mustChangePassword` is true, `requireAuth()` is supposed to send the operator only to `/change-password`. The gate currently decides that by reading the `next-url` request header and taking its pathname. That header is not a server-owned fact: a request that already has a valid session cookie can present a `/change-password` path while the real URL is an authenticated `/app/*` page or Server Action. The control then fails open. The fix is to stamp the **actual** `request.nextUrl.pathname` in `src/proxy.ts` (overwriting any incoming value) and have `requireAuth` read only that stamped header.

Do not add demonstrations of the bypass. Tests should assert the header contract: missing/wrong pathname redirects; only the stamped `/change-password` path is allowed.

## Current state

- `src/lib/auth/require-auth.ts` — session + DB lookup; password-change gate at lines 15–26 and 85–90.
- `src/lib/auth/require-auth.test.ts` — currently **locks in** allowing an absolute `next-url` whose path is `/change-password` (around lines 343–366). One redirect case sets `x-pathname`, which the production code does not read.
- `src/proxy.ts` — Next.js 16 route guard. Checks cookie presence on `/app` and `/change-password`. Does not stamp a pathname header. Matcher already covers those prefixes.

Excerpt (`src/lib/auth/require-auth.ts`):

```ts
function pathnameFromHeaders(reqHeaders: Headers): string {
  const nextUrl = reqHeaders.get('next-url');
  if (!nextUrl) {
    return '';
  }
  try {
    return new URL(nextUrl).pathname;
  } catch {
    return '';
  }
}

// ...
if (admin.mustChangePassword) {
  const reqHeaders = await headers();
  const pathname = pathnameFromHeaders(reqHeaders);
  if (!pathname.startsWith('/change-password')) {
    redirect('/change-password');
  }
}
```

Excerpt (`src/proxy.ts`):

```ts
export async function proxy(request: NextRequest) {
  if (isSkipAuthEnabled()) {
    return NextResponse.next();
  }
  const pathname = request.nextUrl.pathname;
  // ... cookie redirects ...
  return NextResponse.next();
}
```

**Conventions**

- Fail closed: missing pathname must keep redirecting to `/change-password`.
- `SKIP_AUTH` still bypasses the DB lookup (existing `isSkipAuthEnabled()` branch) — do not change that.
- Auth tests mock `next/headers` with a `Map` (`require-auth.test.ts:7-14`). Keep that pattern.
- Project memory: PR #234 stopped trusting `x-pathname` from the client. Do not reintroduce a client-supplied `x-pathname`. The new header must be **set by proxy from `request.nextUrl.pathname`**, overwriting any inbound value.
- User-facing copy stays Portuguese. Test names in this file may stay English to match the suite.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit (auth) | `npx vitest run src/lib/auth/require-auth.test.ts src/proxy.ts` | all pass (if you add `src/proxy.test.ts`, include it) |
| Lint | `npm run lint` | exit 0 |
| Typecheck | `npm run typecheck` | exit 0 |

## Suggested executor toolkit

- Use `minimal-code-discipline` / shortest correct diff: one header stamp + one reader + test updates.

## Scope

**In scope**:
- `src/proxy.ts`
- `src/lib/auth/require-auth.ts`
- `src/lib/auth/require-auth.test.ts`
- `src/proxy.test.ts` (create only if you add a unit test for the header stamp; otherwise cover via require-auth tests)

**Out of scope**:
- Login, session cookie flags, `SKIP_AUTH` production guard.
- ADR 005 / Mailjet / temp-password UI (plan 007).
- `src/lib/server-actions/define-form-action.ts` — it already calls `requireAuth()`; fixing the gate covers Server Actions.
- Changing the `proxy` matcher.

## Git workflow

- Branch: `fix/issue-<N>-must-change-password-gate` per `docs/development/branch-naming.md` (`<N>` = GitHub issue in Status).
- Commit style: `fix(auth): derivar mustChangePassword do pathname do proxy`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Stamp the real pathname in proxy

In `src/proxy.ts`, before every `NextResponse.next()` (including the `SKIP_AUTH` early return if that path still reaches `requireAuth` under skip — skip-auth users do not hit the must-change gate; leave skip-auth as `next()` without extra headers if you prefer).

For the authenticated/non-skip path, clone request headers, **delete** any inbound `x-asof-pathname` and `next-url` is not yours to delete (Next may set it). Set:

```ts
const requestHeaders = new Headers(request.headers);
requestHeaders.set('x-asof-pathname', request.nextUrl.pathname);
return NextResponse.next({ request: { headers: requestHeaders } });
```

Apply this on the final `return NextResponse.next()` so `/app/*` and `/change-password` both carry the real path. Redirect responses do not need the stamp.

**Verify**: `rg -n "x-asof-pathname" src/proxy.ts` shows the `set` call using `request.nextUrl.pathname`.

### Step 2: Read only the stamped header in requireAuth

Replace `pathnameFromHeaders` so it reads `x-asof-pathname` only. Treat the value as a pathname (`/`-prefixed). Reject values that contain `://` (fail closed → empty string → redirect). Do not parse `next-url`.

Keep `pathname.startsWith('/change-password')` so `/change-password` and query-less subpaths work. Empty header continues to redirect.

**Verify**: `rg -n "next-url" src/lib/auth/require-auth.ts` returns no matches.

### Step 3: Rewrite the unit tests

In `src/lib/auth/require-auth.test.ts`:

- Cases that should redirect: set `x-asof-pathname` to `/app`, `/app/associados`, or omit the header. Expect `NEXT_REDIRECT:/change-password`.
- Case that should allow: set `x-asof-pathname` to `/change-password` only.
- **Delete or invert** `allows access when next-url is an absolute /change-password URL`. Replace with: `next-url` set to a `/change-password` absolute URL, **without** `x-asof-pathname`, must still redirect (client header is ignored).
- Remove the unused `x-pathname` sets (lines 288 and 338) unless you also assert they are ignored.

**Verify**: `npx vitest run src/lib/auth/require-auth.test.ts` — all pass, including the inverted case.

## Test plan

- File: `src/lib/auth/require-auth.test.ts` (existing). Pattern: mock `headers()` Map + `NEXT_REDIRECT:` digest.
- Cases:
  1. `mustChangePassword` + no pathname header → redirect.
  2. `mustChangePassword` + `x-asof-pathname=/app` → redirect.
  3. `mustChangePassword` + `x-asof-pathname=/change-password` → resolves.
  4. `mustChangePassword` + only `next-url` pointing at `/change-password` → redirect (ignored).
- Do not add a test that documents how to combine a session cookie with a forged header to reach `/app`.

Verification: `npx vitest run src/lib/auth/require-auth.test.ts` → all pass.

## Done criteria

- [ ] `npx vitest run src/lib/auth/require-auth.test.ts` exits 0
- [ ] `rg -n "next-url" src/lib/auth/require-auth.ts` is empty
- [ ] `src/proxy.ts` sets `x-asof-pathname` from `request.nextUrl.pathname`
- [ ] The old test that allowed an absolute `next-url` no longer asserts success
- [ ] `npm run lint` and `npm run typecheck` exit 0
- [ ] No files outside the in-scope list are modified
- [ ] `plans/README.md` status row updated

## STOP conditions

- `require-auth.ts` no longer reads `next-url` (already fixed) — mark REJECTED in the index and stop.
- Stamping request headers in `proxy.ts` is rejected by the Next.js 16 API (`NextResponse.next({ request: { headers } })` missing or changed). STOP and report; do not invent an alternative without a new plan.
- You believe Server Actions skip `proxy.ts` on this Next version. STOP and report before shipping a gate that only covers document navigations.

## Maintenance notes

- Reviewer: confirm the proxy **overwrites** inbound `x-asof-pathname`, not appends.
- Any new auth gate that needs “current path” must use this stamped header, never `next-url` / `x-pathname` / `x-url` from the client.
- Follow-up (out of scope): `proxy.ts` still only checks cookie presence, not `mustChangePassword`. That is OK once `requireAuth` is honest; pages without `requireAuth` would still be a separate finding.
