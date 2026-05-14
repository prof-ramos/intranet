# Endpoints e Webhooks para Push e Automacoes - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar uma superficie de integracao segura para a intranet, com endpoints HTTP e webhooks versionados, capaz de suportar push para sistemas externos e automacoes futuras como `n8n`, sem expor dados LGPD nem acoplar a UI a integracoes.

**Architecture:** A UI continua usando `Server Actions` e `Server Components` como hoje. Integracoes externas entram e saem por `Route Handlers` dedicados em `src/app/api/**`, enquanto os servicos de dominio passam a emitir eventos internos persistidos em outbox. Webhooks externos consomem apenas payloads minimizados, assinados, idempotentes e auditaveis.

**Tech Stack:** Next.js 16 App Router, Route Handlers, Server Actions, Drizzle ORM, PostgreSQL/Supabase, Vercel, Vitest, Playwright.

---

## Read of Current Codebase

| Finding | Evidence | Consequence for the plan |
|---|---|---|
| A app ja usa dois padroes claros de superficie | `API.md` documenta `Route Handlers` e `Server Actions` | Integracoes externas devem entrar por `route.ts`, nao por forms ou fetch improvisado no cliente |
| Mutacoes relevantes ja passam por camada de servico | `src/lib/juridico/service.ts`, `src/lib/oficios/service.ts`, `src/lib/finance/service.ts`, `src/lib/associates/service.ts` | O ponto certo para emitir eventos nao e a UI, e sim o service layer |
| Ja existe auditoria sanitizada | `src/lib/audit/service.ts` mascara CPF, SIAPE, email, endereco etc. | Webhooks e endpoints precisam reaproveitar o mesmo criterio de payload minimo |
| Hoje ha poucos endpoints HTTP e eles sao focados em download autenticado | `src/app/api/oficios/[id]/download/route.ts`, `src/app/app/associados/relatorio/download/route.ts` | Falta uma camada M2M real, com autenticacao propria, versionamento e idempotencia |
| Ja existe rate limiting por IP | `src/lib/rate-limit.ts`, `src/app/app/juridico/actions.ts` | O mesmo helper pode proteger webhooks de entrada e endpoints de integracao |
| O repo ainda nao oferece API keys ou tokens de integracao | `API.md` declara essa ausencia | Antes de expor endpoints para `n8n`, e preciso fechar o modelo de autenticacao de integracao |

---

## Principles

- `Server Actions` continuam como interface interna da UI React.
- `Route Handlers` passam a ser a unica interface para integracao externa.
- Nenhum webhook ou endpoint publico deve expor CPF, SIAPE, endereco, email pessoal, notas internas ou texto juridico completo.
- Eventos nascem no service layer e nao no componente React.
- Entrega externa deve ser assinada, idempotente, com retries controlados e trilha de auditoria.
- O payload v1 deve ser pequeno e estavel: IDs, tipo do evento, timestamps, status e links internos.
- Toda nova integracao deve ser versionada desde o dia 1: `/api/v1/...`.

---

## Recommended Scope Split

### Fase 1: Fundacao de integracao

- [x] Modelo de autenticacao para endpoints M2M.
- [x] Contrato de eventos internos.
- [x] Tabelas de configuracao e entrega de webhook.
- [x] Primeiro endpoint de health e primeiro endpoint de eventos outbound.
- [x] Auditoria de dispatch manual via `/api/v1/events`.
- [x] Criptografia de secrets de subscriptions via `secret_ciphertext`.
- [x] Allowlist de payload por tipo de evento no outbox.

### Fase 2: Eventos de dominio de maior valor

- [x] `associate.updated` emitido em atualizacao cadastral com payload minimizado
- [x] `legal_consultation.created`
- [x] `legal_consultation.status_changed`
- [x] `official_letter.created`
- [x] `official_letter.published`
- [x] `monthly_payment.updated`

### Fase 3: Consumidores externos

