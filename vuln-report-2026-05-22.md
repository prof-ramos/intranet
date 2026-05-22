# Vulnerability Assessment Report

**Target**: `ASOF/intranet`
**Date**: 2026-05-22
**Scope**: Entire repository, excluding generated/dependency directories such as `node_modules`, `.next`, `.next-e2e`, `.git`, `dist`, and `build`.
**Total Findings**: 14
**Critical**: 0 | **High**: 0 | **Medium**: 8 | **Low**: 5 | **Info**: 1

---

## Executive Summary

The audit found no confirmed SQL injection, command injection, path traversal, unauthenticated admin endpoint, hardcoded production secret, or plaintext webhook-secret regression. The most important risks are concentrated in role/field-level authorization, LGPD-sensitive data handling, webhook dispatch SSRF hardening, and race/state-machine bugs around login rate limiting and outbound event dispatch. Several lower-severity items are defense-in-depth improvements rather than directly exploitable vulnerabilities.

## Architecture Snapshot

- Stack: Next.js 16 App Router, React 19, TypeScript, Drizzle ORM, PostgreSQL/Supabase, Supabase Auth, Tailwind/DaisyUI.
- Main trust boundaries: `proxy.ts` protected routes, `requireAuth()`, `requireRole()`, `/api/v1/*` HMAC/API-key integration auth, cron bearer routes, Server Actions, Drizzle repositories, outbound webhook dispatch.
- Sensitive domains: associados LGPD fields, financeiro mensalidades, jurídico consultas/SLA, secretaria/ofícios, integration API keys/webhooks, audit logs.
- Highest-risk entry points reviewed: login, associate edit/list/report routes, juridico Server Actions, financeiro Server Actions, atividade board actions, `/api/v1/events`, cron dispatch routes, webhook subscription/dispatch code, ofício PDF download, reports CSV export, logger/sanitization utilities.

## Severity Distribution

| Severity | Count | Reachable | Partially Reachable | Unreachable |
| -------- | ----- | --------- | ------------------- | ----------- |
| Critical | 0     | 0         | 0                   | 0           |
| High     | 0     | 0         | 0                   | 0           |
| Medium   | 8     | 1         | 7                   | 0           |
| Low      | 5     | 0         | 5                   | 0           |
| Info     | 1     | 1         | 0                   | 0           |

## Findings

### F-001: Bypass Login Rate Limits With Concurrent Attempts

- **Severity**: Medium
- **Category**: RACE-01
- **Confidence**: confirmed
- **Reachability**: reachable
- **Locations**:
  - `src/app/login/actions.ts:56`
  - `src/lib/auth/login-rate-limit.ts:50`
  - `src/lib/auth/login-rate-limit.ts:141`
  - `src/lib/db/schema/login-attempts.ts:15`

**Description**:

The login rate limiter checks the current attempt count and increments it in separate operations. Because `login_attempts.email` is indexed but not unique, first-use races can also create duplicate rows for the same normalized email.

**Root Cause**:

Non-atomic rate-limit consume logic and no unique constraint on the normalized login identifier.
Root cause ID: `RC-race-auth-login-rate-limit`

**Attack Scenario**:

1. Send many failed login requests for the same target email in parallel.
2. Have several requests read `attempts < maxAttempts` before any increment completes.
3. Exceed the intended 5-attempt window and weaken brute-force protection.

**Attack Path**:

1. `login()` calls `loginRateLimiter.consume(email)`.
2. `consume()` reads the current entry.
3. `incrementAttempts()` updates attempts after the allow decision.

**Evidence**:

```ts
// src/lib/auth/login-rate-limit.ts
const entry = await getEntry(normalizedKey, now);
if (entry.attempts >= options.maxAttempts) return { allowed: false, ... };
await store.incrementAttempts(normalizedKey, now);
```

**Sanitization Checkpoints**:

| Checkpoint                | Type       | Bypassable? |
| ------------------------- | ---------- | ----------- |
| `login-rate-limit.ts:141` | validation | Yes         |

**Impact**:

