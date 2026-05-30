# Controller ASOF — Email Triage Pipeline

## TL;DR

> **Quick Summary**: Port the Python email triage MVP (`scripts/email-triage/email_triage_mvp.py`) to TypeScript as a Next.js API Route on Vercel Cron, creating a self-contained `src/lib/email-triage/` module (Gmail API → Gemini 2.5 Flash → `email_triagens`), adding a seed-only `lawyers` Drizzle table, and implementing rule-based correlation to auto-create `legal_notes` on existing consultations — all with Vitest tests and no new UI.
>
> **Deliverables**:
> - `src/lib/email-triage/` module (gmail.ts, analyzer.ts, pipeline.ts, schema.ts)
> - `src/app/api/v1/email-triage/process/route.ts` (cron endpoint)
> - `src/lib/db/schema/lawyers.ts` (Drizzle schema + seed)
> - `scripts/email-triage/bootstrap-gmail-auth.ts` (OAuth bootstrap)
> - Env vars: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER`
> - `vercel.json` cron entry (`0 6 * * *`)
> - Vitest tests (unit + DB integration)
>
> **Estimated Effort**: Medium (10-14 tasks)
> **Parallel Execution**: YES — 3 waves (foundation → core → integration)
> **Critical Path**: Schema → gmail.ts → analyzer.ts → pipeline.ts → route.ts

---

## Context

### Original Request
Port the existing Python MVP email triage script (`scripts/email-triage/email_triage_mvp.py`) to TypeScript as a Next.js API Route on Vercel, create the missing Drizzle tables (`lawyers`), integrate with the existing juridico module (auto-create legal_notes for correlated consultations), and set up Vercel Cron scheduling — all with full test coverage.

### Interview Summary
**Key Discussions**:
- **Provider**: Google Workspace / Gmail confirmed
- **Deployment**: Next.js API Route on Vercel (not standalone script)
- **Auth**: OAuth with Refresh Token (one-time interactive bootstrap)
- **Tests**: Vitest (project standard) — unit + DB integration
- **Scope**: Pipeline + tables only. No new UI this sprint.
- **Correlation**: Rule-based (threadId, sender, categoria). Do NOT auto-create consultations.
- **`legal_deadlines` table**: Deferred to next sprint. Reuse `email_triagens.prazo_data`.
- **`lawyers` table**: Minimal seed-only reference. No CRUD, no UI.
- **Gmail API**: Use raw `fetch()` (avoid `googleapis` cold-start overhead)
- **System prompt**: Embed as constant (Vercel can't read files at runtime reliably)
- **Cron schedule**: `0 6 * * *` (daily, matches existing pattern)
- **Error handling**: Simple like MVP — try each email, log, continue. No retry/pubsub.

**Research Findings**:
- Python MVP (609 lines) at `scripts/email-triage/email_triage_mvp.py` — complete pipeline: Gmail API → Gemini → `email_triagens`
- `email_triagens` Drizzle schema already exists (187 lines, enums, indexes, checks)
- `@google/genai` SDK already a dependency; `src/lib/ai/gemini.ts` uses `gemini-2.5-flash`
- `authorizeCronRequest()` pattern exists at `src/lib/cron/auth.ts`
- 3 existing crons in `vercel.json` at daily schedules
- `insertNote()` in `src/lib/juridico/repository.ts` requires: entityType, entityId, content, createdBy, isEscritorioResponse

### Metis Review
**Identified Gaps** (all addressed):
- **Gmail OAuth bootstrap**: Created bootstrap script task (prerequisite for env vars)
- **System admin for createdBy**: Added task to verify/seed system admin in DB
- **Correlation engine scope**: Locked to rule-based only, no ML, no auto-consultation
- **`legal_deadlines`**: Excluded from sprint. Reuse `email_triagens.prazo_data`.
- **Module over-engineering**: Capped at 4 files (gmail, analyzer, pipeline, schema)
- **Cold-start**: Use raw `fetch()` for Gmail API, not `googleapis`

---

## Work Objectives

### Core Objective
> **Pipeline de ingestão de e-mails (Gmail API → Gemini → `email_triagens`) adaptando o módulo jurídico existente para correlação, sem nova UI nesta sprint.**

### Concrete Deliverables
- `src/lib/email-triage/schema.ts` — TypeScript types (mirroring `schema.py` Pydantic models)
- `src/lib/email-triage/gmail.ts` — Gmail API client (OAuth refresh, fetch unread, labels)
- `src/lib/email-triage/analyzer.ts` — PII redaction, Gemini structured output call, response validation
- `src/lib/email-triage/pipeline.ts` — Orchestrator: fetch → analyze → persist → label → summary
- `src/lib/email-triage/index.ts` — Barrel export
- `src/app/api/v1/email-triage/process/route.ts` — Cron endpoint with authorizeCronRequest
- `src/lib/db/schema/lawyers.ts` — Drizzle schema for lawyers table
- `src/lib/db/schema/index.ts` — Add lawyers export
- `src/lib/env.ts` — Add GMAIL_* env vars to schema
- `scripts/email-triage/bootstrap-gmail-auth.ts` — One-time OAuth bootstrap script
- `vercel.json` — Add cron entry
- `src/lib/email-triage/__fixtures__/` — Test fixtures ported from Python
- `src/lib/email-triage/__tests__/` — Vitest unit + integration tests

### Definition of Done
- [ ] `curl -H "Authorization: Bearer $CRON_SECRET" https://.../api/v1/email-triage/process` returns `{ "processed": N, "errors": N }`
- [ ] `npm run test` passes (vitest)
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Processed emails have `asof-triaged` label in Gmail
- [ ] `email_triagens` table populated with analysis results
- [ ] `legal_notes` auto-created for matched consultations

