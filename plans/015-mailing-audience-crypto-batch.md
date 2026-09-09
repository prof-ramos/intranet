# Plan 015: Stop decrypt/re-encrypt and per-recipient campaign reads on mailing send

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/mailing/queries.ts src/lib/mailing/service.ts src/app/app/mala-direta`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `4ed4727`, 2026-09-08
- **Issue**: https://github.com/prof-ramos/intranet/issues/480

## Why this matters

Mailing campaigns cap at `MAILING_MAX_RECIPIENTS` (2000). Create path: `fetchAudience` decrypts each primary email, then `insertCampaignWithRecipients` **re-encrypts** (`service.ts:108-112`). Send path: for every pending recipient, `getCampaignById` is called again (`service.ts:238-247`) and snapshot email is decrypted. Campaign detail (`listCampaignRecipients`) decrypts every recipient email with no pagination. For ~763 oficiais this is already wasted work; at the cap it is 2k decrypt + 2k encrypt before insert, plus N extra SELECTs per send batch. Persist the associate ciphertext as-is; read campaign status once per batch; do not decrypt the full recipient list on the detail page unless the UI actually shows addresses.

## Current state

- `src/lib/mailing/queries.ts:76-99` — `fetchAudience` selects `primaryEmail` + `primaryEmailCiphertext`, maps `email: decryptPiiField(...)`.
- `src/lib/mailing/service.ts:104-112` — `emailCiphertext: member.email ? encryptPii(member.email) : null`.
- `src/lib/mailing/service.ts:238-247` — inside `for (const recipient of pending)`, `getCampaignById` then decrypt snapshot.
- `src/lib/mailing/queries.ts:248-273` — `listCampaignRecipients` decrypts every row.
- `src/app/app/mala-direta/[id]/page.tsx` — uses that list (confirm which fields render).

**Conventions**

- Never log emails (`toSafeErrorLog`, no PII in mailing logs — already stated in `processMailingBatch` comment).
- `encryptPii` / `decryptPii` / `decryptPiiField` from `@/lib/crypto/pii`.
- Mailjet skip when keys/sender missing (`service.ts:206-213`) — do not change.
- Channel `etiquetas` may not need emails; do not decrypt for that channel.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npx vitest run src/lib/mailing` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |

## Scope

**In scope**:
- `src/lib/mailing/queries.ts`
- `src/lib/mailing/service.ts`
- mailing tests (`src/lib/mailing/**/*.test.ts`)
- `src/app/app/mala-direta/[id]/page.tsx` only if it currently displays every email and you switch to status/name (keep emails behind an explicit small reveal **or** paginate — default: show name + status + lastError, not the mailbox, unless the page already shows it and product needs it; if the page shows emails, decrypt the current page only)

**Out of scope**:
- Mailjet sender / ADR 005 (plans 006–007).
- Changing `MAILING_MAX_RECIPIENTS`.
- Template renderer HTML.

## Git workflow

- Branch: `perf/issue-<N>-mailing-audience-crypto`
- Commit: `perf(mailing): persistir ciphertext do cadastro e ler campanha uma vez por lote`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Audience member carries ciphertext

Change `MailingAudienceMember` so create can persist `emailCiphertext` from `associates.primaryEmailCiphertext` (and plaintext only if ciphertext is null — legacy). **Do not** decrypt then `encryptPii` again.

`fetchAudience`: for channel `email`, select ciphertext (+ plaintext fallback column). Map `emailCiphertext: row.primaryEmailCiphertext ?? (row.primaryEmail ? encryptPii(row.primaryEmail) : null)` — encrypting legacy plaintext once at snapshot time is OK; decrypt+re-encrypt of ciphertext is not.

**Verify**: `rg encryptPii src/lib/mailing/service.ts` — not used in the `members.map` insert if ciphertext is already present.

### Step 2: Send loop

Hoist `getCampaignById` (or a `FOR UPDATE` of status) **outside** the per-recipient loop: once per campaign (or re-read only after a cancel could have happened — e.g. every N recipients, N≥50, or once before the loop plus a cheap status column). Default: once per `pending` batch; if a recipient is marked cancelled because status changed, break the batch.

Decrypt snapshot email **per send** is required to call Mailjet. That decrypt stays. Remove the extra campaign SELECT.

**Verify**: `rg getCampaignById src/lib/mailing/service.ts` is not inside `for (const recipient`.

### Step 3: Detail page

`listCampaignRecipients`: do not decrypt by default. Return `email: null` or omit. If the UI shows the address, add `?reveal=1` **or** decrypt only for `status === 'falhou'` rows. Simplest acceptable UI: name + status + lastError, no mailbox.

Update tests/page accordingly.

## Test plan

- `src/lib/mailing` tests: create campaign mocks assert insert uses the ciphertext from the associate row, `encryptPii` not called when ciphertext exists.
- `processMailingBatch`: `getCampaignById` call count is 1 per campaign per batch, not per recipient (spy).
- Pattern: existing mailing service tests (grep `insertCampaignWithRecipients`).

## Done criteria

- [ ] Create path does not decrypt-all then encrypt-all when ciphertext exists
- [ ] Send loop does not `getCampaignById` per recipient
- [ ] Detail list does not decrypt every email unless the UI truly displays them (and then document why)
- [ ] `npx vitest run src/lib/mailing` + lint + typecheck pass
- [ ] `plans/README.md` status row updated

## STOP conditions

- Recipients table stores only ciphertext and you cannot send because decrypt fails on old rows. Support plaintext fallback via `decryptPiiField(ciphertext, null)` as today; STOP if a large dual-format rewrite appears necessary.
- Campaign cancel race requires a per-row status lock you cannot implement without a new column. Keep one `SELECT status` per batch; do not go back to per-row campaign fetches.

## Maintenance notes

- Reviewer: watch cancel-during-send. Breaking the batch on `status !== 'em_envio'` is enough.
- Snapshot emails exist so later cadastro edits do not change a campaign in flight — copying ciphertext preserves that.
