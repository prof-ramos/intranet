# Plan 026: Remove `allow-same-origin` from email preview iframe sandbox

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat f90bafe..HEAD -- src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx`
> If the file changed since this plan was written, compare the "Current state"
> excerpt against the live code before proceeding; on a mismatch, treat it as
> a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `f90bafe`, 2026-06-19

## Why this matters

The email preview renders AI-generated HTML inside an `<iframe>` with
`sandbox="allow-same-origin"`. While JavaScript is blocked (no `allow-scripts`
in the attribute), `allow-same-origin` grants the iframe the same origin as
the parent app. This means that if `allow-scripts` were ever added by accident
or by a future change, the sandboxed content would immediately have full access
to `localStorage`, cookies, and the parent window. Defense in depth: an iframe
displaying a read-only email preview needs no special permissions. Removing
`allow-same-origin` makes the frame fully cross-origin sandboxed regardless of
what other attributes are added in the future.

The generated email HTML uses only inline CSS and `<table>`-based layout (the
system instruction explicitly forbids external CSS and scripts), so removing
`allow-same-origin` has no observable effect on the preview rendering.

## Current state

- `src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx` — client
  component; the iframe is at line 285.

`EmailGeneratorClient.tsx:285-291`:
```tsx
<iframe
  ref={iframeRef}
  srcDoc={generatedHtml}
  title="Pré-visualização do e-mail gerado"
  sandbox="allow-same-origin"
  className="w-full bg-white"
  style={{ minHeight: '600px' }}
/>
```

## Commands you will need

| Purpose   | Command               | Expected on success        |
|-----------|-----------------------|----------------------------|
| Typecheck | `npm run typecheck`   | exit 0, zero errors        |
| Tests     | `npm run test`        | all pass                   |
| Lint      | `npm run lint`        | exit 0                     |

## Scope

**In scope**:
- `src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx` — one
  attribute change on the `<iframe>`

**Out of scope** (do NOT touch):
- Any other file

## Git workflow

- Branch: `advisor/026-harden-iframe-sandbox`
- Commit message: `fix(security): remove allow-same-origin from email preview iframe sandbox`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Remove `allow-same-origin` from the sandbox attribute

In `src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx`, find the
iframe element and change the `sandbox` attribute from:

```tsx
  sandbox="allow-same-origin"
```

to:

```tsx
  sandbox=""
```

Using an empty string keeps the `sandbox` attribute present (all restrictions
active) without granting any capability. This is equivalent to the bare
`sandbox` attribute in HTML.

**Verify**: `grep -n "allow-same-origin" src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx`
→ no output.

### Step 2: Run full checks

```bash
npm run typecheck && npm run lint && npm run test
```

All three must exit 0. This is a one-attribute change; no test failures are
expected.

## Test plan

No new automated tests needed — the change is a single HTML attribute. The
manual verification is: open the email generator in a browser, generate an
email, and confirm the preview renders correctly (styles visible, no broken
layout). The inline-CSS + table-based email format does not depend on
same-origin access, so the preview should be visually identical before and
after the change.

## Done criteria

- [ ] `npm run typecheck` exits 0
- [ ] `npm run test` exits 0
- [ ] `npm run lint` exits 0
- [ ] `grep -n "allow-same-origin" src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx` returns no output
- [ ] `grep -n 'sandbox=' src/app/app/secretaria/emails/gerar/EmailGeneratorClient.tsx` shows `sandbox=""`
- [ ] Only `EmailGeneratorClient.tsx` is modified (`git status`)
- [ ] `plans/README.md` status row updated to DONE

## STOP conditions

- The iframe does not have `sandbox="allow-same-origin"` at line 285 — the
  file has drifted; verify the current sandbox value before proceeding.
- Removing the attribute causes visible layout/style breakage in manual
  preview — the email HTML unexpectedly depends on same-origin access (report
  back with what breaks).

## Maintenance notes

- If streaming HTML rendering is ever added (e.g., `srcdoc` updated
  incrementally), verify that the empty `sandbox` still produces correct
  rendering before shipping.
- Never add `allow-scripts` to this iframe — the preview content is
  AI-generated HTML and must never execute JavaScript in the parent origin.