### Must Have
- Gmail API fetch → Gemini analysis → DB persistence → Gmail labeling (full cycle)
- Cron endpoint protected by `authorizeCronRequest()`
- Idempotent upsert (`on conflict (message_id) do update`)
- PII redacted before Gemini (emails, CPFs, long numbers)
- PII redacted from logs (`sanitizePii()`)
- `createLogger('email-triage')` — no `console.log`
- Error per-email isolation (one failure doesn't crash the batch)
- Bootstrap script to obtain Gmail refresh token

### Must NOT Have (Guardrails)
- ❌ No `legal_deadlines` table (use `email_triagens.prazo_data`)
- ❌ No `follow_up_alerts` table
- ❌ No auto-creation of `legal_consultations` records
- ❌ No CRUD or UI for `lawyers` table
- ❌ No Gmail Watch / Pub/Sub
- ❌ No multi-mailbox support
- ❌ No retry queues / dead-letter topics

#### Scope Change (2026-05-30): UI added
- ✅ List page (`/app/email-triage`) — read-only view with filters for all roles
- ✅ Detail page (`/app/email-triage/[id]`) — full triagem detail with validation form
- ✅ Server actions — status update, observação, deadline edit (admin only)
- ✅ Notifications — admins notified when `exige_validacao_humana = true`
- ❌ No `googleapis` package dependency (use raw `fetch()`)
- ❌ No module explosion — max 4 files in `src/lib/email-triage/`

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest configured)
- **Automated tests**: Tests-after (implement then test)
- **Framework**: Vitest + `vitest.integration.config.ts` for DB tests

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.omo/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API endpoints**: Bash (curl) — Send requests, assert status + response body
- **Library modules**: Bash (bun REPL) — Import, call functions, compare output
- **DB schema**: Bash (node + psql) — Verify tables, columns, migration
- **Scripts**: Bash — Run scripts, check exit codes and output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — start immediately):
├── Task 1: Drizzle schema — lawyers table + seed
├── Task 2: Env schema — add GMAIL_* vars + system prompt constant
├── Task 3: Bootstrap script — Gmail OAuth
├── Task 4: Test fixtures — port from Python
└── Task 5: Pipeline types — schema.ts (port Pydantic models)

Wave 2 (Core modules — after Wave 1, MAX PARALLEL):
├── Task 6: Gmail client — gmail.ts (fetch, label, token refresh)
├── Task 7: Analyzer — analyzer.ts (redact, Gemini call, parse)
└── Task 8: Pipeline orchestrator — pipeline.ts (orchestrate + DB persist + label)

Wave 3 (Integration — after Wave 2):
├── Task 9: API route — process/route.ts (cron endpoint)
├── Task 10: Vercel config — vercel.json cron entry
├── Task 11: Unit tests — all modules
└── Task 12: Integration tests — DB upsert + rollback