Unauthenticated attackers can exceed the configured login-attempt budget for a target email during concurrent bursts.

**Remediation**:

Make consume atomic with a unique key on the normalized email hash. Prefer a single SQL `INSERT ... ON CONFLICT DO UPDATE ... WHERE attempts < maxAttempts` or an equivalent transactional row lock.

**Validation Notes**:

Confirmed by static trace: the check and increment are separate, and the schema only has non-unique indexes.

**Dedup Notes**:

Independent from generic IP and integration rate limiters, which use atomic unique-key patterns.

**Trace Notes**:

Reachable through the unauthenticated login form/action.

---

### F-002: Mask Associate Emails in Secretaria List View

- **Severity**: Medium
- **Category**: DATA-01
- **Confidence**: confirmed
- **Reachability**: partially_reachable
- **Locations**:
  - `src/app/app/associados/page.tsx:17`
  - `src/lib/associates/repository.ts:51`
  - `src/app/app/associados/page.tsx:193`
  - `src/lib/associates/lgpd.ts:6`

**Description**:

The associados list is accessible to any authenticated role via `requireAuth()`, selects `primaryEmail`, and renders it directly. The same domain model marks `primaryEmail` as LGPD-sensitive and masks it in role-aware profile DTOs.

**Root Cause**:

The list DTO bypasses the role-aware LGPD masking used elsewhere.
Root cause ID: `RC-data-associates-list-email`

**Attack Scenario**:

1. Authenticate as `secretaria`.
2. Open `/app/associados`.
3. Enumerate primary email addresses for active associados from the table.

**Attack Path**:

1. `AssociadosPage` calls `requireAuth()`, not a privileged role guard.
2. `findAssociatesPaginated()` selects `associates.primaryEmail`.
3. The page renders `row.primaryEmail`.

**Evidence**:

```ts
// src/lib/associates/repository.ts
primaryEmail: associates.primaryEmail,

// src/app/app/associados/page.tsx
<td className="px-4 py-3">{row.primaryEmail ?? '—'}</td>
```

**Sanitization Checkpoints**:

| Checkpoint                                   | Type     | Bypassable? |
| -------------------------------------------- | -------- | ----------- |
| `src/lib/associates/lgpd.ts` profile masking | sanitize | Yes         |

**Impact**:

A `secretaria` account can enumerate email addresses that the project classifies as sensitive.

**Remediation**:

Make `getAssociatesListPage` role-aware and mask/omit `primaryEmail` for non-privileged roles, or require `admin`/`diretoria` for that column.

**Validation Notes**:

Confirmed by source inspection; no role-dependent transform is applied before render.

**Dedup Notes**:

Separate from the broader plaintext-storage finding because this is a presentation-layer exposure.

**Trace Notes**:

Requires an authenticated `secretaria` or higher account.

---

### F-003: Enforce Admin-Only Updates for Associate Internal Notes

- **Severity**: Medium
- **Category**: AUTH-02
- **Confidence**: confirmed
- **Reachability**: partially_reachable
- **Locations**:
  - `src/app/app/associados/actions.ts:10`
  - `src/lib/validation/schemas.ts:140`
  - `src/app/app/associados/[id]/editar/EditarAssociadoForm.tsx:355`

**Description**:

The UI renders `internalNotes` only when `canEditInternalNotes` is true, and that flag is admin-only. The server action, however, allows both `admin` and `diretoria`, accepts `internalNotes` from `FormData`, and forwards it to the update service.

**Root Cause**:

Client-side field hiding is used as the only field-level authorization control for `internalNotes`.
Root cause ID: `RC-auth-associate-internal-notes`

**Attack Scenario**:

1. Authenticate as `diretoria`.
2. Submit the associate update Server Action with an added `internalNotes` field.
3. Persist notes that the UI intended to reserve for `admin`.

**Attack Path**:

1. `updateAssociate()` authorizes `['admin', 'diretoria']`.
2. `updateAssociateSchema` accepts `internalNotes`.
3. `updateAssociateData()` persists the supplied value.

**Evidence**:

