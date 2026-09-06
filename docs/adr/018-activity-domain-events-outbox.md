# ADR 018: Eventos de Domínio de Atividades no Outbox de Webhooks

## Status

Aceito (emendado em 2026-07-01 — §4 des-canoniza o routing de `createdById` e apresenta os padrões Criador/Atribuidor como decisão do consumer; a intranet não prescreve política de routing)

Emenda 2026-09-06: o escritor in-app (`emitEvent` → `notifications`) permanece ativo; o leitor `NotificationBell` (polling) **não** está montado no layout. Novu é inbox opcional sem publisher no backend. Decisão de produto pendente — não tratar o fluxo até o Bell como UI vigente.

## Contexto

O módulo `/app/atividades` (quadro Kanban) é uma das superfícies operacionais mais movimentadas da intranet. A diretoria manifestou a necessidade de expor mudanças no Kanban para um **futuro sistema de automação/push externo** — por exemplo, enviar e-mail ao Coordenador quando uma tarefa por ele atribuída sai de `a_fazer` para `em_andamento`. O escopo desta decisão é **exclusivamente o webhook em si** (emissão + entrega); o consumer de e-mail/automação está fora de escopo.

A investigação do código revelou dois fatos que moldam a decisão:

1. **A infraestrutura de webhook já existe em ~90%.** Há outbox transacional (`domain_events` + `emitDomainEvent` em `src/lib/integrations/outbox.ts`), subscrições gerenciadas com HMAC-SHA256 (`webhook_subscriptions`), dispatcher com `FOR UPDATE SKIP LOCKED`, retry exponencial (máx. 5), proteção SSRF/redirect, saniteização PII no corpo e nos excertos de resposta, e UI admin de subscrição em `/app/config/integracoes/webhooks`. O dispatcher roda via Vercel Cron em `/api/v1/events/dispatch` (diário 03:00 UTC), rota GET protegida por `CRON_SECRET`.

2. **Há dois sistemas de eventos distintos no codebase**, e apenas um deles é webhook:
   - **Sistema in-app (`src/lib/events.ts`)** — persistência recipient-targeted em `notifications`. `emitEvent` → `notifications` (PostgreSQL). Já cobre `activity.assigned` e `activity.completed` (com `dedupeKey` e guarda contra auto-notificação). **Não é webhook.** O `NotificationBell` que fazia polling desses registros existe no código mas não está montado; o header só mostra Novu quando configurado, sem publisher a partir deste sistema.
   - **Sistema outbox (`src/lib/integrations/outbox.ts`)** — webhooks outbound. `emitDomainEvent` → `domain_events` → dispatcher → POST HMAC assinado para subscrições externas. Cobria apenas `associate.updated`, `legal_consultation.*`, `official_letter.*`, `monthly_payment.updated`. **Não tinha nenhum `activity.*`.**

Portanto a pergunta "seria possível um webhook?" tem resposta trivial (sim, a infraestrutura existe); o trabalho real é **adicionar eventos `activity.*` ao outbox**.

Outro achado estrutural: `updateActivityService` **não era transacional** — `updateActivityById` → `logAuditAction` → `emitActivityCompleted/Assigned` eram `await`s sequenciais não-atômicos. O padrão do outbox (confirmado pelo ADR 013) é emitir o evento **dentro da mesma transação** da mutação, de modo que o evento só exista se a mutação commitar. Adicionar `activity.*` ao outbox exige, portanto, envolver o service em `db.transaction()`.

O Kanban hoje **não possui tabelas de comentários nem de anexos** em atividades, e **não há exclusão** de atividades. Eventos de "comentário adicionado" / "documento adicionado" / "atividade excluída" pressupõem features que ainda não existem no módulo e ficam fora deste ADR.

## Decisão

Adicionar seis tipos de evento de domínio ao outbox, cobrindo o ciclo de vida atual do Kanban, emitidos transacionalmente a partir de `src/lib/activities/service.ts`, com dispatch inline fire-and-forget após commit e cron diário como rede de segurança.

### 1. Conjunto de eventos (granular, superconjunto do sino)

Novos valores no enum `domain_event_type` e em `payloadSchemaByEventType` (`src/lib/integrations/outbox.ts`); novo valor `activity` no enum `domain_event_entity_type`:

