<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# API Routes

## Purpose

Next.js route handlers for authenticated downloads, versioned integration APIs, cron jobs and external webhooks.

## Key Areas

| Directory | Purpose |
|---|---|
| `oficios/[id]/download/` | Authorized PDF download for an oficio |
| `v1/cron/` | Secret-protected scheduled maintenance, Gmail watch, LGPD retention and overdue-payment jobs |
| `v1/email-triage/process/` | Controlled email-triage processing endpoint |
| `v1/events/` | Authenticated domain-event ingestion, routing and dispatch |
| `v1/gmail-webhook/` | Gmail push notification receiver |
| `v1/health/` | Operational health endpoint with intentionally limited disclosure |
| `v1/juridico/sla-warnings/` | Legal SLA warning job |
| `webhooks/assinafy/` | Assinafy signature webhook receiver |

## For AI Agents

### Working In This Directory

- Treat every handler as an external trust boundary. Use the established cron secret, M2M verification or provider-signature validation before business logic.
- Keep replay prevention, rate limiting and idempotency intact. Assinafy processing and event dispatch must preserve transactional guarantees.
- Never include PII, credentials or internal exception details in logs or HTTP responses.
- Keep Node runtime requirements explicit for handlers using database, crypto or PDF libraries.

### Testing Requirements

- Run the colocated `route.test.ts` for any changed handler.
- For integration-auth changes, also run focused tests in `src/lib/integrations/`.
- Exercise externally visible workflow changes with the relevant E2E or integration suite.

### Common Patterns

- Validate request input before invoking domain services.
- Return stable JSON error shapes and deliberate status codes.
- Delegate data access and business rules to `src/lib/`; route files remain transport adapters.

## Dependencies

- `src/lib/auth/` — user/session authorization
- `src/lib/integrations/` — M2M authentication, replay protection and webhook infrastructure
- `src/lib/cron/` — cron request verification
- `src/lib/oficios/`, `src/lib/juridico/`, `src/lib/email-triage/` — domain services

<!-- MANUAL: -->
