<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-26 | Updated: 2026-05-26 -->

# lib

## Purpose
Domain library modules for business logic, data access, and DB schema. All modules follow service/repository/queries patterns. PII fields (cpf, siape, email, phone, address) stored as ciphertext + hash — plaintext never logged.

## Key Files

| File | Description |
|------|-------------|
| `env.ts` | Environment variable access and validation (with test) |
| `error-log.ts` | Error logging (with test) |
| `events.ts` | Event system (with test) |
| `ip.ts` | IP extraction (with test) |
| `logger.ts` | Structured logger with PII redaction. Use `createLogger('module-name')` not console.* |
| `rate-limit.ts` | Rate limiting (with test) |
| `sanitize-pii.ts` | PII sanitization for audit logs (with test) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `activities/` | Activity/kanban board — board-data, queries, repository, service, status, transformations, types |
| `ai/` | Gemini AI integration — constants, gemini.ts, settings |
| `associates/` | Associate management — lgpd, location-country, profile, repository, search-params, service |
| `audit/` | Audit log queries and service |
| `auth/` | Self-hosted auth — actions, authorization, config, login-rate-limit, password hashing, require-auth, session |
| `crypto/` | PII encryption — index, pii encryption, safe-compare |
| `dashboard/` | Dashboard queries and view models |
| `db/` | Database connection and Drizzle schema (schema/ has 20+ schema files) |
| `documents/` | Document storage queries and actions |
| `email/` | Email sending and templates |
| `finance/` | Financial/mensalidades — effective-payment, queries, repository, search-params, service |
| `integrations/` | Webhook and API key management — auth, config, http, outbox, rate-limit, types, keys/, webhooks/ |
| `juridico/` | Legal/juridico — consultas, opinions, processes, dashboard, queries, repository, service, sla, sla-notifications |
| `lgpd/` | LGPD compliance — retention policy |
| `notifications/` | Notification repository and service |
| `oficios/` | Oficio document generation — pdf, repository, service, validations |
| `reports/` | Report generation — audit, csv, export-filters, policy, queries, service |
| `routing/` | Route parameter parsing |
| `search/` | Global search queries |
| `server-actions/` | Server action utilities |
| `storage/` | File storage (future) |
| `ui/` | UI tokens and role labels |
| `utils/` | Date and string utilities |
| `validation/` | Zod schemas for form validation |

## For AI Agents

### Working In This Directory
- Use `createLogger('module-name')` for structured logging — never use console.*
- All domain modules follow service/repository/queries pattern
- Use `db.transaction()` for multi-table writes
- PII fields stored as ciphertext + hash; plaintext never logged or printed

### Testing Requirements
- `npm run test` runs Vitest unit tests
- `npm run test:db` validates schema contract

### Common Patterns
- Drizzle schema files in `db/schema/` — one schema file per domain
- Barrel exports via `index.ts` per subdirectory
- Zod schemas for form validation in `validation/`

## Dependencies

### Internal
- `../AGENTS.md` — Parent project documentation

### External
- `drizzle-orm` — Database ORM and schema
- `zod` — Schema validation
- `viem` / `ws` — Ethereum/wallet integrations (in `crypto/`)
- `@ai-sdk/gemini` — Gemini AI integration (in `ai/`)