- [x] Webhook outbound generico para automacoes externas (ex: `n8n`, scripts internos, filas HTTP)
- [x] UI interna admin para criar, editar, ativar/desativar e rotacionar secrets de subscriptions
- [x] Dispatch agendado por `/api/v1/events/dispatch` via Vercel Cron
- Webhook inbound controlado para acoes simples e seguras, adiado para depois do v1 outbound-only
- [x] Documentacao de contratos e operacao

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/integrations/types.ts` | Tipos canonicos de evento, payload e assinatura |
| `src/lib/integrations/config.ts` | Leitura e validacao de segredos, modo habilitado e versoes |
| `src/lib/integrations/auth.ts` | Validacao de API key/HMAC/timestamp/idempotency key |
| `src/lib/integrations/outbox.ts` | Emissao e persistencia de eventos de dominio |
| `src/lib/integrations/webhooks/repository.ts` | CRUD de assinaturas, tentativas e entregas |
| `src/lib/integrations/webhooks/service.ts` | Dispatch outbound, retries, assinatura e backoff |
| `src/lib/integrations/http.ts` | Helpers de resposta JSON, erros, correlacao e headers |
| `src/app/api/v1/health/route.ts` | Healthcheck de integracao |
| `src/app/api/v1/webhooks/asof/route.ts` | Nao implementado; endpoint inbound ficou fora do v1 |
| `src/app/api/v1/events/route.ts` | Endpoint administrativo/M2M para dispatch controlado de eventos |
| `src/app/api/v1/events/dispatch/route.ts` | Endpoint cron bearer-only para processar pendencias e retries |
| `src/app/app/config/integracoes/webhooks/page.tsx` | UI admin interna para subscriptions outbound |
| `src/lib/db/schema/integrations.ts` | Tabelas `integration_api_keys`, `webhook_subscriptions`, `webhook_deliveries`, `domain_events` |
| `drizzle/postgres/0015_add_integrations_and_webhooks.sql` | Migration inicial da camada de integracoes |
| `drizzle/postgres/0016_operational_webhook_subscriptions.sql` | Auditoria de subscriptions e indice GIN de eventos assinados |
| `src/lib/db/schema/index.ts` | Export das novas tabelas |
| `src/lib/db/schema.integration.test.ts` | Contract test das novas tabelas, enums, indexes e RLS |
| `API.md` | Documentacao publica-interna dos novos endpoints |
| `ARCHITECTURE.md` | Diretrizes da nova camada de integracao |

---

## Data Model

### `domain_events`

Persistir o evento de dominio gerado pelas mutacoes internas.

Campos minimos:

- `id`
- `event_type`
- `entity_type`
- `entity_id`
- `actor_admin_id`
- `payload` validado por allowlist em `src/lib/integrations/outbox.ts`
- `occurred_at`
- `delivery_status`

### `webhook_subscriptions`

Configura destinos externos autorizados.

Campos minimos:

- `id`
- `name`
- `target_url` HTTPS publico; localhost, hostnames locais/internos e faixas privadas/reservadas sao rejeitados
- `secret_ciphertext`
- `is_active`
- `subscribed_events`
- `created_by`
- `created_at`

### `webhook_deliveries`

Registra tentativas, resposta, retries e replay.

Campos minimos:

- `id`
- `domain_event_id`
- `webhook_subscription_id`
- `attempt`
- `request_id`
- `status_code`
- `response_excerpt`
- `delivered_at`
- `next_retry_at`
- `failed_at`

### `integration_api_keys`

Chaves para endpoints M2M que nao usem sessao humana.

Campos minimos:

- `id`
- `name`
- `key_hash`
- `scopes`
- `is_active`
- `last_used_at`
- `created_by`

---

## Event Contract v1

Payload recomendado:

```json
{
  "id": "evt_123",
  "type": "legal_consultation.status_changed",
  "occurredAt": "2026-05-13T12:34:56.000Z",
  "entity": {
    "type": "legal_consultation",
    "id": 42
  },
  "actor": {
    "adminId": 7,
    "role": "admin"
  },
  "data": {
    "status": "respondida",
    "previousStatus": "em_analise"
  },
  "links": {
    "app": "/app/juridico/consultas/42"
  }
}
```

Regras:

- `data` deve conter somente o minimo operacional.
- Nao incluir texto integral de consulta, corpo de oficio, CPF, SIAPE, endereco, emails ou notas internas.
- `links.app` deve sempre apontar para uma rota interna existente.

---

## Task 1: Definir a Camada de Integracao

**Files:**
- Create: `src/lib/integrations/types.ts`
- Create: `src/lib/integrations/config.ts`
- Create: `src/lib/integrations/http.ts`
- Modify: `ARCHITECTURE.md`
- Modify: `API.md`

- [ ] Especificar os tipos canonicos de evento:

```ts
export type DomainEventType =
  | 'associate.updated'
  | 'legal_consultation.created'
  | 'legal_consultation.status_changed'
  | 'official_letter.created'
  | 'official_letter.published'
  | 'monthly_payment.updated';
