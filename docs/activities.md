# Atividades institucional — impacto e referência

**Status:** Fases 0, 1 e 2 concluídas; preparação para F3 (timeline consolidada)
**Escopo:** referência técnica para a evolução prevista na Issue #503. Este documento registra o baseline verificado no repositório e o impacto por fase; não adiciona comportamento ao módulo.

## 1. Princípios e baseline

A evolução preserva o módulo Kanban existente e o transforma, de forma incremental, em uma superfície institucional de gestão de tarefas. O contrato central é único: UI, API REST e MCP devem chamar a mesma camada de domínio. Regras de negócio não devem ser duplicadas em React, Server Actions, API ou adaptador MCP.

O baseline verificado contém:

- `src/lib/db/schema/activities.ts`: tabela `activities`, status `a_fazer | em_andamento | aguardando_terceiros | concluido`, prioridade `baixa | normal | alta | urgente`, responsável, associado, prazo, descrição, `completedAt`, posição e `tags` como `jsonb` de `string[]`.
- `src/lib/activities/comments-service.ts` e `src/lib/activities/labels-service.ts`: comentários e labels passam pelas services, com validação, auditoria, feature flags e eventos transacionais.
- `src/lib/activities/repository.ts`: `findActivities` carrega labels estruturadas em uma consulta adicional única para o lote do board; `listActivityTimeline` lê `audit_logs`.
- `src/lib/activities/domain-events.ts`: `emitActivityDomainEvents`, que emite eventos granulares por campo alterado, sem colapsar as mudanças em `activity.updated`.
- `src/lib/activities/queries.ts`: `getActivitiesBoardData` carrega o board e os dados auxiliares (`people` e associados).
- `src/app/app/atividades/actions.ts`: além das actions do board e de comentários, expõe listagem/criação/desativação de labels e associação/remoção de labels, todas autorizadas para `admin`, `diretoria` e `secretaria`.
- `src/app/app/atividades/AtividadesBoard.tsx` e `src/app/app/atividades/_board/Drawer.tsx`: board, atualização otimista, drawer, dados, labels, comentários e histórico; labels estruturadas aparecem nos cards e podem ser filtradas pela URL.
- `src/lib/integrations/outbox.ts` e `src/lib/db/schema/integrations.ts`: outbox de webhooks, com `domain_events`, `actorAdminId`, retenção e dispatch separado. Os tipos `activity.*` existentes são os relacionados na tabela de eventos abaixo, incluindo comentários e labels.
- `src/lib/events.ts`: notificações in-app recipient-targeted persistidas em `notifications`. Esse fluxo, consumido pelo `NotificationBell`, não é o outbox de webhooks.
- `src/lib/integrations/keys/service.ts`: `integration_api_keys` com hash SHA-256, segredo de assinatura cifrado, rotação, revogação, `lastUsedAt` e scopes atuais `events:read`, `events:write`, `webhooks:manage`, `health:read` e `admin`.
- `src/lib/integrations/verify-request.ts`: autenticação dual para sessão ou API key; para API keys usa timestamp, HMAC e nonce. `authorizeIntegrationRequest` aplica `requiredScopes` às chaves table-backed.
- `src/lib/webmcp/catalog.ts` e `src/lib/webmcp/build-tools.ts`: WebMCP no navegador com `open-activities`, `open-activity`, `start-create-activity`, `complete-activity` e `assign-activity`. Não existe servidor MCP externo de atividades.
- `drizzle/postgres/`: migrations de comentários e labels até `0040_activity_label_event_types.sql`; a migration estrutural de labels é `0039_clever_the_liberteens.sql` e os valores do enum são adicionados separadamente em `0040_activity_label_event_types.sql`.
- A suíte existente inclui testes unitários de atividades e `e2e/tests/atividades.spec.ts`; o baseline do plano registra 252 arquivos de teste.

### Mapa de impacto por subsistema