- `activity.created` — atividade criada (inclui status/prioridade/assignee iniciais).
- `activity.status_changed` — transição de status (carrega `previousStatus` + `status`).
- `activity.assigned` — atribuição/reatribuição de responsável (carrega `previousAssigneeId` + `assigneeId`).
- `activity.completed` — transição para `concluido` (carrega `completedAt`), **em paralelo a `activity.status_changed`** na mesma mutação.
- `activity.priority_changed` — mudança de prioridade.
- `activity.due_date_changed` — mudança de vencimento.

O outbox é **superconjunto do sino**: `activity.assigned` e `activity.completed` espelham os gatilhos in-app já existentes (mesma fonte de verdade na camada de serviço), enquanto `created`, `status_changed`, `priority_changed` e `due_date_changed` são novos e existem apenas no outbox. Isso permite que o consumer de webhook receba o ciclo de vida completo, enquanto o sino continua recebendo apenas os eventos relevantes ao destinatário.

### 2. Atomicidade — service envolvido em transação

`createActivityService` e `updateActivityService` passam a executar mutação + `emitDomainEvent` **dentro de `db.transaction()`**, consistente com `legal_consultation` e `official_letter` (ADR 013). O evento outbox é publicado **sse a mutação commitar** — é a invariante central: o evento só existe se a mutação existir. O bloqueio otimista por `updatedAt` (`CONCURRENCY_CONFLICT`) é preservado; o throw acontece **antes** de qualquer emit, então uma atualização concorrente que perde o lock não produz evento fantasma.

A auditoria (`logAuditAction`) roda **fora da transação**, como perna best-effort após commit (default `db`, sem `executor: tx`), no mesmo padrão majoritário do repo (cf. `oficios/service.ts` create/update). A razão é técnica: quando `logAuditAction` recebe `executor: tx`, um INSERT de auditoria que falha deixa a transação Postgres em estado `aborted` — todo statement subsequente (`emitDomainEvent` e o próprio commit) falha, **rollbackando a mutação do Kanban** — o que contradiziria o contrato "best-effort" da auditoria. Rodando fora da tx com default `db`, uma falha de INSERT de auditoria é apenas logada (`logger.error` em `audit/service.ts`) e nunca aborta a mutação já commitada. Tradeoff aceito: se a transação rollbackar após a mutação, o registro de auditoria já commitado vira órfão (audit de uma ação que não persistiu) — mesmo tradeoff do precedent. Assim, **mutação + evento outbox são atômicos entre si**; a perna de auditoria é best-effort e dissociada da atomicidade da tx.

Os emits in-app do sino (`emitActivityAssigned`/`emitActivityCompleted`) permanecem **fora da transação**, em `try/catch` best-effort após commit. Falha de notificação in-app **não rollbacka** a mutação nem derruba a requisição — o sino é recipient-targeted e operacionalmente secundário frente à mutação do Kanban. (A guarda de auto-atribuição permanece canônica no helper do outbox e espelhada no `events.ts`.)

### 3. Múltiplas mudanças na mesma mutação → múltiplos eventos granulares

Uma única atualização que altera status, prioridade e assignee emite **três** eventos granulares (`activity.status_changed`, `activity.priority_changed`, `activity.assigned`) na mesma transação. Não há collapse em `activity.updated`. O consumer pode ordenar por `occurredAt` e tratar cada entrega HMAC de forma independente. Esta é a consequência direta da granularidade escolhida e alinha com o padrão `legal_consultation.status_changed` / `official_letter.status_changed`.

Quando a transição for para `concluido`, emitem-se `activity.status_changed` **e** `activity.completed` na mesma mutação — dois eventos, payloads complementares.

### 4. Payload — IDs + `links.app`, sem título/descrição

Consistente com os eventos existentes: campos estruturados (status anterior/novo, assignee anterior/novo, prioridade, vencimento, `completedAt`) + `links: { app }` para deep link. **`title` e `description` não vão no payload** (PII livre; o outbox retém eventos por 90 dias). O consumer que precisar do título faz lookup via API autenticada.

O body do webhook (`buildWebhookBody`) leva apenas `actor.adminId` no campo `actor`. Para permitir que o consumerroteie a notificação ao Coordenador, o `data` do payload inclui explicitamente:

- `createdById` — `activities.createdBy` (quem criou a tarefa).
- `assigneeId` e `previousAssigneeId` (quando aplicável).
- `actorAdminId` já vem no envelope (`actor.adminId`); é quem disparou o evento — no `activity.assigned`, é quem atribuiu ao responsável atual.

