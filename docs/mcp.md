# Integração MCP para Atividades

**Status:** rascunho de arquitetura para F7 / P0.7–P1.4.
**Escopo:** tools institucionais de Atividades sobre a API autenticada. Não implementa um servidor MCP nem altera o WebMCP existente.

## 1. Limites da solução

Há duas superfícies diferentes no repositório:

- **WebMCP de navegador já existente:** `src/lib/webmcp/catalog.ts` registra tools no `document.modelContext`; `src/lib/webmcp/register.ts` faz o registro e `src/lib/webmcp/build-tools.ts` constrói tools que navegam ou chamam Server Actions. Hoje existem `open-activities`, `open-activity`, `start-create-activity`, `complete-activity` e `assign-activity`.
- **MCP externo previsto nesta evolução:** servidor/adaptador para agentes, autenticado por API key e scopes, que expõe as tools com nomes `activities_*` abaixo. A Issue #432, referente ao servidor MCP externo, continua fora do baseline; os nomes desta página são contrato-alvo, não APIs já disponíveis.

O MCP não é uma camada alternativa de domínio. Ele traduz a chamada de uma tool para a API de Atividades (ou para uma interface de integração equivalente), e a API chama os services de `src/lib/activities/`. O adaptador não acessa PostgreSQL, Drizzle, `domain_events` ou `audit_logs` diretamente.

## 2. Arquitetura alvo

```text
Agente
  │ chamada de tool MCP
  ▼
MCP (adaptador fino)
  │ requisição REST assinada
  ▼
API Key → Scopes
  │ x-asof-key + x-asof-timestamp + x-asof-signature
  ▼
API /api/v1/activities
  │ validação, autorização e rate limiting
  ▼
Activity Service (`src/lib/activities/`)
  ├── Repository → PostgreSQL
  ├── Outbox de eventos → dispatch/retry de webhooks
  ├── Notificações in-app quando aplicável
  └── Auditoria (`actor_type = api_key`)
```

O fluxo normativo é:

**Agente → MCP → API Key → Scopes → Activity Service → Auditoria**

A UI Next.js segue usando Server Actions e sessão. A implementação do MCP deve preservar o mesmo contrato de domínio, mas não deve fingir que uma sessão de navegador é uma identidade de agente.

## 3. Tools previstas

### P0 — operação essencial

| Tool                   | Descrição                                                                                                                                                                                        | Escopo mínimo        | Dependências no baseline                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `activities_list`      | Lista atividades de forma limitada e previsível, com os filtros suportados pelo contrato REST. Deve ser paginada/limitada; não carrega o board inteiro nem cria uma consulta paralela sem limite | `activities:read`    | `findActivities` já é bounded, mas não existe endpoint MCP/API de atividades                                            |
| `activity_get`         | Retorna uma atividade por ID, incluindo os dados necessários para operação institucional e os relacionamentos que a API decidir expor                                                            | `activities:read`    | `findActivityById` existe; não há rota REST de atividades                                                               |
| `activity_create`      | Cria uma atividade validada, com título, descrição, status/prioridade, responsável, associado, prazo e tags nos limites do domínio                                                               | `activities:write`   | `createActivityService` existe; hoje a ferramenta WebMCP apenas navega para `start-create-activity`                     |
| `activity_update`      | Atualiza os campos permitidos de uma atividade e preserva transição de status, auditoria, eventos e lock otimista                                                                                | `activities:write`   | `updateActivityService` e `updateActivityAction` existem                                                                |
| `activity_complete`    | Conclui uma atividade pela transição de status do domínio, produzindo os eventos/auditoria correspondentes                                                                                       | `activities:write`   | O WebMCP `complete-activity` já chama `updateActivityAction` com `status: 'concluido'`; a tool externa ainda não existe |
| `activity_add_comment` | Adiciona comentário a uma atividade, com validação, sanitização, autoria da API key, auditoria e evento de domínio                                                                               | `activities:comment` | Comentários e `activity_comments` ainda não existem; dependem de F1                                                     |

### P1 — cobertura complementar

| Tool                    | Descrição                                                                                          | Escopo mínimo      | Dependências no baseline                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| `activity_reopen`       | Reabre uma atividade concluída conforme as transições permitidas pelo domínio e registra a mudança | `activities:write` | Não há ação, endpoint ou evento `activity.reopened` hoje              |
| `activity_list_labels`  | Lista labels institucionais ativas que podem ser consultadas ou associadas                         | `activities:read`  | Não há entidades de labels; dependem de F2                            |
| `activity_add_label`    | Associa uma label existente a uma atividade, com idempotência da associação e auditoria/evento     | `activities:write` | Não há `activity_labels`/`activity_label_assignments`; dependem de F2 |
| `activity_remove_label` | Remove a associação de uma label de uma atividade, sem apagar fisicamente a entidade label         | `activities:write` | Não há service ou persistência de labels; dependem de F2              |

