<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# Integrations

## Purpose

Infrastructure for authenticated machine-to-machine requests, API keys, replay prevention, outbound HTTP, transactional outbox and webhook delivery.

## Key Files

| File | Description |
|---|---|
| `verify-request.ts` | Dual env/table-backed API authentication, nonce verification and rate limiting |
| `auth.ts` | Integration authentication helpers |
| `rate-limit.ts` | PostgreSQL-backed integration rate limiting |
| `sign-request.ts` | Outbound request signing |
| `http.ts` | Hardened outbound HTTP transport and public-URL validation |
| `outbox.ts` | Transactional event outbox and dispatch |
| `webhook-handler.ts` | Shared inbound webhook handling |

## Subdirectories

| Directory | Purpose |
|---|---|
| `keys/` | API-key repository, service and signing-secret lifecycle |
| `webhooks/` | Subscription validation, secret management, concurrency, repository, service and transport |

## For AI Agents

### Working In This Directory

- Keep authentication dual-mode behavior, nonce replay protection and PostgreSQL-backed rate limits fail-closed.
- Validate outbound URLs against SSRF policy. Unit tests must mock `isPublicWebhookUrl`; do not depend on live DNS.
- Never expose stored key hashes, signing secrets or webhook secrets after creation.
- Preserve outbox transaction boundaries and idempotent delivery semantics.
- Use bounded timeouts, response-size limits and redacted structured logging for external HTTP.

### Testing Requirements

- Run focused unit tests for the changed module and its key/webhook submodule.
- Run outbox or webhook integration tests when transaction/concurrency behavior changes.
- Run API route tests under `src/app/api/v1/events/` for request-verification changes.

### Common Patterns

- Repositories own persistence; services enforce lifecycle rules; transports perform network I/O.
- Delivery fan-out records each result and tolerates partial external failures via settled outcomes.

## Dependencies

- `src/lib/db/schema/integrations.ts` — API keys, nonces, subscriptions, deliveries and outbox schema
- `src/lib/crypto/` — safe comparison and secret primitives
- `src/lib/events.ts` — domain event contracts

<!-- MANUAL: -->