Wave FINAL (After ALL tasks):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review
├── Task F3: Manual QA execution
└── Task F4: Scope fidelity check
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9 → Task 11/12 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 6 (Waves 1 & 2)
```

### Dependency Matrix
- **1-5**: - → 6-8, Wave 1
- **6**: 1, 2, 3, 5 → 8, Wave 2
- **7**: 2, 5 → 8, Wave 2
- **8**: 6, 7 → 9, 11, 12, Wave 2→3
- **9**: 8 → 11, 12, Wave 3
- **10**: 9 → Wave 3 (independent)
- **11**: 6, 7, 8, 9 → Wave 3
- **12**: 1, 6, 8 → Wave 3
- **F1-F4**: ALL → Final

### Agent Dispatch Summary
- **Wave 1**: 5 tasks — T1→`quick`, T2→`quick`, T3→`quick`, T4→`quick`, T5→`quick`
- **Wave 2**: 3 tasks — T6→`unspecified-high`, T7→`deep`, T8→`deep`
- **Wave 3**: 4 tasks — T9→`quick`, T10→`quick`, T11→`unspecified-high`, T12→`unspecified-high`
- **FINAL**: 4 tasks — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [ ] 1. **Drizzle schema — lawyers table + seed**

  **What to do**:
  - Create `src/lib/db/schema/lawyers.ts` with Drizzle schema for `lawyers` table:
    - `id`: serial primary key
    - `name`: text not null
    - `email`: text not null unique
    - `oab`: text (OAB registration number)
    - `firm`: text (law firm name)
    - `specialty`: text (legal specialty)
    - `status`: enum `lawyer_status` ('ativo', 'inativo'), default 'ativo'
    - `created_at`: timestamp with time zone, default now()
    - `updated_at`: timestamp with time zone, default now()
  - Export from `src/lib/db/schema/index.ts`
  - Run `npm run db:generate` to produce migration SQL
  - Create seed file (or script) with a few known law firms/contacts for testing

  **Must NOT do**:
  - No CRUD routes or pages
  - No UI of any kind
  - No relations to other tables in this sprint (add later as needed)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple schema creation following existing patterns (email-triage.ts, legal-consultations.ts)
  - **Skills**: none needed beyond default

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5)
  - **Blocks**: Tasks 6, 8, 12
  - **Blocked By**: None

  **References**:
  - `src/lib/db/schema/email-triage.ts` — Existing Drizzle schema pattern with enums, indexes, timestamps
  - `src/lib/db/schema/index.ts` — Barrel export (add lawyers export here)
  - `drizzle/postgres/` — Existing migration files for naming convention

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Schema creation and migration
    Tool: Bash
    Preconditions: PostgreSQL running locally
    Steps:
      1. Run `npm run db:generate`
      2. Verify migration SQL file created in `drizzle/postgres/`
      3. Run `npm run db:migrate` (local dev DB)
      4. Connect via psql: `\dt lawyers` — table exists
      5. `\d lawyers` — all columns present with correct types
    Expected Result: Table `lawyers` with all columns created, migration file generated
    Evidence: .omo/evidence/task-1-schema-created.txt

  Scenario: Seed data
    Tool: Bash
    Preconditions: Table exists
    Steps:
      1. Run seed script
      2. `psql -c "SELECT count(*) FROM lawyers"` → count > 0
    Expected Result: Seed data inserted successfully
    Evidence: .omo/evidence/task-1-seeded.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add lawyers table and seed data`
  - Files: `src/lib/db/schema/lawyers.ts`, `drizzle/postgres/000N_lawyers.sql`, seed script

