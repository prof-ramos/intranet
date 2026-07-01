# Plan 004: Harden `isPublicWebhookUrl` (IPv6 ULA, `fe80::/10`, DNS rebinding)

> **Executor instructions**: Follow step by step. Run every verification and confirm
> the expected result before moving on. STOP conditions → stop and report.
>
> **Drift check (run first)**: `git diff --stat 844df3b..HEAD -- src/lib/validation/schemas.ts`
> If changed, compare "Current state" excerpts against live code; on mismatch, STOP.
>
> **SECURITY NOTE**: plan-only — do not publish as a public issue.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `844df3b`, 2026-06-30
- **Issue**: plan-only (repo public)

## Why this matters

`isPublicWebhookUrl` is the SSRF gate for outbound webhook delivery. It is purely
lexical — it string-matches the hostname without DNS resolution, and its IPv6
checks are broken: `new URL('https://[fc00::1]').hostname` returns `'[fc00::1]'`
(with brackets), so `startsWith('fc')` never matches. IPv6 ULA (`fc00::/7`), link-local
(`fe80::/10`), and IPv4-mapped (`::ffff:`) addresses all pass. A subscriber who sets a
webhook URL to an internal IPv6 address can exfiltrate the webhook payload onto the
internal network or probe internal services.

## Current state

- `src/lib/validation/schemas.ts:131-163` — `isPublicWebhookUrl`:
  - line ~143: `hostname = url.hostname.toLowerCase()`
  - lines ~144-151: reject `localhost`/`.local`/`.internal`
  - lines ~153-160: check `[::1]`/`::1`/`startsWith('fc')`/`startsWith('fd')` — broken for bracketed IPv6
  - line ~162: only checks `PRIVATE_IPV4_RANGES`
- No DNS resolution; no `fe80::/10`; no `::ffff:` mapped handling; no DNS rebinding
  protection (resolve, then re-resolve before fetch and assert IP class unchanged).
- The function is consumed by webhook subscription validation and the dispatcher.

## Commands you will need

| Purpose | Command | Expected |
|---------|---------|----------|
| Focused tests | `npx vitest run src/lib/validation/schemas.test.ts` | pass |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Validate | `npm run validate:quick` | exit 0 |

## Scope

**In scope**: `src/lib/validation/schemas.ts` + its test file.
**Out of scope**: webhook dispatcher fetch logic (plan 024), webhook subscription UI.

## Steps

### Step 1: Fix IPv6 parsing

Strip brackets before checking: `const h = hostname.replace(/^\[|\]$/g, '')` for
IPv6. Add explicit checks for `fc00::/7` (ULA), `fe80::/10` (link-local), `::1`,
`::ffff:` mapped IPv4, and `64:ff9b::` NAT64. Use `node:net` `isIP` to classify and
a CIDR helper (e.g. `ip6addr` or a manual `BigInt` mask compare). If a vetted
library is already a dependency, use it; otherwise prefer `node:net` primitives.

**Verify**: `npm run typecheck` → exit 0.

### Step 2: Add DNS resolution + rebinding guard (if feasible server-side)

Resolve the hostname; reject if any resolved address is private/loopback/link-local.
Document that this runs at subscription-validation time; the dispatcher (plan 024)
should re-validate the resolved IP immediately before fetch to close the rebinding
window. If adding DNS here is out of scope for this plan, STOP and report — split
into "static checks here, runtime rebind guard in plan 024."

**Verify**: `npx vitest run src/lib/validation/schemas.test.ts` → new tests pass.

### Step 3: Tests

Add cases: `https://[fc00::1]` → rejected; `https://[fe80::1]` → rejected;
`https://[::1]` → rejected; `https://[::ffff:127.0.0.1]` → rejected; a public IPv6
→ accepted; existing IPv4 private cases still rejected.

**Verify**: `npm run validate:quick` → exit 0.

## Test plan

- New tests in `schemas.test.ts` for each IPv6 rejection case + a public IPv6 acceptance.
- Pattern: existing `isPublicWebhookUrl` tests in the same file.
- Verification: `npx vitest run src/lib/validation/schemas.test.ts` → all pass.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run validate:quick` exits 0
- [ ] `isPublicWebhookUrl('https://[fc00::1]')` returns `false` (test asserts)
- [ ] `isPublicWebhookUrl('https://[fe80::1]')` returns `false` (test asserts)
- [ ] `advisor-plans/README.md` status row updated

## STOP conditions

- No vetted IP/CIDR library is available and `node:net` does not expose enough to
  classify IPv6 ranges cleanly — STOP; report and propose adding `ip6addr` (or
  equivalent) as a dependency (requires operator approval).
- DNS resolution in this function changes its sync signature — STOP; report and
  propose making it `async` (callers must be updated, scope expands).

## Maintenance notes

- Reviewer: confirm the bracket-strip handles `url.hostname` for both Node and edge
  runtimes (Vercel Fluid Compute) — hostname parsing can differ.
- This plan and plan 024 both touch webhook delivery security; review together.