| Sub­sistema         | Hoje                                                                                                           | Impacto da evolução                                                                                                                          | Referências no código                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Modelo de atividade | Uma tabela `activities`; `tags` livres em JSONB                                                                | Manter o modelo atual; acrescentar comentários e labels como entidades relacionais, sem converter `tags` automaticamente                     | `src/lib/db/schema/activities.ts`                                                          |
| Regras de domínio   | Criação e atualização centralizadas no service                                                                 | Completar contratos para comentários, labels, conclusão e reabertura; todas as entradas continuam passando por service                       | `src/lib/activities/service.ts`, `src/lib/activities/domain-events.ts`                     |
| Persistência        | Repository de atividades e listagem limitada                                                                   | Adicionar repositories de comentários e labels, índices e consultas bounded                                                                  | `src/lib/activities/repository.ts`, `src/lib/activities/queries.ts`                        |
| Server Actions      | CRUD parcial e timeline via `audit_logs`                                                                       | Preservar as actions atuais; adicionar actions finas para comentários/labels, sem mover regras para a UI                                     | `src/app/app/atividades/actions.ts`                                                        |
| Timeline            | `listActivityTimeline` lê `audit_logs`; `describeTimelineEntry` cobre criação, alteração, comentários e labels | Normalizar Quem/O quê/Quando e avaliar leitura complementar de `domain_events` sem duplicar armazenamento                                    | `src/lib/activities/repository.ts`, `src/app/app/atividades/actions.ts`                    |
| Eventos             | Eventos granulares de atividade, comentários e labels no outbox; dois gatilhos in-app                          | Acrescentar os tipos ainda faltantes de RF-04 e preservar granularidade, atomicidade e idempotência do outbox                                | `src/lib/activities/domain-events.ts`, `src/lib/integrations/outbox.ts`                    |
| Auditoria           | `performedBy` aponta para `admins` e pode ser nulo; `changes`/`metadata`; sem `actor_type`                     | Adicionar `actor_type` e `actor_api_key_id`; manter `performedBy` para admins e classificar API/MCP e sistema                                | `src/lib/db/schema/audit.ts`, `src/lib/audit/service.ts`                                   |
| API                 | Há `/api/v1/*` para outros domínios; não há endpoints de atividades                                            | Criar a superfície REST prevista, com Zod, envelope padrão, rate limiting, autenticação e scopes                                             | `src/app/api/v1/`, `src/lib/integrations/verify-request.ts`                                |
| API keys            | Infraestrutura table-backed existente, mas sem scopes de atividades                                            | Acrescentar `activities:read`, `activities:write` e `activities:comment`; `activities:admin` só deve nascer se houver necessidade comprovada | `src/lib/integrations/keys/service.ts`                                                     |
| WebMCP/MCP          | WebMCP de navegador registra ferramentas no `document.modelContext`; sem MCP externo                           | Criar adaptador MCP fino sobre a API, com tools P0/P1 e actor automatizado distinguível                                                      | `src/lib/webmcp/catalog.ts`, `src/lib/webmcp/register.ts`, `src/lib/webmcp/build-tools.ts` |
| UI                  | Board, drawer, filtros, DnD, tags e histórico                                                                  | Incorporar comentários, labels, indicadores e filtro por label sem redesign estrutural                                                       | `src/app/app/atividades/`, `src/lib/activities/types.ts`                                   |
| Migrations          | Migrations 0037–0040 adicionam comentários, labels e os valores de enum separados                              | Somente migrations aditivas, compatíveis com deploy gradual e rollback lógico                                                                | `drizzle/postgres/`, `drizzle/postgres/0028_activity_domain_events.sql`                    |

## 2. Entrega por fase F0–F7

A sequência abaixo é o mapa de impacto do spec. O plano operacional também separa hardening em uma checklist própria; nesta referência, hardening e observabilidade ficam no fechamento de F7.