```ts
const actor = await requireRole(['admin', 'diretoria']);
// ...
internalNotes: data.internalNotes ?? null,
```

**Sanitization Checkpoints**:

| Checkpoint                    | Type       | Bypassable? |
| ----------------------------- | ---------- | ----------- |
| `EditarAssociadoForm.tsx:355` | validation | Yes         |

**Impact**:

A `diretoria` user can alter admin-only internal notes for associados through crafted form submission.

**Remediation**:

Only include `internalNotes` when `actor.role === 'admin'`; otherwise omit the field and preserve the existing database value. Add a regression test for `diretoria`-submitted `internalNotes`.

**Validation Notes**:

Confirmed by comparing UI guard and Server Action behavior.

**Dedup Notes**:

Independent field-level authorization issue.

**Trace Notes**:

Requires an authenticated `diretoria` account.

---

### F-004: Sanitize Raw Error Objects Before Logging

- **Severity**: Medium
- **Category**: DATA-01
- **Confidence**: confirmed
- **Reachability**: partially_reachable
- **Locations**:
  - `src/lib/logger.ts:143`
  - `src/app/app/config/usuarios/actions.ts:100`
  - `src/lib/supabase/admin.ts:144`

**Description**:

Call sites often pass a safe context object, but also pass the raw `Error` as the third logger argument. The logger serializes `error.message` and `error.stack` directly; production redaction operates on object keys and does not scrub sensitive substrings inside raw error strings.

**Root Cause**:

The logger's error channel is not PII-aware, while callers assume `toSafeErrorLog()` in context is sufficient.
Root cause ID: `RC-data-logger-raw-error`

**Attack Scenario**:

1. Trigger a provider or application error whose message includes user-controlled or sensitive material.
2. Reach a call site that logs both `{ error: toSafeErrorLog(error) }` and the raw `Error`.
3. Persist email, token, reset-link, or other sensitive text in server logs.

**Attack Path**:

1. `generatePasswordResetLink()` can throw an error string containing the target email.
2. `resetUserPassword()` logs the safe context and raw error object.
3. `Logger` writes `error.message`/`error.stack`.

**Evidence**:

```ts
// src/lib/logger.ts
entry.error = {
  name: error.name,
  message: error.message,
  stack: error.stack,
};
```

**Sanitization Checkpoints**:

| Checkpoint                 | Type     | Bypassable? |
| -------------------------- | -------- | ----------- |
| `toSafeErrorLog()` context | sanitize | Yes         |

**Impact**:

Sensitive emails, reset-link details, tokens, or provider messages can appear in logs.

**Remediation**:

Either stop passing raw errors from sensitive call sites or make `Logger` sanitize `error.message` and omit/redact stack traces in production. Prefer `toSafeErrorLog()` as the only persisted error detail.

**Validation Notes**:

Confirmed by direct code trace.

**Dedup Notes**:

Merged across logger call sites under one logging root cause.

**Trace Notes**:

Partially reachable through authenticated admin actions and other error paths.

---

### F-005: Block Webhook SSRF Through Redirects and DNS Rebinding

- **Severity**: Medium
- **Category**: SSRF-01
- **Confidence**: plausible
- **Reachability**: partially_reachable
- **Locations**:
  - `src/lib/validation/schemas.ts:91`
  - `src/lib/integrations/webhooks/service.ts:110`
  - `src/lib/integrations/webhooks/service.ts:149`

**Description**:

Webhook target URLs are validated at creation/update and again at dispatch time, but validation is lexical. The final `fetch()` uses default redirect behavior and does not bind dispatch to a resolved public IP.

**Root Cause**:

Dispatch validates only the original URL string before `fetch()`.
Root cause ID: `RC-ssrf-webhook-redirect`

**Attack Scenario**:

1. Create or modify a webhook subscription pointing to a public HTTPS attacker endpoint.
2. Have that endpoint redirect to a private/internal/metadata target, or use DNS rebinding.
3. Trigger webhook dispatch.

**Attack Path**:

1. Webhook subscription target passes `isPublicWebhookUrl`.
2. Dispatch revalidates the stored target URL.
3. `fetch(subscription.targetUrl)` follows redirects by default.