Os nomes e a separação P0/P1 seguem o planejamento de Atividades. Eles não devem ser adicionados ao `WEBMCP_CATALOG` como se fossem as tools de navegador: o catálogo atual usa nomes com hífen e um modelo de execução client-side diferente.

### Contratos que o MCP deve preservar

- `activity_create` e `activity_update` passam pelo service, não por INSERT/UPDATE montado pelo adaptador.
- `activity_update`, `activity_complete` e `activity_reopen` preservam a concorrência otimista; uma versão concorrente não pode ser silenciosamente sobrescrita.
- Comentários usam exclusão lógica quando a operação de remoção existir; não há exclusão física de atividade via MCP.
- Labels são entidades configuráveis, distintas do `activities.tags` legado. Não converter tags durante a chamada de uma tool.
- A listagem é limitada. O MCP não reutiliza o board inteiro em memória nem cria uma consulta sem paginação para satisfazer um agente.

## 4. Segurança e autorização

### Autenticação da requisição

A rota REST usada pelo MCP deve reutilizar `authorizeIntegrationRequest`/`verifyIntegrationRequest` em `src/lib/integrations/verify-request.ts`. O fluxo existente:

1. recebe `x-asof-key`, `x-asof-timestamp` e `x-asof-signature`;
2. valida timestamp dentro da tolerância configurada;
3. lê o corpo e calcula/verifica HMAC sobre método, caminho com query, timestamp e corpo;
4. procura a chave table-backed pelo hash SHA-256 e usa o segredo de assinatura cifrado;
5. grava um nonce com restrição única para rejeitar replay;
6. atualiza `lastUsedAt` sem expor a credencial;
7. retorna uma principal de integração com `keyId` e scopes, nunca com o token bruto.

`integration_api_keys` já possui hash, segredo cifrado, ativação/revogação, rotação e `lastUsedAt`. A chave exibida uma vez não deve aparecer em prompt, payload, resposta, log, métrica ou auditoria.

### Scopes

F6 deve acrescentar a `VALID_SCOPES` de `src/lib/integrations/keys/service.ts`:

- `activities:read`: `activities_list`, `activity_get` e `activity_list_labels`;
- `activities:write`: criação, atualização, conclusão, reabertura e associação/remoção de labels;
- `activities:comment`: inclusão de comentários.

`activities:admin` não é escopo inicial. Só deve ser criado se houver necessidade administrativa concreta e uma decisão específica. Um endpoint deve exigir o scope mínimo correspondente; o adaptador não pode tratar uma chave com `activities:read` como chave de escrita.

`authorizeIntegrationRequest` já recebe `requiredScopes` e retorna erro de escopo insuficiente para uma chave table-backed sem o scope requerido. API keys de variável de ambiente são legado de acesso irrestrito no código atual; não são o mecanismo preferencial para as tools externas de escrita, porque não oferecem `actor_api_key_id` table-backed.

### RBAC e regras de negócio

Escopo de integração não substitui regra de negócio. A API e o service devem:

- validar entrada com os mesmos limites do domínio;
- aplicar as regras de autorização server-side, sem confiar no agente ou na descrição da tool;
- manter a distinção entre sessão humana (`admin`, `diretoria`, `secretaria`) e principal de integração;
- retornar erro de não autenticação, escopo insuficiente, entidade inexistente, conflito ou validação sem vazar dados sensíveis;
- aplicar rate limiting por chave/rota conforme o risco da operação.

O MCP não contorna `requireRole`, `defineFormAction`, `authorizeIntegrationRequest` ou qualquer policy equivalente. O fato de uma tool ser publicada para um agente não amplia o conjunto de operações permitidas.

### Auditoria e distinção de atores

RF-10/D-23 exige que uma ação de agente seja distinguível de uma ação humana. A migration de auditoria deve adicionar:

- `actor_type`: `admin | api_key | system`;
- `actor_api_key_id`: FK opcional para `integration_api_keys`;
- preservação de `performedBy` para o admin humano.

