<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-09-04 | Updated: 2026-09-04 -->

# Configuração

## Purpose

Administrator-facing configuration for audit visibility, integrations, assignments and system users.

## Key Areas

| Directory | Purpose |
|---|---|
| `auditoria/` | Paginated audit-log view and formatting benchmark |
| `integracoes/api-keys/` | Integration API-key creation, rotation and revocation UI |
| `integracoes/ia/` | Gemini API-key settings |
| `integracoes/webhooks/` | Webhook subscription lifecycle |
| `lotacoes/` | Assignment/post management |
| `usuarios/` | Admin, diretoria and secretaria account management |

## For AI Agents

### Working In This Directory

- All pages and actions require admin authorization; hiding controls in the client is insufficient.
- Never return stored API keys, signing secrets or Gemini credentials after initial creation. Keep secret handling server-only.
- User and assignment changes must retain audit records and typed domain validation.
- Do not log form payloads because configuration forms may contain credentials or PII.

### Testing Requirements

- Run the colocated action test for the changed section.
- Run authorization tests when changing role gates.
- Run the relevant E2E spec for user, assignment or integration workflows.

### Common Patterns

- Server Actions are colocated with each settings page.
- Panels encapsulate mutation state and confirmation UI; repositories/services remain in `src/lib/`.

## Dependencies

- `src/lib/auth/` — admin role enforcement
- `src/lib/audit/` — audit queries and records
- `src/lib/assignments/` — assignment domain
- `src/lib/integrations/` and `src/lib/ai/` — secret-backed integration settings

<!-- MANUAL: -->