- [ ] 2. **Env schema — add Gmail OAuth vars + system prompt constant**

  **What to do**:
  - Add to `src/lib/env.ts`:
    - `GMAIL_CLIENT_ID`: z.string().min(1)
    - `GMAIL_CLIENT_SECRET`: z.string().min(1)
    - `GMAIL_REFRESH_TOKEN`: z.string().min(1)
    - `GMAIL_USER`: z.string().email().default('controller@asof.org.br')
    - `GMAIL_MAX_EMAILS_PER_RUN`: z.coerce.number().int().positive().default(10)
  - Create `src/lib/email-triage/system-prompt.ts` with the full system prompt from `docs/email-controller/system-prompt-v1.md` as a default export string constant
  - Add `EMAIL_TRIAGE_VERSION = 'email-controller-mvp-v1'` constant

  **Must NOT do**:
  - Don't change existing env vars (add only, don't modify)
  - Don't load system prompt from file at runtime (embed as constant)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two simple file edits following existing patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5)
  - **Blocks**: Tasks 6, 7, 8
  - **Blocked By**: None

  **References**:
  - `src/lib/env.ts` — Existing env schema with optional/required patterns
  - `docs/email-controller/system-prompt-v1.md` — Source system prompt to embed
  - `src/lib/ai/gemini.ts` — Existing Gemini integration for pattern reference
  - `scripts/email-triage/email_triage_mvp.py:38` — `PROCESSING_VERSION` constant

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Env schema validation
    Tool: Bash
    Preconditions: Local env without new vars set
    Steps:
      1. Run `node -e "import('./src/lib/env.ts')"` (or tsx)
      2. Note: env validation should succeed or fail gracefully depending on NODE_ENV
      3. Actually: verify via tsc that the import works
    Expected Result: Env schema compiles without errors
    Evidence: .omo/evidence/task-2-env-valid.txt

  Scenario: System prompt embedded correctly
    Tool: Bash
    Steps:
      1. `grep -c "Você é um assistente especializado" src/lib/email-triage/system-prompt.ts`
    Expected Result: grep returns count > 0 (prompt content present)
    Evidence: .omo/evidence/task-2-prompt-embedded.txt
  ```

  **Commit**: YES
  - Message: `feat(env): add Gmail OAuth env vars and system prompt constant`

- [ ] 3. **Bootstrap script — Gmail OAuth**

  **What to do**:
  - Create `scripts/email-triage/bootstrap-gmail-auth.sh` (shell script) OR `scripts/email-triage/bootstrap-gmail-auth.js` that:
    1. Reads `GMAIL_CLIENT_ID` and `GMAIL_CLIENT_SECRET` from env or prompts user
    2. Opens browser for OAuth consent (scope: `https://www.googleapis.com/auth/gmail.modify`)
    3. Captures the authorization code
    4. Exchanges it for access + refresh token
    5. Outputs the refresh token to stdout with instructions to set as Vercel env var
  - Use Node.js built-in `http` module for the local redirect server (no external deps)
  - Document steps in script header comments

  **Must NOT do**:
  - Don't add npm dependencies (use built-in Node.js modules: http, crypto, https)
  - Don't store token on disk (output to stdout, user copies to Vercel)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single script using only Node.js built-in modules

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4, 5)
  - **Blocks**: Task 6 (needs refresh token flow documented)
  - **Blocked By**: None

  **References**:
  - `scripts/email-triage/email_triage_mvp.py:290-340` — Python OAuth flow reference (InstalledAppFlow)
  - `https://developers.google.com/gmail/api/auth/scopes` — Required scope: `gmail.modify`

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Script structure and output
    Tool: Bash
    Preconditions: Script exists
    Steps:
      1. Check script starts with `#!/usr/bin/env node`
      2. Check `node -c scripts/email-triage/bootstrap-gmail-auth.js` (syntax check)
    Expected Result: Script is syntactically valid Node.js
    Evidence: .omo/evidence/task-3-script-valid.txt

  Scenario: Help text
    Tool: Bash
    Preconditions: Script exists
    Steps:
      1. `node scripts/email-triage/bootstrap-gmail-auth.js --help`
    Expected Result: Usage instructions printed
    Evidence: .omo/evidence/task-3-help.txt
  ```

  **Commit**: YES
  - Message: `feat(scripts): add Gmail OAuth bootstrap script`

- [ ] 4. **Test fixtures — port from Python**

  **What to do**:
  - Create `src/lib/email-triage/__fixtures__/` directory
  - Port Python test fixtures from `scripts/email-triage/email_triage_mvp_test.py`:
    - `sample-message.json`: Full Gmail API message JSON (matching the Python `message` dict in `test_builds_hashes_and_model_input_without_full_body_key`)
    - `valid-triage-response.json`: Valid Gemini response matching `EmailTriageSchema` (porting `VALID_TRIAGE` dict)
    - `redaction-inputs.json`: Test cases for PII redaction (email, CPF, SIAPE patterns)
    - `multipart-email.eml` or `.json`: Sample multipart MIME message
    - `html-email.json`: Sample HTML-only email (matching `test_extracts_html_only_body_as_plain_text`)
  - Export all fixtures as typed constants for import in tests

  **Must NOT do**:
  - Don't create .eml files if JSON fixtures are sufficient (follow TS convention)
  - Don't add real PII — use test data

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Data porting task following existing pattern

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 5)
  - **Blocks**: Tasks 11, 12 (test files reference fixtures)
  - **Blocked By**: None

  **References**:
  - `scripts/email-triage/email_triage_mvp_test.py` — Python test fixtures to port
  - `scripts/email-triage/schema.py:VALID_TRIAGE` — Valid response fixture
  - `src/__mocks__/` — Existing test mock patterns in project

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Fixtures are valid JSON/TS
    Tool: Bash
    Steps:
      1. `node -e "JSON.parse(require('fs').readFileSync('src/lib/email-triage/__fixtures__/sample-message.json','utf8'))"`
      2. Repeat for all JSON fixtures
    Expected Result: All JSON files parse without error
    Evidence: .omo/evidence/task-4-fixtures-valid.txt
  ```

  **Commit**: YES (groups with Task 11, 12)
  - Message: `test(email-triage): add test fixtures`