A intranet **não canoniza** uma política de routing — expõe ambos os sinais (`createdById` no `data`; `actor.adminId` no envelope) e o consumer escolhe. Dois padrões válidos:

- **Padrão Criador** — notificar `createdById` quando `actor.adminId !== createdById`. Disponível direto em todo evento; consumer simples. Tradeoff: "criou" ≠ "atribuiu" (uma tarefa pode ser criada sem responsável e atribuída depois por outra pessoa).
- **Padrão Atribuidor** — notificar `actor.adminId` do último `activity.assigned` para a atividade. O consumer correlaciona `activity.assigned` + `activity.status_changed` por `entity.id` (activityId) para saber quem atribuiu ao responsável atual e avisá-lo quando o status mudar. Fiel à semântica "coordenador que atribuiu"; exige correlação entre eventos.

O routing do destinatário (quem recebe o push) é **decisão do consumer**, não da intranet. A intranet apenas expõe os IDs necessários.

### 5. Dispatch inline fire-and-forget após commit + cron diário como rede

Após a transação commitar, o service chama `dispatchDomainEventById(eventId)` **fora da transação**, fire-and-forget. Falhas do dispatcher são **swallowed + log estruturado** (`logger.error`); o evento permanece `pending` no outbox e o cron diário (e o retry exponencial embutido) recupera. A mutação do Kanban **nunca falha** por causa do webhook.

O cron `/api/v1/events/dispatch` **permanece diário 03:00 UTC** — o inline cobre a latência fresca (~segundos) para o caso comum; o cron é apenas safety net para falhas inline e retries. Não há mudança no `vercel.json`.

### 6. Auto-atribuição

`activity.assigned` **não** é emitido quando o actor atribui a si mesmo (`newAssigneeId === actorAdminId`), espelhando a guarda já existente no sistema in-app. O evento outbox segue a mesma regra para evitar notificar o webhook sobre uma auto-atribuição que o actor já conhece.

## Escopo excluído

- **Consumer de e-mail/automação** — explicitamente fora de escopo (decisão do usuário).
- **`activity.comment_added` / `activity.attachment_added`** — o Kanban não possui tabelas de comentários nem anexos. Serão adicionados quando essas features existirem no módulo.
- **`activity.deleted`** — não há exclusão de atividades no Kanban.
- **UI de subscrição** — já existe em `/app/config/integracoes/webhooks`; os novos tipos aparecem automaticamente via `getAllowedWebhookEventTypes()` ao serem adicionados ao enum.
- **Mudança no cron** — mantido diário.

## Consequências

**Positivas:**

- Webhook de atividades reutilizam toda a infraestrutura hardened (HMAC, retry, SSRF, PII, idempotência) — zero código de entrega novo.
- Latência de push ~segundos sem sacrificar resiliência (cron + retry como rede).
- Atomicidade elimina eventos fantasmas e eventos perdidos por falha parcial de insert.
- Superconjunto do sino mantém uma única fonte de verdade na camada de serviço para os gatilhos compartilhados.
- Consumer externo tem flexibilidade total de routing via IDs no payload.

**Negativas / trade-offs:**

- `updateActivityService` deixa de ser não-atômico e passa a usar `db.transaction()` — refatoração que toca o caminho quente do Kanban; exige regressão de testes e do bloqueio otimista.
- Múltiplas mudanças numa só mutação produzem múltiplas entregas HMAC (rajada ao consumer) — aceito como custo da granularidade.
- `activity.completed` + `activity.status_changed` na mesma mutação geram dois eventos sobrepostos; o consumer deve ser idempotente e saber que `completed` implica `status_changed` para `concluido`.
- Payload sem `title` obriga o consumer a uma chamada de API extra para montar mensagens humanas — aceito em favor da minimização de PII no outbox.

## Referências

- ADR 013 — Integração Assinafy e Webhooks (padrão transacional all-or-nothing com emits no commit).
- ADR 014 — Proteção contra replay de integrações.
- `src/lib/integrations/outbox.ts` — `emitDomainEvent` + `payloadSchemaByEventType`.
- `src/lib/integrations/webhooks/service.ts` — dispatcher (`dispatchDomainEventById`, `dispatchPendingDomainEvents`).
- `src/lib/events.ts` — sistema in-app de notificações (`activity.assigned`, `activity.completed`).
- `src/lib/activities/service.ts` — camada de serviço onde a emissão é inserida.
- `CONTEXT.md` — glossário: "Evento de Domínio", "Webhook Outbound", "Atividade (Kanban)".