**Evidence**:

```ts
if (!isPublicWebhookUrl(subscription.targetUrl)) { ... }
const response = await fetch(subscription.targetUrl, { method: 'POST', ... });
```

**Sanitization Checkpoints**:

| Checkpoint                     | Type       | Bypassable? |
| ------------------------------ | ---------- | ----------- |
| `isPublicWebhookUrl()`         | validation | Yes         |
| dispatch-time URL revalidation | validation | Yes         |

**Impact**:

A compromised admin/integration-management path could make the server issue internal network requests. Direct response exposure is limited, but timing/status and response excerpts can support probing.

**Remediation**:

Set `redirect: 'manual'`; reject or revalidate every `Location` target. Resolve hostnames immediately before dispatch and reject private/reserved IPv4, IPv6, mapped IPv6, link-local, loopback, and metadata IP ranges. Consider an outbound allowlist for webhook domains.

**Validation Notes**:

Plausible static finding. Direct private URLs are blocked; redirect/DNS final-target validation is missing.

**Dedup Notes**:

Separate from the previously fixed direct-URL SSRF.

**Trace Notes**:

Requires admin-created webhook subscription plus authorized or scheduled dispatch.

---

### F-006: Fix Batched Outbox Dispatch State Machine

- **Severity**: Medium
- **Category**: LOGIC-01
- **Confidence**: confirmed
- **Reachability**: partially_reachable
- **Locations**:
  - `src/lib/integrations/webhooks/repository.ts:170`
  - `src/lib/integrations/webhooks/service.ts:290`
  - `src/app/api/v1/events/dispatch/route.ts:87`

**Description**:

Batch dispatch first marks events as `processing`, then calls `dispatchDomainEventById()`, which only claims events in `pending`, `partially_delivered`, or `failed`. Already-claimed `processing` events become `not_dispatchable` and are not delivered until recovery resets them.

**Root Cause**:

Double-claim flow between batch locking and single-event dispatch.
Root cause ID: `RC-logic-outbox-double-claim`

**Attack Scenario**:

1. Schedule or trigger batch dispatch.
2. `lockAndFetchDispatchableEvents()` marks events as `processing`.
3. `dispatchDomainEventById()` refuses those processing events.
4. Integrations are delayed until recovery.

**Attack Path**:

1. `/api/v1/events/dispatch` calls `dispatchPendingDomainEvents()`.
2. `lockAndFetchDispatchableEvents()` returns claimed rows.
3. `dispatchDomainEventById(event.id)` tries to claim the same row again.

**Evidence**:

```ts
const pendingEvents = await lockAndFetchDispatchableEvents(limit);
for (const event of pendingEvents) {
  results.push(await dispatchDomainEventById(event.id));
}
```

**Sanitization Checkpoints**:

| Checkpoint          | Type       | Bypassable? |
| ------------------- | ---------- | ----------- |
| processing recovery | validation | Yes         |

**Impact**:

Scheduled webhook dispatch can stall, delaying jurídico, mensalidade, associado, and ofício integrations.

**Remediation**:

Dispatch the already-returned claimed rows directly, or let a single-event dispatcher accept a `processing` row when it was claimed by the current batch.

**Validation Notes**:

Confirmed by state-machine trace.

**Dedup Notes**:

Independent from duplicate delivery/idempotency controls.

**Trace Notes**:

Reachable through cron bearer route and admin/operator event dispatch.

---

### F-007: Protect Monthly Payment Updates With Compare-And-Swap

- **Severity**: Medium
- **Category**: RACE-01
- **Confidence**: plausible
- **Reachability**: partially_reachable
- **Locations**:
  - `src/lib/finance/service.ts:117`
  - `src/lib/finance/service.ts:148`
  - `src/lib/finance/service.ts:227`

**Description**:

Monthly payment update checks `expectedUpdatedAt` before the upsert, but the final write does not include `updated_at` in the conflict/update predicate. Cancellation similarly checks status before an unconditional update.

**Root Cause**:

State preconditions are checked before write without a row lock or conditional write predicate.
Root cause ID: `RC-race-finance-monthly-payments`

**Attack Scenario**:

1. Two authorized finance users submit concurrent updates using the same observed timestamp.
2. Both pass the pre-write check.
3. Last writer wins while audit/events may reflect stale state.

**Attack Path**:

1. `updatePaymentAction()` sends payment state.
2. `updateMonthlyPayment()` reads current state.
3. Upsert writes without a compare-and-swap predicate.

**Evidence**:

```ts
if (currentUpdatedAt !== expectedUpdatedAt) throw new Error('CONCURRENCY_CONFLICT');
// later:
.onConflictDoUpdate({ target: [...], set: { status: payment.status, ... } })
```

**Sanitization Checkpoints**:

| Checkpoint                    | Type       | Bypassable? |
| ----------------------------- | ---------- | ----------- |
| `expectedUpdatedAt` pre-check | validation | Yes         |

**Impact**:

Authorized concurrent actions can overwrite mensalidade state, emit stale `monthly_payment.updated` events, or create duplicate cancellation history.

**Remediation**:

Use `SELECT ... FOR UPDATE` or conditional `UPDATE/UPSERT` predicates that include observed `updated_at`/status. Emit audit and domain events only after a successful conditional transition.

**Validation Notes**:

Plausible static finding; exploitability requires concurrent authorized actions.

**Dedup Notes**:

Separate from generic workflow races because financeiro has user-visible financial state and domain events.

**Trace Notes**:

Requires `admin` or `diretoria` access.

---

### F-008: Complete PII Encryption by Removing Plaintext Canonical Storage

- **Severity**: Medium
- **Category**: CRYPTO-01
- **Confidence**: confirmed
- **Reachability**: partially_reachable
- **Locations**:
  - `src/lib/associates/service.ts:221`
  - `src/lib/associates/service.ts:227`
  - `src/lib/associates/service.ts:238`
  - `src/lib/db/schema/associates.ts:32`
  - `src/lib/reports/queries.ts:65`

**Description**:

Sensitive associado fields are encrypted into parallel ciphertext/hash columns, but plaintext columns are still written and queried. Backfill behavior is additive rather than migration to ciphertext-only storage.

**Root Cause**:

The encryption-at-rest migration preserved plaintext as canonical application storage.
Root cause ID: `RC-crypto-pii-plaintext-columns`

**Attack Scenario**:

1. Obtain a database dump, overly broad service-role access, or accidental plaintext query result.
2. Read CPF, SIAPE, email, phone, WhatsApp, or address directly from plaintext columns.
3. Bypass the intended benefit of encryption-at-rest.

**Attack Path**:

1. `updateAssociateData()` writes plaintext and ciphertext.
2. `associates` schema retains plaintext sensitive columns.
3. reports and list/profile paths still select plaintext in some places.

**Evidence**:

```ts
cpf: input.cpf,
cpfCiphertext: input.cpf != null ? encryptPii(input.cpf) : null,
primaryEmail: input.primaryEmail,
primaryEmailCiphertext: input.primaryEmail != null ? encryptPii(input.primaryEmail) : null,
```

**Sanitization Checkpoints**:

| Checkpoint             | Type       | Bypassable? |
| ---------------------- | ---------- | ----------- |
| role-based DTO masking | sanitize   | Yes         |
| ciphertext columns     | encryption | Yes         |

**Impact**:

LGPD-sensitive data remains exposed to database-level compromise despite the presence of encryption columns.

**Remediation**:

If encryption-at-rest is a production requirement, stop writing plaintext for sensitive fields, migrate reads to decrypt ciphertext, clear legacy plaintext after verification, and keep blind indexes for lookup.

**Validation Notes**:

Confirmed by schema and write-path inspection. This is a data-at-rest risk, not an HTTP-only exposure.

**Dedup Notes**:

Separate from F-002 because this is storage architecture rather than UI disclosure.

**Trace Notes**:

Partially reachable through database-level access or compromised service-role credentials.

---