- [ ] 5. **Pipeline types — schema.ts (port Pydantic models)**

  **What to do**:
  - Create `src/lib/email-triage/schema.ts` with TypeScript types/interfaces:
    - `AttachmentSummary`: filename, mimeType, sha256, size, textExcerpt
    - `EmailPayload`: messageId, threadId, historyId, receivedAt, sender, originalRecipient, subject, bodyHash, bodyExcerpt, analysisExcerpt, attachments
    - `SourceEvidence`: tipo, referencia, trecho (porting Pydantic `SourceEvidence`)
    - `EmailTriageResult`: All fields from `EmailTriageSchema` (categoria, resumo, ha_prazo, prazo_data, nivel_risco, confianca, etc.)
    - `TriageResponse`: raw AI response with parsed result + metadata
  - Include Zod schemas for runtime validation of Gemini responses
  - Match the Pydantic validation rules (source_evidence must not be empty, categoria=juridico implies exige_validacao_humana=true, etc.)
  - Export all types from index

  **Must NOT do**:
  - Don't rename fields from Python schema (keep snake_case for DB alignment)
  - Don't add business logic — these are data structures only

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Type porting task with clear existing schema

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3, 4)
  - **Blocks**: Tasks 6, 7, 8 (all modules depend on types)
  - **Blocked By**: None

  **References**:
  - `scripts/email-triage/schema.py` — Full Pydantic schema to port (EmailTriageSchema, SourceEvidence)
  - `src/lib/db/schema/email-triage.ts` — Existing Drizzle schema for field reference
  - `src/lib/validation/` — Existing Zod schema patterns in project

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Types compile correctly
    Tool: Bash
    Steps:
      1. Run `npx tsc --noEmit src/lib/email-triage/schema.ts`
    Expected Result: No type errors
    Evidence: .omo/evidence/task-5-types-compile.txt

  Scenario: Zod schema rejects invalid data
    Tool: Bash (tsx REPL)
    Steps:
      1. `node -e "const { parseTriageResponse } = require('./src/lib/email-triage/schema'); parseTriageResponse({})"`
      2. Should throw validation error
    Expected Result: Empty object rejected with Zod error
    Evidence: .omo/evidence/task-5-zod-validation.txt
  ```

  **Commit**: YES
  - Message: `feat(email-triage): add TypeScript types ported from Pydantic schema`

- [ ] 6. **Gmail client — gmail.ts**

  **What to do**:
  - Create `src/lib/email-triage/gmail.ts` with:
    - `getGmailAccessToken()`: Exchange refresh token for access token using Google OAuth token endpoint (raw `fetch()` to `https://oauth2.googleapis.com/token`)
    - `ensureLabel()`: Get or create `asof-triaged` label in Gmail
    - `fetchUnreadMessages()`: List messages matching query `to:controller@asof.org.br -label:asof-triaged`
    - `getMessage()`: Fetch full message by ID (including body parts, attachments)
    - `markAsTriaged()`: Add `asof-triaged` label to a processed message
    - `batchMarkAsTriaged()`: Batch label multiple messages
  - Use raw `fetch()` for all Gmail API calls (no googleapis dependency)
  - Gmail API base URL: `https://gmail.googleapis.com/gmail/v1/users/{userId}`
  - Use `GMAIL_USER` env var as userId (default: 'me' for the authorized account)
  - Handle 401 → refresh token expired error with clear message
  - Handle 429 rate limiting with exponential backoff
  - Responses typed using schemas from Task 5

  **Must NOT do**:
  - No `googleapis` npm package — use raw `fetch()`
  - No file-based token storage (all state from env vars)
  - No Pub/Sub watch setup
  - No WebSocket connections

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: External API integration with auth, retry, and error handling
  - **Skills**: none needed beyond default

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8 — but 8 depends on 6)
  - **Blocks**: Task 8 (pipeline needs gmail client)
  - **Blocked By**: Tasks 1 (schema), 2 (env vars), 3 (OAuth flow), 5 (types)

  **References**:
  - `scripts/email-triage/email_triage_mvp.py:290-440` — Python Gmail API client implementation
  - `https://developers.google.com/gmail/api/reference/rest/v1/users.messages/list` — Gmail API list messages
  - `https://developers.google.com/gmail/api/reference/rest/v1/users.messages/get` — Gmail API get message
  - `https://developers.google.com/gmail/api/reference/rest/v1/users.messages/modify` — Gmail API modify labels
  - `src/lib/cron/auth.ts` — Existing cron auth pattern for reference
  - `src/lib/logger.ts` — Use createLogger for all logging

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Token refresh
    Tool: Bash (tsx REPL)
    Preconditions: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN set in env
    Steps:
      1. Import getGmailAccessToken
      2. Call with valid env vars
    Expected Result: Returns valid access token string
    Evidence: .omo/evidence/task-6-token-refresh.txt

  Scenario: Module exports are correct
    Tool: Bash
    Steps:
      1. `npx tsx -e "import { fetchUnreadMessages } from './src/lib/email-triage/gmail'; console.log(typeof fetchUnreadMessages)"`
    Expected Result: fetchUnreadMessages is a function
    Evidence: .omo/evidence/task-6-exports.txt
  ```
  **Note**: QA with actual Gmail API requires valid refresh token. Unit test coverage will verify error handling paths.

  **Commit**: YES
  - Message: `feat(email-triage): add Gmail client`

- [ ] 7. **Analyzer — analyzer.ts (redact + Gemini call + parse)**

  **What to do**:
  - Create `src/lib/email-triage/analyzer.ts` with:
    - `redactExcerpt(text)`: PII redaction (emails, CPFs, long numbers ≥6 digits) — porting Python regex logic
    - `htmlToText(html)`: Convert HTML to plain text — porting Python logic (strip script/style tags, decode entities)
    - `buildModelInput(payload)`: Construct Gemini input from EmailPayload (body_excerpt + attachments text, NOT full body)
    - `buildPersistedExcerpt(bodyText)`: If body > 500 chars → "[short-body-redacted; sha256 stored]", else body text
    - `analyzeEmail(payload)`: Call Gemini 2.5 Flash with structured output (`responseMimeType: "application/json"`) using the system prompt, parse + validate response with Zod schema
    - `extractSourceEvidence(response)`: Extract source evidence references from Gemini response
  - Use `@google/genai` SDK (already installed) with the existing `getGeminiClient()` pattern
  - Use system prompt from Task 2 (`system-prompt.ts`)
  - Post-scan Gemini output for PII (defense-in-depth)
  - Handle Gemini errors: timeout, invalid JSON, schema validation failure

  **Must NOT do**:
  - Don't pass raw email body to Gemini (redact first)
  - Don't persist full email body (only excerpt + hash)
  - Don't accept Gemini output if it's invalid JSON or fails Zod validation
  - Don't call `googleapis` — only `@google/genai` for Gemini

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Gemini structured output integration with complex validation rules and PII handling
  - **Skills**: none needed beyond default

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 6)
  - **Blocks**: Task 8 (pipeline needs analyzer)
  - **Blocked By**: Tasks 2 (env vars + system prompt), 5 (types)

  **References**:
  - `scripts/email-triage/email_triage_mvp.py:45-290` — Python implementation of redact, html_to_text, build_model_input, build_persisted_excerpt, analyze_email
  - `scripts/email-triage/email_triage_mvp_test.py` — Python tests for redaction, excerpt building
  - `src/lib/ai/gemini.ts:148-170` — Existing Gemini generateContent pattern with `@google/genai`
  - `docs/email-controller/system-prompt-v1.md` — System prompt to embed
  - `scripts/email-triage/schema.py` — Pydantic schema for response structure
  - `src/lib/sanitize-pii.ts` — Project's PII sanitization patterns

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Redact CPF
    Tool: Bash (tsx REPL)
    Steps:
      1. Import redactExcerpt
      2. Call redactExcerpt("CPF 123.456.789-00")
      3. Assert output does not contain "123.456.789-00"
    Expected Result: CPF is redacted from output
    Evidence: .omo/evidence/task-7-redact-cpf.txt

  Scenario: Redact email
    Tool: Bash (tsx REPL)
    Steps:
      1. Call redactExcerpt("email pessoa@example.test")
    Expected Result: email address is redacted
    Evidence: .omo/evidence/task-7-redact-email.txt

  Scenario: Redact long number (SIAPE)
    Tool: Bash (tsx REPL)
    Steps:
      1. Call redactExcerpt("SIAPE 1234567")
    Expected Result: 1234567 is redacted
    Evidence: .omo/evidence/task-7-redact-siape.txt

  Scenario: Build persisted excerpt (short body)
    Tool: Bash (tsx REPL)
    Steps:
      1. Import buildPersistedExcerpt
      2. Call buildPersistedExcerpt("Mensagem curta")
    Expected Result: "[short-body-redacted; sha256 stored]"
    Evidence: .omo/evidence/task-7-persisted-short.txt

  Scenario: HTML to text conversion
    Tool: Bash (tsx REPL)
    Steps:
      1. Import htmlToText
      2. Call htmlToText("<p>Responder <strong>hoje</strong>.</p>")
    Expected Result: "Responder hoje."
    Evidence: .omo/evidence/task-7-html2text.txt
  ```

  **Commit**: YES
  - Message: `feat(email-triage): add analyzer (redact + Gemini)`