| Fase                          | Objetivo                                                           | Existe hoje                                                                                                                  | Será adicionado                                                                                                                                                                                                                                                             |
| ----------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F0 — Preparação**           | Fixar contratos e baseline                                         | Service, repository, actions, timeline baseada em auditoria, outbox e WebMCP parcial já existem                              | Contratos explícitos do Activity Service; revisão de autorização; migrations aditivas; feature flags; plano de auditoria com atores; baseline de testes e documentação                                                                                                      |
| **F1 — Comentários**          | Comentários institucionais no drawer e na API                      | Implementado: tabela, repository, service, actions, auditoria, eventos, UI e testes                                          | `activity_comments`, `activity.comment_*`, `ACTIVITY_COMMENTS_ENABLED`                                                                                                                                                                                                      |
| **F2 — Labels**               | Labels administráveis e filtro                                     | Implementado: tabelas relacionais, CRUD/associação, auditoria, eventos, cards, drawer, filtro e testes                       | `activity_labels`, `activity_label_assignments`, `activity.label_*`, `ACTIVITY_LABELS_ENABLED`                                                                                                                                                                              |
| **F3 — Timeline consolidada** | Histórico que responda Quem? O quê? Quando?                        | `listActivityTimeline` consulta `audit_logs`; `describeTimelineEntry` já descreve criação, atualização, comentários e labels | Normalização de valores anterior/novo; eventual leitura complementar de `audit_logs` + `domain_events`, mantendo `audit_logs` como fonte da timeline da UI; testes                                                                                                          |
| **F4 — UX do board**          | Tornar o board uma superfície institucional                        | Card/drawer já incluem labels e comentários, mas faltam indicadores e refinamentos de UX                                     | Card compacto com responsável, prazo, prioridade, labels, comentários e atraso; drawer consolidado; edição inline seletiva; loading, erro, acessibilidade e mobile                                                                                                          |
| **F5 — API REST**             | Acesso programático versionado                                     | `/api/v1/*` existe, mas não para atividades                                                                                  | `GET/POST /api/v1/activities`, `GET/PATCH /api/v1/activities/:id`, `POST /api/v1/activities/:id/complete`, `POST /api/v1/activities/:id/reopen`, `GET/POST /api/v1/activities/:id/comments` e `GET /api/v1/activity-labels`; schemas Zod, envelopes, rate limiting e testes |
| **F6 — Scopes**               | Menor privilégio para integrações                                  | API keys já têm hash, segredo cifrado, rotação, revogação e scopes de integração gerais                                      | `activities:read`, `activities:write` e `activities:comment` em `VALID_SCOPES`; autorização por endpoint; auditoria com a chave identificada; rate limit proporcional ao risco                                                                                              |
| **F7 — MCP e hardening**      | Expor tools controladas a agentes e fechar requisitos operacionais | WebMCP de navegador tem cinco ferramentas de atividades; não há servidor MCP externo                                         | MCP fino sobre a API; tools P0/P1; `ACTIVITY_MCP_ENABLED`; actor `api_key`; testes de abuso, concorrência, idempotência, métricas e revisão de logs/PII. Não incluir exclusão física                                                                                        |

### Escopo de API previsto

Os endpoints da tabela são alvo de F5, não uma afirmação de que já existam no baseline. O endpoint de atividades deve chamar o service compartilhado e preservar os invariantes de transação, lock otimista, outbox, auditoria e autorização.

## 3. Decisões arquiteturais D-01–D-23

As linhas abaixo são a síntese operacional das decisões do spec para orientar a implementação e a revisão do código. A coluna “Aplicação no baseline” distingue decisão de alvo futuro de comportamento já verificado.