### F-009: Enforce Must-Change-Password at the Central Auth Guard

- **Severity**: Low
- **Category**: AUTH-03
- **Confidence**: plausible
- **Reachability**: partially_reachable
- **Locations**:
  - `src/lib/auth/require-auth.ts:13`
  - `src/app/app/config/usuarios/actions.ts:111`
  - `src/lib/supabase/admin.ts:132`

**Description**:

`requireAuth()` returns users with `mustChangePassword=true` rather than enforcing the password-change flow. If a user already has a valid session during a reset, protected routes can continue accepting the session unless Supabase session revocation happens elsewhere.

**Root Cause**:

The mandatory password-change state is exposed to callers but not enforced in the central guard.
Root cause ID: `RC-auth-must-change-password`

**Attack Scenario**:

1. Admin resets a user's password and marks `mustChangePassword`.
2. The target user still has an active session.
3. The target user continues navigating protected routes.

**Attack Path**:

1. Password reset updates local admin state.
2. `requireAuth()` validates active user.
3. No redirect to `/change-password` occurs.

**Evidence**:

```ts
return {
  userId: admin.id,
  // ...
  mustChangePassword: admin.mustChangePassword,
};
```

**Sanitization Checkpoints**:

| Checkpoint             | Type       | Bypassable? |
| ---------------------- | ---------- | ----------- |
| caller-level UI checks | validation | Yes         |

**Impact**:

Weakens the forced password-change policy after reset. Impact depends on existing active-session handling in Supabase.

**Remediation**:

Redirect `mustChangePassword` users to `/change-password` from a central guard, except when already on the change-password route. Consider global session revocation on reset.

**Validation Notes**:

Plausible. Kept as Low because exploitability depends on existing session state.

---

### F-010: Add Per-Key Signing Secrets for Scoped Integration Keys

- **Severity**: Low
- **Category**: CONFIG-01
- **Confidence**: plausible
- **Reachability**: partially_reachable
- **Tracking**: https://github.com/prof-ramos/intranet/issues/71
- **Locations**:
  - `src/lib/integrations/auth.ts:178`
  - `src/lib/integrations/auth.ts:228`
  - `src/lib/integrations/keys/service.ts`

**Description**:

Table-backed integration keys are individually scoped, but signatures for all keys use the global `ASOF_INTEGRATION_HMAC_SECRET`. This weakens per-client isolation and rotation boundaries.

**Root Cause**:

Per-key records store key hashes and scopes, but not per-key signing material.
Root cause ID: `RC-config-shared-integration-hmac`

**Attack Scenario**:

1. One integration client's signing secret is compromised.
2. The shared HMAC secret remains valid for signing requests across table-backed key flows.
3. Key rotation does not isolate signing-secret compromise per client.

**Attack Path**:

1. Incoming request identifies an API key.
2. `signIntegrationRequest()` validates with global `config.hmacSecret`.
3. Scope checks happen after shared-signature validation.

**Evidence**:

```ts
const expectedSignature = signIntegrationRequest(signaturePayload, config.hmacSecret);
```

**Sanitization Checkpoints**:

| Checkpoint          | Type       | Bypassable? |
| ------------------- | ---------- | ----------- |
| per-key scope check | validation | No          |

**Impact**:

Compromise of the shared HMAC secret affects all scoped table-backed integration keys.

**Remediation**:

Generate per-key signing secrets, store them encrypted or hashed as appropriate, verify signatures with the matched key's secret, and retire the unrestricted env-var key path.

**Validation Notes**:

Plausible configuration/design weakness; no direct key disclosure was found.

---

### F-011: Bound Ofício Input Size Before PDF Generation

- **Severity**: Low
- **Category**: FS-01
- **Confidence**: possible
- **Reachability**: partially_reachable
- **Locations**:
  - `src/lib/oficios/validations.ts:12`
  - `src/lib/oficios/pdf.ts:93`
  - `src/app/api/oficios/[id]/download/route.ts`

**Description**:

Ofício validation requires text but does not enforce maximum sizes for rich text, plain text, subject, recipient, or related fields. PDF generation runs synchronously in the request path.

