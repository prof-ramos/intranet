# Plan 019: Atividades como sistema institucional (comentários, labels, API, MCP)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 4ed4727..HEAD -- src/lib/activities src/app/app/atividades src/lib/db/schema/activities.ts src/lib/db/schema/integrations.ts src/lib/db/schema/audit.ts src/lib/integrations/keys src/app/api/v1 src/lib/webmcp`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0
- **Effort**: XL
- **Risk**: MED
- **Depends on**: none
- **Category**: feature
- **Planned at**: commit `f67d876`, 2026-09-10
- **Issue**: https://github.com/prof-ramos/intranet/issues/503
- **Spec canônico**: documento "Planejamento — Evolução do módulo de Atividades"
  (Partes I–VI: requisitos RF-01..10, RI-01..04, RA-01..06, RD-01..04,
  RS-01..07, RQ-01..04; decisões D-01..23; prioridades P0/P1/P2; fases F0..F7;
  critérios globais). Este plano é o mapa de execução do spec.

## Why this matters

O módulo Atividades já é um Kanban funcional (board, DnD, responsáveis,
prioridades, prazos, filtros, drawer, atualização otimista, timeline via
audit_logs, eventos de domínio no outbox, webhooks, notificações, testes).
Esta evolução o transforma em sistema institucional de gestão de tarefas da
ASOF: comentários, labels administráveis, timeline consolidada, camada de
domínio única, API programática com scopes e MCP para agentes — sem substituir
a arquitetura nem copiar o kanbn/kan (AGPL-3.0; usar apenas como referência).

## Current state (verificado em 2026-09-10)

- **Camada de domínio já consolidada**: `src/lib/activities/` tem `service.ts`
  (create/update com transação + outbox + auditoria best-effort + optimistic
  lock via `xmin`), `repository.ts`, `domain-events.ts` (eventos granulares),
  `status.ts`, `transformations.ts`, `queries.ts`, `types.ts`, `board-data.ts`.
  **Não existe `permissions.ts` nem `events.ts` próprios** — autorização vive
  nos `auth` arrays das Server Actions; eventos vivem em `domain-events.ts` +
  `src/lib/events.ts` (notificações in-app).
- **Timeline**: `listActivityTimeline` lê `audit_logs` (entity_type='activity')
  e o drawer renderiza via `getActivityTimelineAction`. Eventos de domínio
  granulares já existem no outbox: `activity.created`, `.status_changed`,
  `.assigned`, `.completed`, `.priority_changed`, `.due_date_changed`.
- **Tags**: `activities.tags` é `jsonb string[]` (área + tags livres,
  normalizadas minúsculas). **Não há labels estruturadas**.
- **API keys**: `integration_api_keys` com scopes `events:read`,
  `events:write`, `webhooks:manage`, `health:read`, `admin`; hash SHA-256,
  token exibido uma vez, rotação, revogação, `last_used_at`. Autenticação via
  `verify-request.ts` (dual: session OU api key + timestamp + HMAC + nonce).
  Rate limiting em `src/lib/integrations/rate-limit.ts` (tabela `rate_limits`).
- **API HTTP**: `/api/v1/*` existe (events, health, cron, mailing, juridico,
  email-triage). **Não há endpoints de atividades**.