| ID       | Decisão resumida                                                                          | Aplicação no baseline / impacto                                                                                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D-01** | Evoluir o módulo Atividades existente, sem reescrita ou substituição do Kanban            | Preservar `src/lib/activities/`, as Server Actions e os contratos atuais; novas capacidades entram por extensão                                                                                                                                                   |
| **D-02** | Atividades é uma superfície institucional única                                           | Não criar um segundo produto de tarefas, workspace genérico ou board paralelo                                                                                                                                                                                     |
| **D-03** | Não executar o kanbn/kan como aplicação paralela                                          | O board atual continua sendo a UI; a referência externa não vira dependência de runtime                                                                                                                                                                           |
| **D-04** | Não fazer fork nem copiar código do kanbn/kan                                             | Usar apenas referências funcionais/UX; nenhuma cópia de componente, serviço ou algoritmo                                                                                                                                                                          |
| **D-05** | Manter o domínio da ASOF específico, sem importar um modelo genérico de workspaces/Trello | Atividades continuam relacionadas a admins, associados, áreas e fluxos institucionais                                                                                                                                                                             |
| **D-06** | Separar apresentação de regra de negócio                                                  | `src/app/app/atividades/_board/` permanece apresentação/estado; validação, autorização e transições ficam no service                                                                                                                                              |
| **D-07** | Modelar comentários como entidade própria, com exclusão lógica                            | Criar `activity_comments` com autor, conteúdo, timestamps e `deleted_at`; não apagar fisicamente comentário usado na timeline                                                                                                                                     |
| **D-08** | Modelar labels como entidades administráveis e relacionais                                | Criar labels e tabela de associação; manter `activities.tags` legado sem migração automática nesta fase                                                                                                                                                           |
| **D-09** | Uma camada de domínio compartilhada é a fonte de verdade                                  | UI, REST e MCP devem chamar os mesmos services; repositories não devem ser usados pelo cliente ou pelo MCP                                                                                                                                                        |
| **D-10** | A timeline deve ser consolidada por leitura, não por duplicação de eventos                | `audit_logs` continua fonte da timeline da UI; `domain_events` pode complementar a leitura quando necessário                                                                                                                                                      |
| **D-11** | Eventos de domínio são granulares                                                         | Não criar `activity.updated` como substituto dos eventos por campo; uma mutação pode emitir vários eventos, e concluir emite também `activity.completed`                                                                                                          |
| **D-12** | Mutação e outbox devem ser atômicos; auditoria segue o contrato explícito de durabilidade | O baseline usa `db.transaction()` para mutação + outbox e `logAuditBestEffort` pós-commit; `logAuditAction` com executor explícito permanece disponível para casos que exigirem auditoria estrita, registrando-se a divergência em relação à expectativa de RA-03 |
| **D-13** | A API programática é REST versionada em `/api/v1`                                         | Não criar uma API tRPC paralela; endpoints de atividades seguem os envelopes e padrões existentes de integração                                                                                                                                                   |
| **D-14** | Reutilizar autenticação e autorização já operacionais                                     | Usar `verifyIntegrationRequest`/`authorizeIntegrationRequest` e passar `requiredScopes` na rota, preservando os papéis de sessão existentes; não duplicar autenticação no MCP                                                                                     |
| **D-15** | API keys table-backed são o mecanismo M2M preferencial                                    | Reutilizar `integration_api_keys`, hash SHA-256, segredo de assinatura, rotação, revogação e `lastUsedAt`; nunca transportar token bruto para o domínio                                                                                                           |
| **D-16** | Toda requisição de integração deve ter proteção contra replay e abuso                     | Preservar timestamp, HMAC, nonce e rate limiting de `src/lib/integrations/`; falhas de autenticação não chegam ao service                                                                                                                                         |
| **D-17** | Scopes seguem menor privilégio e começam pelo necessário                                  | Adicionar `activities:read`, `activities:write` e `activities:comment`; `activities:admin` não é padrão e só deve ser criado com caso de uso demonstrado                                                                                                          |
| **D-18** | Não adicionar tRPC, Better Auth ou outro mecanismo de identidade                          | A sessão server-side e a autenticação de integração existentes continuam canônicas                                                                                                                                                                                |
| **D-19** | Não adicionar Redis, microserviço ou fila própria                                         | Reutilizar PostgreSQL, o outbox e o dispatcher existentes; não criar uma infraestrutura concorrente                                                                                                                                                               |
| **D-20** | Não introduzir um mecanismo de busca externo para esta evolução                           | Usar PostgreSQL e os índices existentes; ampliar busca apenas com necessidade e medição, sem Elasticsearch/Meilisearch/Typesense                                                                                                                                  |
| **D-21** | MCP é adaptador fino, com tools limitadas e sem regra própria                             | O MCP não acessa banco, não reimplementa transições e não transforma o WebMCP do navegador em servidor externo; chama a API protegida                                                                                                                             |
| **D-22** | MCP não executa exclusão física de atividades ou entidades                                | Comentários usam exclusão lógica; labels podem ser desativadas/removidas da associação; qualquer operação destrutiva futura exige controles adicionais                                                                                                            |
| **D-23** | Auditoria deve distinguir `admin`, `api_key` e `system`                                   | Adicionar `actor_type` e `actor_api_key_id`; manter `performedBy` para admins e registrar a chave table-backed em operações API/MCP                                                                                                                               |

Decisões transversais que derivam da tabela: não migrar tags para labels como parte desta entrega, não colocar título/descrição livre em payloads de outbox sem justificativa de PII, e não quebrar contratos das Server Actions existentes.

## 4. Nota de licença e referência funcional

`kanbn/kan` é distribuído sob **AGPL-3.0**. Nesta evolução, ele é utilizado **somente como referência funcional e de UX** para conceitos como board, drawer, filtros e fluxo de tarefas. Não copiar código, componentes, estilos, nomes internos, estrutura de dados ou implementação do projeto externo. A implementação permanece nativa da intranet e deve respeitar suas próprias decisões de arquitetura, segurança e licença.

## 5. Inventário de eventos — RF-04 versus outbox atual

O inventário abaixo trata o outbox de webhooks (`domain_events`), não o sistema de notificações in-app de `src/lib/events.ts`. “Existe” significa que o tipo está no enum/schema e é emitido pela camada de atividades no baseline.