- [ ] 8. **Pipeline orchestrator — pipeline.ts**

  **What to do**:
  - Create `src/lib/email-triage/pipeline.ts` with:
    - `processEmail(payload)`: Full per-email pipeline:
      1. Fetch message via Gmail client (Task 6)
      2. Build model input via analyzer (Task 7)
      3. Call Gemini via analyzer
      4. Validate response with Zod schema
      5. Persist to `email_triagens` table (upsert on conflict message_id)
      6. Run correlation engine against existing consultations
      7. If correlated → create `legal_notes` via `insertNote()`
      8. Mark email with `asof-triaged` label in Gmail
    - `processBatch()`: Fetch unread messages → process each in parallel (with concurrency limit) → return summary `{ processed: N, errors: N, skipped: N }`
    - `summarizeResults(results)`: Generate structured summary string for logging
  - Before processing: verify a system bot user exists in the `users` table for `createdBy` in `insertNote()`. If none exists, create one with appropriate admin/secretaria role.
  - Correlation rules (rule-based only):
    - Same `threadId` matches existing consultation
    - Same sender email matches consultation author/party
    - Same category matches consultation category
  - Error isolation: one email failure doesn't crash the batch
  - Use `createLogger('email-triage')` for all logging
  - Use `sanitizePii()` for any logged PII
  - Concurrency limit: `Promise.allSettled` with a semaphore (max 3 concurrent)

  **Must NOT do**:
  - No auto-creation of consultations (only notes on existing ones)
  - No Pub/Sub or retry mechanism
  - No multi-mailbox support (single `GMAIL_USER`)
  - No cron logic here (cron goes in route.ts, Task 9)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Orchestrator coordinating 4 external systems (Gmail API, Gemini, DB, jurídico module)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Tasks 6, 7)
  - **Blocks**: Tasks 9, 11, 12
  - **Blocked By**: Tasks 6 (gmail client), 7 (analyzer), 1 (schema), 5 (types)

  **References**:
  - `scripts/email-triage/email_triage_mvp.py:442-500` — Python pipeline orchestrator (save/close case)
  - `scripts/email-triage/email_triage_mvp.py:502-570` — Main batch processing loop
  - `src/lib/juridico/repository.ts:insertNote()` — Note creation for correlated consultations
  - `src/lib/db/schema/email-triage.ts` — Drizzle schema for persistence
  - `src/lib/logger.ts` — Use createLogger for structured logging
  - `src/lib/cron/auth.ts` — authorizeCronRequest pattern reference

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Process an email end-to-end
    Tool: Bash (via Playwright or curl against running app)
    Preconditions: Gmail API credentials valid, DB migrated
    Steps:
      1. Call pipeline endpoint /api/v1/email-triage/process
      2. Check response: { "processed": N, "errors": 0 }
    Expected Result: Pipeline runs without errors
    Evidence: .omo/evidence/task-8-pipeline-run.txt

  Scenario: Error isolation (one bad email doesn't break batch)
    Tool: Bash (tsx REPL)
    Steps:
      1. Mock fetchUnreadMessages to return [validMessage, invalidMessage, validMessage]
      2. Call processBatch()
      3. Assert processed count is 2, error count is 1
    Expected Result: Batch continues after individual email failures
    Evidence: .omo/evidence/task-8-error-isolation.txt
  ```

  **Commit**: YES
  - Message: `feat(email-triage): add pipeline orchestrator`

- [ ] 9. **API route — process/route.ts (cron endpoint)**

  **What to do**:
  - Create `src/app/api/v1/email-triage/process/route.ts`:
    - `POST` handler protected by `authorizeCronRequest()` (matching existing pattern)
    - Calls `processBatch()` from pipeline.ts
    - Returns `{ processed: N, errors: N, skipped: N, duration: string }`
  - Pipeline runs synchronously in the handler (Vercel Hobby 60s timeout allows ~17s for 10 emails at 3 concurrent)
  - Log using `createLogger('email-triage')`

  **Must NOT do**:
  - No public GET endpoint
  - No auth bypass
  - No response caching
  - No request body processing beyond cron auth

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple cron endpoint following existing patterns (sla-warnings route)

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Task 8)
  - **Blocks**: Tasks 10, 11, 12
  - **Blocked By**: Task 8 (pipeline orchestrator)

  **References**:
  - `src/app/api/v1/juridico/sla-warnings/route.ts` — Existing cron route pattern
  - `src/lib/cron/auth.ts` — authorizeCronRequest function
  - `src/lib/logger.ts` — createLogger usage

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Cron endpoint rejects unauthorized requests
    Tool: Bash (curl)
    Steps:
      1. `curl -X POST http://localhost:3000/api/v1/email-triage/process`
      2. Assert status 401
    Expected Result: Returns 401 Unauthorized
    Evidence: .omo/evidence/task-9-unauthorized.txt

  Scenario: Cron endpoint accepts valid CRON_SECRET
    Tool: Bash (curl)
    Preconditions: CRON_SECRET env var set
    Steps:
      1. `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/v1/email-triage/process`
      2. Assert status 200
      3. Assert JSON body has `processed` field
    Expected Result: Returns 200 with pipeline results
    Evidence: .omo/evidence/task-9-authorized.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add email-triage/process cron endpoint`

- [ ] 10. **Vercel config — vercel.json cron entry**

  **What to do**:
  - Add to `vercel.json` `crons` array:
    ```json
    {
      "path": "/api/v1/email-triage/process",
      "schedule": "0 6 * * *"
    }
    ```
  - Match existing cron pattern (same schedule style as SLA warnings and event dispatch)

  **Must NOT do**:
  - Don't change existing cron entries
  - Don't change any other `vercel.json` sections
  - No UI changes

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line addition to existing config

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Task 9)
  - **Blocks**: None (leaf task)
  - **Blocked By**: Task 9 (route exists before scheduling it)

  **References**:
  - `vercel.json` — Existing crons array with `sla-warnings` and `dispatch` entries

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Cron entry added correctly
    Tool: Bash
    Steps:
      1. `node -e "const v = require('./vercel.json'); console.log(JSON.stringify(v.crons, null, 2))"`
      2. Verify email-triage entry exists with correct path and schedule
    Expected Result: Cron entry present with path "/api/v1/email-triage/process" and schedule "0 6 * * *"
    Evidence: .omo/evidence/task-10-cron-entry.txt
  ```

  **Commit**: YES
  - Message: `chore(vercel): add email-triage cron schedule`

- [ ] 11. **Unit tests — all modules**

  **What to do**:
  - Create `src/lib/email-triage/__tests__/` directory
  - Write Vitest tests for:
    - `schema.ts`: Zod schema validation — valid/invalid/missing fields
    - `gmail.ts`: Token refresh logic, message fetch (mocked `fetch()`), label management, error handling for 401/429
    - `analyzer.ts`: PII redaction patterns (CPF, email, SIAPE, long numbers), HTML-to-text conversion, buildModelInput edge cases, buildPersistedExcerpt behavior
    - `pipeline.ts`: ProcessEmail orchestration (mocked Gemini + Gmail + DB), error isolation in batch processing, correlation rule matching
    - `route.ts`: Auth check (with/without valid CRON_SECRET)

  **Must NOT do**:
  - Don't test against real Gmail API (mock `fetch()` globally)
  - Don't test against real Gemini (mock `@google/genai` SDK)
  - Don't test against real database (mocked DB or DB integration tests in Task 12)
  - Don't exceed existing test patterns in the project

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Test suite covering 5 modules with mocks and edge cases
  - **Skills**: none needed beyond default

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Tasks 6, 7, 8, 9)
  - **Blocks**: None (leaf task)
  - **Blocked By**: Tasks 6 (gmail.ts), 7 (analyzer.ts), 8 (pipeline.ts), 9 (route.ts)

  **References**:
  - `src/__tests__/` — Existing Vitest test patterns in project
  - `vitest.config.ts` — Vitest configuration
  - `scripts/email-triage/email_triage_mvp_test.py` — Python tests to port (PII redaction, model input building, HTML extraction)

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: All unit tests pass
    Tool: Bash
    Steps:
      1. `npm run test -- src/lib/email-triage/`
      2. Check exit code and summary
    Expected Result: All tests pass (exit code 0)
    Evidence: .omo/evidence/task-11-unit-tests-pass.txt

  Scenario: PII redaction tests
    Tool: Bash
    Steps:
      1. `npm run test -- src/lib/email-triage/ 2>&1 | grep -i "PII\|redact"`
    Expected Result: Redaction tests exist and pass
    Evidence: .omo/evidence/task-11-redact-tests.txt
  ```

  **Commit**: YES (groups with Task 12)
  - Message: `test(email-triage): add unit tests`

- [ ] 12. **Integration tests — DB upsert + rollback**

  **What to do**:
  - Create `src/lib/email-triage/__tests__/pipeline.integration.test.ts`
  - Test DB-level operations against PostgreSQL:
    - Upsert into `email_triagens` (insert new, update existing)
    - Verify all fields are persisted correctly
    - Test `on conflict (message_id) do update` behavior
    - Test constraint violations (null required fields, invalid enum values)
  - Use the project's integration test config (`vitest.integration.config.ts`)
  - Run within a DB transaction with rollback (clean state per test)

  **Must NOT do**:
  - Don't test against production database
  - Don't test with real Gmail or Gemini API calls
  - Don't create E2E-style tests (those go in Playwright, covered by Task 11 unit tests)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration tests against real PostgreSQL with transaction isolation
  - **Skills**: none needed beyond default

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (depends on Tasks 1, 8, 11)
  - **Blocks**: None (leaf task)
  - **Blocked By**: Tasks 1 (schema), 8 (pipeline), 11 (fixtures)

  **References**:
  - `vitest.integration.config.ts` — Integration test config
  - `src/lib/db/schema/email-triage.ts` — Target schema for DB tests
  - `src/__tests__/` — Existing integration test patterns

  **Acceptance Criteria**:

  **QA Scenarios**:
  ```
  Scenario: Upsert into email_triagens
    Tool: Bash
    Preconditions: Integration test database configured
    Steps:
      1. `npx vitest run --config vitest.integration.config.ts src/lib/email-triage/__tests__/pipeline.integration.test.ts`
      2. Check exit code and summary
    Expected Result: All integration tests pass
    Evidence: .omo/evidence/task-12-integration-tests-pass.txt
  ```

  **Commit**: YES (groups with Task 11)
  - Message: `test(email-triage): add integration tests`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .omo/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + lint + `npm run test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, `console.log` in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration. Test edge cases: empty state, invalid input, missing env vars. Save to `.omo/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy
- **T1**: `feat(db): add lawyers table and seed data`
- **T2**: `feat(env): add Gmail OAuth env vars and system prompt constant`
- **T3**: `feat(scripts): add Gmail OAuth bootstrap script`
- **T4**: `test(email-triage): add test fixtures`
- **T5**: `feat(email-triage): add TypeScript types ported from Pydantic schema`
- **T6**: `feat(email-triage): add Gmail client`
- **T7**: `feat(email-triage): add analyzer (redact + Gemini)`
- **T8**: `feat(email-triage): add pipeline orchestrator`
- **T9**: `feat(api): add email-triage/process cron endpoint`
- **T10**: `chore(vercel): add email-triage cron schedule`
- **T11**: `test(email-triage): add unit tests`
- **T12**: `test(email-triage): add integration tests`

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck          # Expected: no errors
npm run lint               # Expected: no errors
npm run test               # Expected: all tests pass
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/v1/email-triage/process"  # Expected: 200 + JSON summary
```

### Final Checklist
- [ ] All "Must Have" present and verified
- [ ] All "Must NOT Have" absent
- [ ] `npm run validate:quick` passes
- [ ] Pipeline end-to-end: fetch Gmail → analyze with Gemini → persist to DB → label in Gmail
- [ ] Bootstrap script produces valid refresh token
- [ ] Evidence files in `.omo/evidence/` for each task