**Root Cause**:

PDF generation accepts unbounded persisted text.
Root cause ID: `RC-fileio-oficio-pdf-size`

**Attack Scenario**:

1. Authenticated staff saves an ofício with extremely large content.
2. An authorized user requests the PDF download.
3. The server spends excessive CPU/memory wrapping text and serializing PDF output.

**Attack Path**:

1. `saveOfficialLetterAction()` validates non-empty content.
2. DB stores large fields.
3. `generateOfficialLetterPdf()` processes the content on demand.

**Evidence**:

```ts
bodyRichText: z.string().min(1).refine(htmlHasText);
bodyPlainText: z.string().trim().min(1);
```

**Sanitization Checkpoints**:

| Checkpoint               | Type       | Bypassable? |
| ------------------------ | ---------- | ----------- |
| required text validation | validation | Yes         |

**Impact**:

Authenticated users could degrade the ofício PDF route or serverless function availability.

**Remediation**:

Add server-side max lengths to ofício fields and a hard PDF input byte/character cap before PDF creation.

**Validation Notes**:

Possible. No load reproduction was performed.

---

### F-012: Canonicalize Stored Rich-Text HTML for Ofícios

- **Severity**: Low
- **Category**: XSS-02
- **Confidence**: possible
- **Reachability**: partially_reachable
- **Locations**:
  - `src/app/app/secretaria/oficios/actions.ts:48`
  - `src/lib/oficios/validations.ts:24`
  - `src/app/app/secretaria/oficios/_components/OficioForm.tsx:199`

**Description**:

`bodyRichText` is stored as HTML with only non-empty text validation. Current sinks appear partially mitigated because TipTap parses content into its schema and PDF generation strips tags, but the database stores non-canonical HTML that future renderers could misuse.

**Root Cause**:

No server-side allowlist canonicalization for persisted rich text.
Root cause ID: `RC-xss-oficio-richtext-canonicalization`

**Attack Scenario**:

1. Authenticated staff submits crafted HTML through the Server Action.
2. The HTML persists in `oficios.bodyRichText`.
3. A future or alternate renderer displays it unsafely.

**Attack Path**:

1. hidden `bodyRichText` form field.
2. `officialLetterFormSchema` checks only visible text.
3. stored HTML is reloaded into editor/PDF flows.

**Evidence**:

```ts
bodyRichText: z.string().min(1).refine(htmlHasText);
```

**Sanitization Checkpoints**:

| Checkpoint            | Type     | Bypassable?     |
| --------------------- | -------- | --------------- |
| TipTap schema parsing | sanitize | Partially       |
| PDF tag stripping     | sanitize | No for PDF sink |

**Impact**:

Latent stored XSS risk if ofício HTML is later rendered outside the editor or with broader TipTap extensions.

**Remediation**:

Canonicalize server-side with a strict allowlist matching enabled TipTap nodes/marks, or store validated TipTap JSON instead of raw HTML.

**Validation Notes**:

Possible only. Current observed sinks reduce direct exploitability.

---

### F-013: Serialize Workflow Status Side Effects

- **Severity**: Low
- **Category**: RACE-01
- **Confidence**: plausible
- **Reachability**: partially_reachable
- **Locations**:
  - `src/lib/activities/service.ts:130`
  - `src/lib/activities/repository.ts:145`
  - `src/lib/juridico/service.ts:159`

**Description**:

Atividade and consulta jurídica status updates derive side effects from pre-update reads. Concurrent completions/status changes can duplicate notifications or emit events with stale previous status while the final DB row reflects only the last writer.

**Root Cause**:

Read-decide-update side effects are not protected by row locks or atomic transition predicates.
Root cause ID: `RC-race-workflow-status-side-effects`

**Attack Scenario**:

1. Two authorized staff users update the same activity/consulta nearly simultaneously.
2. Both compute side effects from stale state.
3. Audit, notification, or domain event history diverges from final state.

**Attack Path**:

1. action calls service.
2. service reads current row.
3. update and side effects occur without a transition predicate.