```

- [ ] Padronizar o envelope HTTP:

```ts
type IntegrationSuccess<T> = {
  ok: true;
  requestId: string;
  data: T;
};

type IntegrationError = {
  ok: false;
  requestId: string;
  error: {
    code: string;
    message: string;
  };
};
```

- [ ] Documentar em `API.md` que:
  - UI interna usa `Server Actions`
  - Integracoes externas usam `/api/v1/...`
  - `n8n` deve consumir webhooks ou endpoints M2M, nunca o banco diretamente

- [ ] Documentar em `ARCHITECTURE.md` que a camada de integracao e uma boundary separada, fina e sem logica de dominio.

---

## Task 2: Implementar Autenticacao M2M

**Files:**
- Create: `src/lib/integrations/auth.ts`
- Create: `src/lib/db/schema/integrations.ts`
- Create: `drizzle/postgres/0015_add_integrations_and_webhooks.sql`
- Modify: `src/lib/db/schema/index.ts`
- Modify: `src/lib/db/schema.integration.test.ts`

- [ ] Adotar dois mecanismos:
  - API key hash para endpoints administrativos M2M
  - HMAC SHA-256 para webhooks inbound e outbound

- [ ] Headers obrigatorios:

```txt
Authorization: Bearer <integration key>
X-ASOF-Timestamp: <unix epoch seconds>
X-ASOF-Signature: sha256=<hex>
X-Idempotency-Key: <uuid>
X-Request-Id: <uuid>
```

- [ ] Rejeitar requisicoes fora da janela:

```txt
abs(now - X-ASOF-Timestamp) > 300s => 401
```

- [ ] Salvar apenas hash da API key, nunca o segredo bruto.
- [ ] Adicionar contract tests para:
  - tabela presente
  - indexes por `is_active`, `last_used_at`
  - constraints minimas de escopo

---

## Task 3: Criar o Outbox de Eventos

**Files:**
- Create: `src/lib/integrations/outbox.ts`
- Create: `src/lib/integrations/webhooks/repository.ts`
- Modify: `src/lib/juridico/service.ts`
- Modify: `src/lib/oficios/service.ts`
- Modify: `src/lib/finance/service.ts`
- Modify: `src/lib/associates/service.ts`

- [ ] Implementar helper unico:

```ts
export async function emitDomainEvent(input: {
  type: DomainEventType;
  entityType: string;
  entityId: number;
  actorAdminId: number | null;
  payload: DomainEventPayloadMap[T];
  tx?: Tx;
}): Promise<void>
```

- [ ] Sempre emitir o evento dentro da mesma transacao da mutacao principal quando houver `db.transaction()`.
- [ ] Se a mutacao ainda nao estiver transacional, promover a operacao para transacao antes de anexar o evento.
- [ ] Comecar pelos pontos de maior valor operacional ja existentes:
  - `updateAssociateData`
  - `createConsultationService`
  - `updateConsultationStatusService`
  - `saveOfficialLetter`
  - `updateMonthlyPayment`

- [x] Regras de payload minimo:
  - `associate.updated`: apenas `associateId` e campos alterados permitidos
  - `legal_consultation.created`: `id`, `internalNumber`, `status`, `slaDueDate`
  - `legal_consultation.status_changed`: `id`, `oldStatus`, `newStatus`
  - `official_letter.created`: `id`, `number`, `status`
  - `official_letter.published`: `id`, `number`, `status`
  - `monthly_payment.updated`: `associateId`, `year`, `month`, `status`

---

## Task 4: Criar Webhook Outbound

**Files:**
- Create: `src/lib/integrations/webhooks/service.ts`
- Create: `src/app/api/v1/events/route.ts`
- Modify: `API.md`

- [ ] Implementar despacho assinado por assinatura ativa.
- [ ] Cada entrega deve enviar:

```json
{
  "event": { "...": "..." },
  "subscription": {
    "id": 3,
    "name": "n8n-producao"
  }
}
```

- [ ] Politica de retry inicial:
  - ate 5 tentativas
  - backoff exponencial
  - sem retry para `2xx`
  - retry para `408`, `429` e `5xx`

- [x] Persistir `status_code` e `response_excerpt` truncado.
- [x] Nunca persistir corpo de resposta completo se contiver PII.
- [x] Criar endpoint administrativo minimo para dispatch controlado de eventos pendentes ou de evento especifico, protegido por sessao `admin` ou autenticacao M2M.

---

## Task 5: Criar Webhook Inbound para Automacoes

**Files:**
- Deferred: `src/app/api/v1/webhooks/asof/route.ts`
- Modify: `src/lib/integrations/auth.ts`
- Modify: `API.md`

- [ ] Limitar o inbound v1 a comandos seguros e explicitamente aprovados.
- [ ] Escopo recomendado de v1:
  - registrar atividade simples
  - adicionar nota operacional nao sensivel
  - marcar evento administrativo como recebido

- [ ] Nao permitir no v1:
  - edicao massiva de associado
  - acesso a dados juridicos sensiveis
  - leitura aberta de CPF/SIAPE/email
  - upload de anexos

- [ ] Validar:
  - assinatura HMAC
  - timestamp
  - idempotency key
  - rate limit por IP e por chave

- [ ] Responder com envelope padrao:

```json
{
  "ok": true,
  "requestId": "req_123",
  "data": {
    "accepted": true
  }
}
```

---

## Task 6: Observabilidade, Auditoria e Seguranca

**Files:**
- Modify: `src/lib/audit/service.ts`
- Modify: `ARCHITECTURE.md`
- Modify: `API.md`

- [ ] Registrar auditoria para:
  - criacao/rotacao/revogacao de API key
  - [x] criacao/edicao/desativacao/reativacao/rotacao de webhook subscription
  - [x] replay/dispatch manual de webhook/evento
  - [x] dispatch agendado de eventos
  - falhas repetidas de autenticacao M2M

Status atual: dispatch manual/agendado de eventos ja e auditado em `audit_logs` com `entityType: domain_event`. CRUD/rotacao de webhook subscriptions e auditado com `entityType: webhook_subscription`. API key CRUD persistido ainda nao existe, entao a auditoria desses casos permanece futura.

- [ ] Adicionar correlacao por `requestId` entre:
  - request inbound
  - domain event
  - webhook delivery
  - audit log

- [ ] Revisar logs atuais para evitar `console.error` com objetos brutos de payload externo.
- [ ] Documentar politicas:
  - payload minimo
  - retencao de entregas
  - procedimento de revogacao de chave

---

## Task 7: Testes e Validacao

**Files:**
- Create: `src/lib/integrations/auth.test.ts`
- Create: `src/lib/integrations/outbox.test.ts`
- Create: `src/lib/integrations/webhooks/service.test.ts`
- Deferred: `src/app/api/v1/webhooks/asof/route.test.ts`
- Modify: `src/lib/db/schema.integration.test.ts`

- [ ] Unit tests:
  - assinatura valida/invalida
  - timestamp expirado
  - [x] payload minimizado
  - [x] retry policy
  - dedupe por `X-Idempotency-Key`

- [ ] Integration tests:
  - [x] mutacao de dominio grava `domain_events` para `associate.updated` em teste unitario de service
  - webhook subscription ativa recebe tentativa
  - replay manual nao duplica quando a chave de idempotencia ja foi consumida

- [ ] Validacao operacional minima:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:db`
  - smoke dos novos handlers com `curl`

