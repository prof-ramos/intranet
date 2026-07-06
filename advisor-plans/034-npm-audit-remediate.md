# Plan 034: Remediate transitive dependency vulnerabilities

> **Executor instructions**: Follow step by step. Run every verification command.
> If an `overrides` or `resolutions` breaks a build, STOP and report.
>
> **Drift check**: `npm audit --json` — confirm vulnerabilities still exist
> (versions may have been updated since this plan was written).

## Status

- **Priority**: P1 (security)
- **Effort**: M (a day-ish)
- **Risk**: MED (overrides may break transitive deps)
- **Category**: dependencies
- **Planned at**: commit `257b5cc`, 2026-07-06
- **Issue**: plan-only (repo public)

## Why

`npm audit` reports **16 vulnerabilities** (5 high, 6 moderate, 5 low):

| Pkg | Severity | Risk | Dependency path |
|-----|----------|------|-----------------|
| `nodemailer@8.0.10` | HIGH | SSRF + arbitrary file read | mailparser → nodemailer |
| `undici@7.27.2` | HIGH | TLS cert bypass, DoS, header injection | jsdom → undici |
| `ws@8.17.1-8.21.0` | HIGH | Memory exhaustion DoS | @google/genai, @novu/react → socket.io → engine.io → ws |
| `esbuild@0.28.0` | LOW | Arbitrary file read (Windows only) | drizzle-kit, tsx, vitest |
| `vite@8.0.14` | LOW | fs.deny bypass (Windows only) | vitest |
| `js-yaml@4.1.x` | MOD | DoS via merge key aliases | (development only) |

## Current state

- `nodemailer@8.0.10` is a transitive dep via `mailparser@3.9.9` — used only for email parsing, not for sending. The SSRF vuln is in nodemailer's mail-sending code, so exploitation via mailparser is unlikely. Still HIGH severity.
- `ws` appears three times in the tree: `@google/genai` uses `ws@8.21.0`, `@novu/react` uses `ws@8.17.1`, `@next/bundle-analyzer` uses `ws@7.5.11`.
- `undici` is embedded in the Node.js runtime for `fetch`, and `jsdom` brings it as a dependency.
- `esbuild` (Windows-only, LOW) and `vite` (Windows-only, LOW) are dev-only — no production risk.
- `js-yaml` is used in dev tooling (not user-facing).

## Scope

**In scope**: `package.json` overrides for `nodemailer`, `ws`.
**Out of scope**: `undici` (needs Node.js upgrade, not a package fix), `esbuild`/`vite` (Windows-only, LOW), `js-yaml` (dev-only, not user-facing).

## Steps

### Step 1: Add overrides for high-severity transitive deps

In `package.json`, add:

```json
"overrides": {
  "nodemailer": "^9.0.0",
  "ws": "^8.21.0"
}
```

**Verify**: `npm install` → exit 0 (lockfile updated)

### Step 2: Check that mailparser still works

`mailparser@3.9.9` lists `nodemailer@^8` as a peer dep. If v9 breaks the API, override to `>=8.0.11 <9.0.0` instead. Run the email-triage related tests.

**Verify**: `npx vitest run src/lib/email-triage/` → all pass

### Step 3: Run full validation

**Verify**: `npm run validate:quick` → exit 0

### Step 4: Run npm audit to confirm reduction

**Verify**: `npm audit` → nodemailer and ws high-severity findings resolved

## Done criteria

- [ ] `npm run validate:quick` exits 0
- [ ] `npm audit` shows no HIGH-severity findings for nodemailer or ws
- [ ] email-triage tests pass
- [ ] No production code changes, only `package.json` + `package-lock.json`

## STOP conditions

- `npm install` fails after adding overrides — STOP; report which override caused it and propose a narrower version range.
- `mailparser` import fails at runtime after nodemailer override — STOP; revert and propose the maintainer's recommended resolution path.

## Maintenance notes

- `undici` will resolve automatically when the project upgrades to Node.js 24+ or when `jsdom` publishes a patch.
- Windows-only findings (`esbuild`, `vite`) are acceptable for this project (dev macOS/Linux, CI Linux).
- Re-run `npm audit` quarterly to track stale overrides.