Toda chamada MCP autenticada por uma chave table-backed deve gerar auditoria com `actor_type = 'api_key'`, `actor_api_key_id` apontando para a chave e `performedBy` nulo. O service recebe somente esse contexto seguro; não recebe nem persiste o token. A timeline deve conseguir mostrar o tipo/identificador da chave sem exigir um nome de admin.

A auditoria é parte do contrato de cada tool de escrita. O padrão atual de Atividades é mutação + outbox atômicos dentro da transação e auditoria best-effort pós-commit via `logAuditBestEffort`; se uma nova operação exigir durabilidade estrita, deve usar `logAuditAction` com executor explícito e testar o efeito sobre a transação. A escolha não pode ser escondida dentro do adaptador MCP.

## 5. Fluxo de uma operação de escrita

```text
1. Agente solicita `activity_update`.
2. MCP valida apenas o formato básico da entrada e assina a requisição.
3. API verifica chave, HMAC, timestamp, nonce, rate limit e scope.
4. API resolve a principal (`api_key`, id seguro) e a política da operação.
5. API chama `updateActivityService` com o contexto do ator.
6. Service valida, aplica lock otimista e grava mutação + outbox na mesma tx.
7. Após commit, grava auditoria conforme o contrato e dispara o dispatcher sem bloquear a mutação.
8. API retorna envelope padronizado; o MCP traduz o resultado sem remover erros de autorização.
```

O desenho deve permitir correlacionar requisição, auditoria e evento sem expor segredo. `requestId` é metadado operacional; não substitui `actor_api_key_id`.

## 6. API e persistência

A superfície HTTP alvo de F5 é:

- `GET/POST /api/v1/activities`;
- `GET/PATCH /api/v1/activities/:id`;
- `POST /api/v1/activities/:id/complete`;
- `POST /api/v1/activities/:id/reopen`;
- `GET/POST /api/v1/activities/:id/comments`;
- `GET /api/v1/activity-labels`.

Essas rotas ainda não existem no baseline. O MCP deve depender delas somente quando forem implementadas, com schemas Zod, envelope de integração, rate limiting, testes de autorização e integração. O caminho de persistência deve continuar sendo:

```text
MCP → API → Activity Service → Repository → PostgreSQL
                         ├── audit_logs
                         └── domain_events → webhooks
```

Não há acesso direto a tabelas pelo MCP, não há banco compartilhado com o agente e não há microserviço, Redis, fila própria ou tRPC nesta evolução.

## 7. Feature flag, rollout e observabilidade

`ACTIVITY_MCP_ENABLED` controla a publicação/aceitação do adaptador MCP. Desligar a flag deve bloquear as tools externas no servidor, mas não revoga API keys nem substitui a checagem de scope. A autorização continua obrigatória quando a flag estiver ligada.

Durante a estabilização:

- registrar `activity_mcp.calls` e `activity_mcp.errors` sem token, segredo ou PII desnecessária;
- medir chamadas por tool, resultado de autorização, latência e conflitos sem armazenar o conteúdo livre do comentário;
- testar input inválido, não autenticado, scope insuficiente, entidade inexistente, concorrência, replay, rate limit e erro interno;
- desligar a flag como rollback lógico, mantendo migrations, dados e auditoria;
- aceitar reentrega do outbox e garantir que operações repetidas não criem efeitos duplicados onde o contrato exigir idempotência.

A publicação de uma tool destrutiva exige revisão adicional. Nesta fase, não publicar exclusão física de atividade; remoção de associação de label e exclusão lógica de comentário seguem os serviços e a auditoria próprios.

## Referências verificadas

- `src/lib/webmcp/catalog.ts`, `register.ts`, `build-tools.ts` e `types.ts` — WebMCP de navegador atual.
- `src/lib/activities/service.ts`, `repository.ts` e `domain-events.ts` — service, lock otimista e outbox atuais.
- `src/app/app/atividades/actions.ts` — actions existentes e papéis de sessão.
- `src/lib/integrations/verify-request.ts`, `keys/service.ts`, `types.ts` e `rate-limit.ts` — autenticação e scopes existentes.
- `src/lib/db/schema/audit.ts` e `src/lib/audit/service.ts` — lacuna atual de `actor_type` e contrato de auditoria.
- `docs/activities.md` — mapa de impacto, eventos RF-04, migrations e rollback.
- `docs/adr/018-activity-domain-events-outbox.md` — invariantes de outbox e dispatch.
- `plans/018-webmcp-atividades-spike.md` — distinção entre WebMCP de navegador e servidor MCP externo.