---

## Recommended Delivery Order

1. Contrato e docs da camada de integracao.
2. Schema + auth M2M.
3. Outbox + emissao em `juridico` e `finance`.
4. Webhook outbound para `n8n`.
5. Webhook inbound v1 com escopo minimo.
6. Expansao para `associates` e `oficios`.

---

## Decisions to Lock Before Implementation

- Se a ASOF quer `n8n` apenas como consumidor de eventos ou tambem como originador de comandos.
- Se API keys serao por ambiente (`dev`, `staging`, `prod`) ou por integracao.
- Decidido: webhooks outbound sao assincronos via outbox + Vercel Cron (`/api/v1/events/dispatch`) para nao acoplar mutacoes de dominio a latencia/falhas de consumidores externos.
- Se a intranet aceitara replay manual por UI interna ou apenas por endpoint administrativo.
- Quais eventos sao permitidos para sair do sistema no v1 sem risco LGPD.

---

## Recommendation

Comecar por **outbound only**:

- emitir eventos de dominio
- persistir outbox
- despachar para `n8n`

Isso entrega o maior valor para push e automacao com o menor risco. Webhook inbound deve entrar apenas depois que autenticacao M2M, idempotencia e trilha de auditoria estiverem fechadas.

Plan complete and saved to `docs/superpowers/plans/2026-05-13-endpoints-webhooks-integracoes.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