**Evidence**:

```ts
const current = await findActivityById(input.id);
// ...
const updated = await updateActivityById(input.id, { ... });
```

**Sanitization Checkpoints**:

| Checkpoint             | Type       | Bypassable? |
| ---------------------- | ---------- | ----------- |
| status enum validation | validation | No          |

**Impact**:

Workflow history and notifications can become misleading during concurrent operations.

**Remediation**:

Wrap read/update/audit/event in one transaction and use row locks or conditional updates such as `WHERE id = ? AND status = old_status`.

**Validation Notes**:

Plausible and lower-impact than financial state races.

---

### F-014: Add a Dedicated Scope for Health API Metadata

- **Severity**: Info
- **Category**: AUTH-02
- **Confidence**: possible
- **Reachability**: reachable
- **Locations**:
  - `src/app/api/v1/health/route.ts`
  - `src/lib/integrations/auth.ts`

**Description**:

Any valid table-backed integration key can call `/api/v1/health` because the route does not require scopes. This may be intentional and the returned metadata appears low sensitivity.

**Root Cause**:

No dedicated `health:read` or similar scope exists.
Root cause ID: `RC-auth-health-scope`

**Attack Scenario**:

1. Use a valid low-privilege integration key.
2. Call `/api/v1/health`.
3. Learn service/capability metadata.

**Attack Path**:

1. health route calls `authorizeIntegrationRequest()`.
2. no `requiredScopes` are supplied.
3. any active table-backed key passes authentication.

**Evidence**:

```ts
authorizeIntegrationRequest(request, { allowSessionRoles: ['admin', 'diretoria'] });
```

**Sanitization Checkpoints**:

| Checkpoint          | Type       | Bypassable? |
| ------------------- | ---------- | ----------- |
| active API key auth | validation | No          |

**Impact**:

Minimal information disclosure. Keep as hardening unless health metadata expands.

**Remediation**:

Add a dedicated scope if the route should be restricted to monitoring/operator clients.

**Validation Notes**:

Demoted to Info because behavior may be intentional and impact is low.

---

## Defense-in-Depth Issues

- Prompt injection can steer AI-generated ofício text. Current impact is limited by authentication, feature flag, and human-in-the-loop review. Consider positive policy checks and blocking high-risk output classes.
- Direct webhook localhost/private URL SSRF appears fixed by creation/update and dispatch-time `isPublicWebhookUrl()` checks; the remaining SSRF issue is redirect/DNS final-target validation.
- API key HMAC design is operationally weaker than per-key secrets but no hardcoded production secret was found.
- Must-change-password enforcement should move to the central guard even if Supabase session behavior currently mitigates part of the risk.

## False Positives Ruled Out

- SQL injection in associados, jurídico, mensalidades, and audit search: Drizzle templates are used and LIKE wildcards are escaped where needed.
- Command injection: no reachable `exec`, `spawn`, `eval`, or dynamic code execution sink was found in request paths.
- Path traversal in ofício PDF download: route accepts a positive integer ID and generates PDF from DB content; it does not read caller-controlled filesystem paths.
- CSV formula injection in relatório de associados: CSV cells prefix dangerous leading characters with a tab.
- Plaintext webhook secrets: current code rejects secrets without encrypted `enc:v1:` or `enc:v2:` formats.
- `SKIP_AUTH=true` in `.env.example`: runtime disables skip-auth when `NODE_ENV=production`.
- Notification dedupe races: notification dedupe uses a partial unique key and `onConflictDoNothing`.
- Integration API rate limiter and generic IP limiter: both use atomic unique-key patterns.
- Legal consultation internal-number race: unique constraint plus retry logic mitigates duplicate-number collisions.

## Coverage Gaps

- No live exploit payloads were executed against a running local app; validation is primarily static plus targeted command checks.
- No production environment variables, Vercel project settings, Supabase RLS runtime claims, or deployed logs were inspected in this pass.
- Browser-level CSP/security headers were not validated live.
- Dependency audit was limited to `npm audit --json`, which returned zero known vulnerabilities for the installed dependency graph.