| Evento RF-04                | Outbox atual | Situação e observação                                                                                                                                            |
| --------------------------- | :----------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activity.created`          |   **Sim**    | Emitido por `createActivityService`; payload inclui IDs, estado inicial, prazo e `links.app`                                                                     |
| `activity.updated`          |   **Não**    | Ausência intencional: a decisão de granularidade não colapsa mudanças em um evento genérico                                                                      |
| `activity.status_changed`   |   **Sim**    | Emitido por `emitActivityDomainEvents` com `previousStatus` e `status`                                                                                           |
| `activity.assigned`         |   **Sim**    | Cobre mudança de responsável com `previousAssigneeId` e `assigneeId`; a guarda de auto-atribuição é preservada                                                   |
| `activity.reassigned`       |   **Não**    | Lacuna semântica: o outbox atual usa `assigned`; RF-04 pede tipo explícito para reatribuição. Definir compatibilidade antes de emitir ambos ou renomear contrato |
| `activity.priority_changed` |   **Sim**    | Payload granular com prioridade anterior e nova                                                                                                                  |
| `activity.due_date_changed` |   **Sim**    | Cobre inclusão, alteração e remoção do prazo, inclusive `null`                                                                                                   |
| `activity.label_added`      |   **Sim**    | Emitido por `labels-service` após a associação; payload mínimo com `activityId` e `labelId`                                                                      |
| `activity.label_removed`    |   **Sim**    | Emitido por `labels-service` após a remoção; payload mínimo com `activityId` e `labelId`                                                                         |
| `activity.comment_added`    |   **Sim**    | Emitido pelo service de comentários após a criação lógica                                                                                                        |
| `activity.comment_edited`   |   **Sim**    | Emitido pelo service de comentários após a edição                                                                                                                |
| `activity.comment_deleted`  |   **Sim**    | Emitido pelo service de comentários após a exclusão lógica                                                                                                       |
| `activity.completed`        |   **Sim**    | Emitido junto com `activity.status_changed` quando a transição chega a `concluido`                                                                               |
| `activity.reopened`         |   **Não**    | A reabertura é endpoint/regra futura; definir transições válidas e o evento na API/MCP                                                                           |

O `activity.assigned` atual é emitido quando o responsável muda, salvo a guarda de auto-atribuição; a diferença entre atribuição inicial e reatribuição ainda precisa ser resolvida no contrato RF-04. Não anunciar `activity.reassigned` como existente antes de alterar enum, schema, emissor, consumidores e testes.

Para todos os eventos novos, manter as propriedades do outbox existente: emissão dentro da transação da mutação, payload minimizado e sanitizado, IDs e `links.app`, retry/dispatch pelo mecanismo já existente e consumidor idempotente. O ADR 018 mantém o cron diário de dispatch como safety net; a emissão inline não deve fazer a mutação depender da entrega HTTP.

## 6. Lacunas de auditoria e resolução

### Estado atual

`src/lib/db/schema/audit.ts` define `audit_logs` com `action`, `entityType`, `entityId`, `performedBy` (FK nullable para `admins`), `changes`, `metadata` e `createdAt`. `src/lib/audit/service.ts` aceita apenas `adminId` em `LogAuditOptions`. `listActivityTimeline` resolve o nome do ator por `performedBy` e, portanto, não consegue representar uma API key ou um sistema como ator distinto.

A combinação atual gera três lacunas:

1. uma operação REST/MCP não pode ser filtrada como operação de chave sem sobrecarregar `metadata`;
2. `performedBy` não pode apontar para `integration_api_keys`, e `null` mistura automação, cron e outras ações sem usuário;
3. a timeline atual mostra `actorName` de admin ou `null`, sem tipo de ator nem identidade estável da integração.

### Resolução planejada (RF-10/D-23)

1. Adicionar, em migration aditiva, `actor_type` com os valores `admin | api_key | system` e `actor_api_key_id` como FK opcional para `integration_api_keys`.
2. Manter `performedBy` para compatibilidade e para o vínculo humano. Para sessão, preencher `actor_type = 'admin'` e `performedBy` com o admin autenticado.
3. Para API/MCP autenticado por chave table-backed, preencher `actor_type = 'api_key'`, `actor_api_key_id` com a chave autenticada e manter `performedBy` nulo. O domínio recebe identidade não secreta; o token bruto nunca entra em auditoria ou log.
4. Para cron e automações sem identidade humana, preencher `actor_type = 'system'`. Uma chave legada de variável de ambiente não possui linha table-backed para a FK; deve ser tratada como compatibilidade de integração, sem inventar um `actor_api_key_id`.
5. Evoluir `LogAuditOptions`, `logAuditAction`, `logAuditBestEffort`, as consultas e a serialização da timeline para carregar o tipo e o identificador seguro do ator.
6. Não usar `metadata` como substituto do campo estruturado: ele pode complementar contexto, mas não deve ser a única forma de consultar operações automatizadas.

O baseline continuará com auditoria best-effort pós-commit nos fluxos já existentes, conforme ADR 018. Onde o requisito exigir durabilidade estrita, usar o executor transacional explicitamente e testar a interação com o estado `aborted` do PostgreSQL; não alterar silenciosamente o contrato de best-effort.

## 7. Migrations, ativação e rollback

### Ordem aditiva

1. Criar `activity_comments` e seus índices, com FK para `activities` e `admins`, antes de publicar código que lê a tabela.
2. Criar `activity_labels` e `activity_label_assignments`, chaves/índices e seed configurável. Labels são entidades novas; `activities.tags` permanece preservado.
3. Adicionar `actor_type`/`actor_api_key_id` em `audit_logs`, com backfill revisado e compatibilidade para linhas históricas.
4. Adicionar valores de enum/eventos necessários em migrations isoladas. Como `ALTER TYPE ... ADD VALUE` é one-way no PostgreSQL, não planejar downgrade destrutivo do enum; o rollback é de aplicação.
5. Publicar código compatível: schema Drizzle, repositories, services, actions, rotas e UI protegidos por flags. Nenhuma migration deve depender de uma versão nova do app antes de a coluna/tabela existir.
6. Ativar cada capacidade após validar testes, métricas e auditoria. Migração de `tags` para labels não faz parte desta fase.
7. Remover fallback ou estruturas antigas apenas em uma mudança posterior e deliberada; nunca combinar alteração estrutural crítica, migração destrutiva e remoção de fallback na mesma migration.

### Feature flags

- `ACTIVITY_COMMENTS_ENABLED`: controla exposição/leitura/escrita de comentários e as tools/rotas de comentário. Não substitui autenticação, autorização ou auditoria.
- `ACTIVITY_LABELS_ENABLED`: controla labels, associações, filtro e administração. Tags legadas continuam funcionando quando a flag estiver desligada.
- `ACTIVITY_MCP_ENABLED`: controla publicação do servidor/adaptador MCP. Não habilita acesso direto ao banco nem concede scopes.

As flags `ACTIVITY_COMMENTS_ENABLED` e `ACTIVITY_LABELS_ENABLED` têm default `true` (capacidade estável e auth-gated); `ACTIVITY_MCP_ENABLED` deve iniciar desativada até o servidor MCP existir. Em rollout gradual, as flags podem iniciar desativadas durante a estabilização. A decisão da flag deve ocorrer no servidor para rotas e services, além de esconder a UI; esconder apenas o componente não é controle de segurança.

### Rollback

- **Aplicação:** desligar a flag da capacidade com problema, impedir novas gravações e manter o board legado operante. Revogar API keys comprometidas e remover scopes é uma ação de segurança separada.
- **Banco:** fazer rollback lógico. Manter tabelas, índices, dados e valores de enum; código anterior deve simplesmente ignorar as estruturas novas. Não apagar comentários/labels/auditoria para “voltar” a versão.
- **Eventos:** eventos já persistidos permanecem no outbox para processamento ou expiração conforme a política existente. Consumidores devem aceitar reentrega e tipos novos sem causar duplicação de efeito.
- **Auditoria:** nunca remover a trilha criada durante uma tentativa de rollout. Corrigir classificação por nova migration ou job auditado, se necessário.

A validação mínima antes de ativar uma fase é: migrations aplicadas em ambiente descartável, testes unitários/integração da camada afetada, teste de autorização e scope, verificação de timeline/auditoria, teste de concorrência e confirmação de que o rollback por flag mantém a UI atual funcionando.

## Referências verificadas

- `docs/adr/018-activity-domain-events-outbox.md` — atomicidade de mutação + outbox, granularidade, dispatch e limites atuais.
- `plans/018-webmcp-atividades-spike.md` — WebMCP de navegador; não é o servidor MCP externo desta evolução.
- `src/lib/activities/service.ts`, `repository.ts`, `domain-events.ts`, `queries.ts`, `types.ts` e `src/app/app/atividades/actions.ts`.
- `src/lib/db/schema/activities.ts`, `audit.ts` e `integrations.ts`.
- `src/lib/integrations/outbox.ts`, `verify-request.ts`, `keys/service.ts` e `src/lib/integrations/rate-limit.ts`.
- Issue #503 — “feat: Atividades como sistema institucional (comentários, labels, API, MCP)”.
