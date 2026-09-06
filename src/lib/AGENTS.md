<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-26 | Updated: 2026-09-01 -->

# lib

## Purpose

Domain library modules for business logic, data access, and DB schema. All modules follow service/repository/queries patterns. Authenticated intranet users have full operational PII visibility. Prefer ciphertext + hash storage for new write paths when supported; legacy/import plaintext is an accepted operational risk. Plaintext is never logged.

## Key Files

| File              | Description                                                                            |
| ----------------- | -------------------------------------------------------------------------------------- |
| `env.ts`          | Environment variable access and validation (with test)                                 |
| `error-log.ts`    | Error logging (with test)                                                              |
| `events.ts`       | Event system (with test)                                                               |
| `ip.ts`           | IP extraction (with test)                                                              |
| `logger.ts`       | Structured logger with PII redaction. Use `createLogger('module-name')` not console.\* |
| `rate-limit.ts`   | Rate limiting (with test)                                                              |
| `sanitize-pii.ts` | PII sanitization for audit logs (with test)                                            |

## Subdirectories

| Directory         | Purpose                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `activities/`     | Activity/kanban board — board-data, queries, repository, service, status, transformations, types                         |
| `ai/`             | Gemini AI via `@google/genai` — constants, gemini.ts, settings                                                           |
| `assinafy/`       | Cliente Assinafy, webhook handler, repository e política de transição                                                    |
| `assignments/`    | Lotação/postos                                                                                                           |
| `associates/`     | Associate management — lgpd, location-country, profile, repository, search-params, service                               |
| `audit/`          | Audit log queries and service                                                                                            |
| `auth/`           | Self-hosted auth — actions, authorization, config, login-rate-limit, password hashing, require-auth, session             |
| `cache/`          | Cache helpers                                                                                                            |
| `cron/`           | Cron utilities                                                                                                           |
| `crypto/`         | PII encryption — index, pii encryption, safe-compare                                                                     |
| `dashboard/`      | Dashboard queries and view models                                                                                        |
| `db/`             | Database connection and Drizzle schema (schema/ has 20+ schema files)                                                    |
| `email/`          | Email sending and templates                                                                                              |
| `email-triage/`   | Triagem de e-mail (Gmail + Gemini)                                                                                       |
| `errors/`         | Domain error hierarchy                                                                                                   |
| `etiquetas/`      | Geração de etiquetas                                                                                                     |
| `finance/`        | Financial/mensalidades — effective-payment, queries, repository, search-params, service                                  |
| `integrations/`   | Webhook and API key management — verify-request, sign-request, config, http, outbox, rate-limit, types, keys/, webhooks/ |
| `juridico/`       | Legal/juridico — consultas, opinions, processes, dashboard, queries, repository, service, sla, sla-notifications         |
| `lgpd/`           | LGPD compliance — retention policy                                                                                       |
| `mala-direta/`    | Export CSV Google Contacts (fase 1 mala direta)                                                                          |
| `notifications/`  | Notification repository and service                                                                                      |
| `oficios/`        | Oficio document generation — pdf, repository, service (`sendForSignature`), validations                                  |
| `reports/`        | Report generation — audit, csv, export-filters, policy, queries, service                                                 |
| `routing/`        | Route parameter parsing                                                                                                  |
| `search/`         | Global search queries                                                                                                    |
| `server-actions/` | Server action utilities                                                                                                  |
| `smoke/`          | Contratos e espera de deployment do smoke                                                                                |
| `ui/`             | UI tokens and role labels                                                                                                |
| `utils/`          | Date and string utilities                                                                                                |
| `validation/`     | Zod schemas for form validation                                                                                          |
| `webmcp/`         | Tools WebMCP da Secretaria (`document.modelContext`, catálogo por role/rota)                                             |

## For AI Agents

### Working In This Directory

- Use `createLogger('module-name')` for structured logging — never use console.\*
- All domain modules follow service/repository/queries pattern
- Use `db.transaction()` for multi-table writes
- Authenticated intranet users have full operational PII visibility; do not reintroduce role masking without a new product decision.
- Prefer ciphertext + hash storage for new write paths when supported; legacy/import plaintext is an accepted operational risk.
- Plaintext is never logged or printed.

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
- `@google/genai` — Gemini AI integration (in `ai/`)