- **WebMCP**: plano 018 (DONE) adicionou tools de navegação/ação
  (`open-activities`, `open-activity`, `start-create-activity`,
  `complete-activity`, `assign-activity`) em `src/lib/webmcp/catalog.ts`.
  **Não há servidor MCP externo** (issue #432 segue aberta).
- **Server Actions**: `src/app/app/atividades/actions.ts` —
  `createActivity`, `createQuickActivityAction`, `updateActivityAction`,
  `getActivityTimelineAction`, todas com `auth: ['admin','diretoria','secretaria']`.
- **Drawer**: `src/app/app/atividades/_board/Drawer.tsx` — dados, descrição,
  timeline; **sem comentários nem labels**.
- **Filtros**: `Filters` em `types.ts` (scope, query, assignee, priority,
  status, associate, dueWeek, dueLate, openOnly) + `url-state.ts` (URL).
- **Busca**: `idx_activities_title_trgm` (GIN trigram) no título; busca em
  descrição/comentários ainda não existe.
- **Auditoria**: `audit_logs` com `performedBy` (FK admins, nullable),
  `changes`, `metadata`; `logAuditAction` suporta executor explícito (estrito)
  e `logAuditBestEffort` (pós-commit). **Não há `actor_type`** — operações de
  API/MCP não são distinguíveis de humanas hoje (RF-10/D-23 exige isso).
- **Migrations**: 36 no `drizzle/postgres/` (última `0036_encrypt_secondary_email.sql`).
- **Testes**: 252 arquivos de teste; atividades tem unit (service, repository,
  domain-events, transformations, status, queries, board-data, actions,
  AtividadesBoard, url-state, useBoardPreferences, ReassignModal) + e2e
  `e2e/tests/atividades.spec.ts`.

## Decisões de arquitetura (do spec, confirmadas contra o código)

- **D-01..D-08, D-13..D-23**: sem Kan paralelo, sem fork, sem tRPC, sem Better
  Auth, sem Redis, sem microserviço; service layer compartilhada; REST em
  `/api/v1`; reutilizar API keys; MCP fino; sem exclusão física via MCP.
- **RA-03 (auditoria transacional)**: o repo adota auditoria **best-effort
  fora da tx** (ADR 018, decisão documentada; `logAuditAction` com executor
  explícito existe para casos estritos). **Decisão deste plano**: manter o
  padrão majoritário do repo (mutação + evento outbox atômicos; auditoria
  best-effort pós-commit) para os fluxos existentes; usar executor explícito
  (estrito) apenas onde o spec exigir garantia forte (ex.: comentários/labels
  podem usar estrito se não houver tradeoff de `aborted` tx — avaliar por caso).
  Registrar no PR a divergência consciente vs. RA-03.
- **RF-10/D-23 (actor_type)**: exige evolução de `audit_logs` — adicionar
  `actor_type` (`admin` | `api_key` | `system`) e `actor_api_key_id` (FK
  opcional) via migration aditiva. `performedBy` permanece para admins.
  Alternativa avaliada (metadata apenas) rejeitada: filtragem/consulta por
  ator automatizado ficaria frágil.

## Scope

**In scope** (por fase, ver abaixo): comentários, labels, timeline consolidada,
melhorias de UX do board, filtros ampliados, service layer consolidada, API de
atividades, scopes de API keys, MCP, auditoria, documentação, testes.

**Out of scope** (spec §17): substituir o módulo pelo Kan; rodar Kan como app
paralela; copiar componentes; workspaces genéricos, importação Trello, boards
públicos, signup; Better Auth, tRPC, Redis, microserviço, filas próprias,
Elasticsearch/Meilisearch/Typesense; exclusão física via MCP; reprodução
integral do Kan.

## Architecture

```
Usuário / Agente IA
   │
   ├── UI Next.js (Server Actions)
   └── API / MCP ──► Activity Service (src/lib/activities/service.ts)
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   Repository        Audit/Eventos      Notificações
        └─────────────────┼─────────────────┘
                          ▼
                      PostgreSQL
```

Princípio central (RA-01): UI, API e MCP chamam a **mesma camada de domínio**.
Nenhuma regra de negócio exclusiva no React, MCP, API ou Server Action.

## Fases (spec Parte IV)

### Fase 0 — Preparação
- [ ] Revisar schema/service/timeline atuais (feito acima — registrar no PR).
- [ ] Definir migrations aditivas (novas tabelas primeiro; nada destrutivo).
- [ ] Confirmar contratos das Server Actions (não quebrar `actions.ts`).
- [ ] Verificar licença AGPL do kanbn/kan: **não copiar código**; usar como
      referência funcional/UX apenas. Documentar em `docs/activities.md`.
- [ ] Consolidar contratos do Activity Service (P0.1): garantir que a UI
      atual opere exclusivamente sobre `service.ts` (sem regra de negócio
      duplicada em actions/componentes). Baseline de testes passando.

### Fase 1 — Comentários (P0.2)
- [ ] Migration: `activity_comments` (id, activity_id FK, author_admin_id FK,
      content text, created_at, updated_at, deleted_at) + índices.
- [ ] Schema Drizzle + tipos.
- [ ] Repository (`src/lib/activities/comments-repository.ts`): insert, update,
      soft-delete, list por activity (excluindo deleted).
- [ ] Service (`src/lib/activities/comments-service.ts`): `addComment`,
      `updateComment`, `deleteComment` — validação (tamanho, sanitização),
      autorização por papel, auditoria (`activity_comment_added/edited/deleted`),
      eventos de domínio (`activity.comment_added/edited/deleted` — adicionar
      tipos ao enum `domain_event_type`), transacional.
- [ ] Server Actions: `addCommentAction`, `updateCommentAction`,
      `deleteCommentAction` (auth admin/diretoria/secretaria).
- [ ] UI: seção Comentários no Drawer (lista, autor/data, editar, excluir).
- [ ] Testes: unit (service, repository, actions) + integração.
- [ ] Feature flag `ACTIVITY_COMMENTS_ENABLED` (env, default on após estável).

### Fase 2 — Labels (P0.3)
- [ ] Migration: `activity_labels` (id, name, slug unique, color_token,
      active, created_at) + `activity_label_assignments` (activity_id,
      label_id, created_at, created_by, PK composta) + índices.
- [ ] Schema Drizzle + tipos.
- [ ] Repository + Service: CRUD administrativo mínimo de labels (list, create,
      deactivate), `addLabelToActivity`, `removeLabelFromActivity`.
- [ ] Seed: labels institucionais (Jurídico, Diretoria, Financeiro, Secretaria,
      MRE, Assembleia, Associados, Urgente) — configuráveis, não hardcoded na UI.
- [ ] Eventos: `activity.label_added`, `activity.label_removed` (novos tipos no
      enum) + auditoria.
- [ ] UI: exibição nos cards, seleção no drawer, filtro por label.
- [ ] Filtros: `label` na URL (`/app/atividades?label=juridico`).
- [ ] Testes + feature flag `ACTIVITY_LABELS_ENABLED`.

### Fase 3 — Timeline consolidada (P0.4)
- [ ] Normalizar eventos: garantir que toda alteração relevante responda
      Quem? O quê? Quando? + valor anterior/novo quando aplicável.
- [ ] Estender `describeTimelineEntry` para cobrir comentários e labels.
- [ ] Considerar leitura consolidada (audit_logs + domain_events) sem duplicar
      armazenamento; manter `audit_logs` como fonte da timeline da UI.
- [ ] Testes.

### Fase 4 — UX do board (P1.1 + RI-01..03)
- [ ] Card compacto: título, responsável, prazo, prioridade, labels,
      indicador de comentários, indicador de atraso.
- [ ] Drawer consolidado: Dados, Descrição, Labels, Comentários, Histórico.
- [ ] Edição inline onde houver ganho real; feedback de persistência;
      atalhos de criação rápida; seleção rápida de labels.
- [ ] Estados de loading/erro, acessibilidade, mobile.
- [ ] Sem redesign estrutural da intranet.

### Fase 5 — API de Atividades (P0.5)
- [ ] `GET/POST /api/v1/activities`, `GET/PATCH /api/v1/activities/:id`,
      `POST /api/v1/activities/:id/complete`, `POST .../reopen`,
      `GET/POST /api/v1/activities/:id/comments`, `GET /api/v1/activity-labels`.
- [ ] Schemas Zod; autenticação via `verify-request` (api key + scopes);
      rate limiting; respostas padronizadas; documentação em API.md.
- [ ] **Mesma camada de domínio** — endpoints chamam `service.ts`.
- [ ] Testes de integração.

### Fase 6 — API Keys / Scopes (P0.6)
- [ ] Novos scopes: `activities:read`, `activities:write`, `activities:comment`
      em `VALID_SCOPES` (D-19: `activities:admin` só se surgir necessidade).
- [ ] Menor privilégio; token exibido uma vez (já é); hash persistido (já é);
      revogação (já é); `last_used_at` (já é); identificação da chave por
      operação (auditoria com `actor_type='api_key'` + `actor_api_key_id`).
- [ ] Rate limiting proporcional ao risco.

### Fase 7 — MCP (P0.7 + P1.4)
- [ ] Servidor MCP fino sobre a camada de domínio (sem duplicar regras).
- [ ] Tools P0: `activities_list`, `activity_get`, `activity_create`,
      `activity_update`, `activity_complete`, `activity_add_comment`.
- [ ] Tools P1: `activity_reopen`, `activity_list_labels`,
      `activity_add_label`, `activity_remove_label`.
- [ ] Fluxo de segurança: Agente → MCP → API Key → Scopes → Service → Auditoria.
- [ ] `actor_type = api_key` na auditoria; operações de agente distinguíveis
      das humanas (RF-10/D-23).
- [ ] Sem exclusão física via MCP (D-22); operações destrutivas futuras exigem
      controles adicionais.
- [ ] Feature flag `ACTIVITY_MCP_ENABLED`.

### Fase 8 — Hardening (P0.8 + F7)
- [ ] Revisar autorização, rate limits, logs (sem API keys/tokens/PII), PII,
      auditoria, testes de abuso, concorrência, idempotência, métricas,
      documentação operacional.
- [ ] Métricas: `activities.created`, `activities.completed`,
      `activities.reopened`, `activity_comments.created`,
      `activity_api.requests`, `activity_api.errors`, `activity_mcp.calls`,
      `activity_mcp.errors`.

## Migrations (estratégia — RA-05)

Aditivas, nesta ordem:
1. Novas tabelas (`activity_comments`, `activity_labels`,
   `activity_label_assignments`).
2. Índices.
3. Código compatível (novos services/actions; UI atrás de feature flag).
4. Ativar funcionalidades.
5. Migrar dados somente se necessário (ex.: tags → labels? **não** nesta fase —
   manter `tags` como está; labels são entidade nova).
6. Remover estruturas antigas apenas posteriormente.

Nunca combinar em uma migration: mudança estrutural crítica + migração
destrutiva + remoção de fallback.

## Rollback

- Banco: rollback lógico (manter tabelas sem uso, desativar UI, preservar dados).
- Aplicação: feature flags `ACTIVITY_COMMENTS_ENABLED`,
  `ACTIVITY_LABELS_ENABLED`, `ACTIVITY_MCP_ENABLED` durante estabilização.

## Testes (RQ-01/02)

- Unit: validações, transformações, autorização, estados, filtros.
- Integração: repository, service, API, eventos, comentários, labels.
- UI: DnD, drawer, filtros, comentários, labels, rollback otimista.
- MCP: por tool — sucesso, input inválido, não autenticado, scope insuficiente,
  entidade inexistente, conflito, erro interno.

## Observabilidade (P1.6)

Métricas: `activities.created`, `activities.completed`, `activities.reopened`,
`activity_comments.created`, `activity_api.requests`, `activity_api.errors`,
`activity_mcp.calls`, `activity_mcp.errors`.
Logs nunca expõem API keys, tokens, cookies, segredos ou PII desnecessária
(RS-06).

## Documentação (RQ-04)

Atualizar: `ARCHITECTURE.md`, `API.md`, `DATABASE.md`, `CONTEXT.md`,
`AGENTS.md`. Criar: `docs/activities.md`, `docs/mcp.md`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Unit | `npm run test` | all pass |
| Lint / types | `npm run lint` / `npm run typecheck` | exit 0 |
| Integração | `npm run test:integration` | all pass |
| Migrations | `npm run db:generate` + revisar SQL | novo arquivo em `drizzle/postgres/` |
| Build | `npm run build` | exit 0 |
| E2E | `npm run test:e2e` (se ambiente disponível) | all pass |

## STOP conditions

- Qualquer drift nos arquivos in-scope vs. "Current state" acima.
- Quebra de contrato das Server Actions existentes (UI atual deixa de funcionar).
- Mudança destrutiva de dados em migration.
- Necessidade de novo serviço externo (Redis, Elasticsearch, etc.) sem
  justificativa concreta.
- Cópia de código do kanbn/kan (AGPL-3.0).
- Falha em lint/typecheck/testes/build antes de merge (RQ-03).

## Git workflow

- Branch: `feat/issue-503-atividades-institucional`
- Commits por fase: `feat(activities): comentários`, `feat(activities): labels`,
  etc.
- Não push/PR sem instrução.