# API Documentation — ASOF Intranet

> Documentação dos endpoints HTTP públicos atualmente expostos pela ASOF Intranet.
> Última atualização: 2026-06-19

---

## Visao Geral

A superficie HTTP publica atual da ASOF Intranet e pequena e intencionalmente restrita.

Hoje existem **15 endpoints HTTP expostos**, com superficie publica intencionalmente pequena:

| Metodo        | Rota                                 | Finalidade                                                                                         |
| ------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `GET`         | `/app/associados/relatorio/download` | Exportar associados filtrados em CSV                                                               |
| `GET`         | `/api/oficios/[id]/download`         | Gerar e baixar PDF de um oficio                                                                    |
| `GET`         | `/api/v1/health`                     | Healthcheck autenticado da fundacao de integracoes                                                 |
| `GET`, `POST` | `/api/v1/events`                     | Superficie administrativa para dispatch outbound-only; sem ingestao inbound                        |
| `GET`         | `/api/v1/events/dispatch`            | Dispatch agendado por cron bearer para pendencias e retries outbound                               |
| `GET`         | `/api/v1/juridico/sla-warnings`      | Job agendado por cron bearer para emitir notificacoes de SLA juridico                              |
| `POST`        | `/api/v1/email-triage/process`       | Processar emails pendentes na triagem (cron ou manual)                                             |
| `POST`        | `/api/v1/gmail-webhook`              | Webhook de notificacao push do Gmail (Pub/Sub)                                                     |
| `GET`         | `/api/v1/cron/gmail-watch`           | Renovacao semanal do watch Gmail (cron bearer)                                                     |
| `GET`         | `/api/v1/cron/lgpd-retention`        | Job agendado de retencao e anonimizacao LGPD (cron bearer)                                         |
| `GET`         | `/api/v1/cron/overdue-payments`      | Marca mensalidades vencidas pendente → atrasado via `autoMarkOverduePaymentsService` (cron bearer) |
| `GET`         | `/api/v1/cron/cleanup-nonces`        | Limpa nonces expirados de replay protection (cron bearer, diário 01:00 UTC)                        |
| `GET`         | `/api/v1/mailing/process`            | Processa a fila de campanhas de e-mail em lote (cron bearer, diário 07:00 UTC)                     |
| `POST`        | `/app/etiquetas/gerar`               | Geracao administrativa de etiquetas Pimaco em PDF                                                  |
| `POST`        | `/api/webhooks/assinafy`             | Webhook de retorno de assinatura digital (Assinafy)                                                |

### O que esta fora deste documento

- `Server Actions` em `src/app/**/actions.ts`
- consultas internas feitas por `Server Components`
- acesso direto ao banco via Drizzle
- qualquer API publica ampla para terceiros

### Padrao arquitetural atual

| Superficie       | Uso                                        | Localizacao             |
| ---------------- | ------------------------------------------ | ----------------------- |
| `Route Handlers` | Endpoints HTTP publicos                    | `src/app/**/route.ts`   |
| `Server Actions` | Mutacoes internas disparadas pela UI React | `src/app/**/actions.ts` |

---

## Autenticacao e Autorizacao

### Sessao

Os endpoints legados usam a sessao autenticada da intranet, baseada em cookie de sessao assinado com HMAC (`session`) server-side.

### Fundacao M2M (`/api/v1/*`)

As rotas versionadas novas aceitam **uma de duas formas de autenticacao**:

1. assinatura M2M por headers (`x-asof-key`, `x-asof-timestamp`, `x-asof-signature`)
2. fallback de sessao humana autorizada, apenas para operadores internos, exceto `/api/v1/events/dispatch`, que e bearer-only para evitar dispatch por navegacao/CSRF

O caminho M2M principal usa chaves persistidas em `integration_api_keys`, criadas por admin em `/app/config/integracoes/api-keys`. A chave de API e o segredo HMAC por chave sao exibidos uma unica vez na criacao ou rotacao. A chave de API fica armazenada como hash, o segredo HMAC fica criptografado com `ENCRYPTION_MASTER_KEY`, e cada request e rate-limited por hash do token quando `x-asof-key` esta presente (fallback por IP quando nao ha token). Chaves persistidas sao avaliadas por escopo:

- `events:read` para `GET /api/v1/events`
- `events:write` para `POST /api/v1/events`
- `webhooks:manage` para operacoes administrativas de webhooks por API
- `admin` reservado para acesso completo futuro

O fluxo M2M usa:

- `ASOF_INTEGRATIONS_ENABLED=true` para habilitar a verificacao M2M
- segredo HMAC por chave, exibido uma unica vez junto da API key persistida, para assinar requests de chaves criadas na UI
- `ENCRYPTION_MASTER_KEY` para criptografar e decriptografar os segredos HMAC por chave
- `ASOF_INTEGRATION_HMAC_SECRET` apenas para a chave global legada e fallback temporario de linhas antigas de `integration_api_keys` sem segredo por chave
- `ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS` para janela de tolerancia; default `300`
- `ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY` apenas para decriptografar secrets legados V1; novos secrets usam `ENCRYPTION_MASTER_KEY` com formato V2 (HKDF com separação de domínio)
- `CRON_SECRET` para autorizar os endpoints agendados `/api/v1/events/dispatch` e `/api/v1/juridico/sla-warnings`
- `ASOF_INTEGRATION_API_KEY` apenas como compatibilidade legada para chave global sem escopos; nao configurar em producao nova sem excecao registrada

Quando a chave global legada autoriza uma request, o servidor emite `logger.warn` estruturado com `requestId`, metodo, path e user-agent, sem registrar a chave nem o HMAC secret.

Headers esperados:

```http
X-ASOF-Key: <api-key>
X-ASOF-Timestamp: <unix-seconds>
X-ASOF-Signature: sha256=<hex-hmac>
```

Para chaves persistidas, o HMAC usa o segredo mostrado junto da API key na criacao ou rotacao. Para a chave global legada `ASOF_INTEGRATION_API_KEY`, o HMAC usa `ASOF_INTEGRATION_HMAC_SECRET`.

Payload canonico assinado:

```text
<HTTP_METHOD_UPPERCASE>
<pathname+query>
<timestamp>
<sha256_hex_do_body>
```

Exemplo:

```text
GET
/api/v1/health
1763078400
e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
```

### Roles

| Role         | Acesso                                                               |
| ------------ | -------------------------------------------------------------------- |
| `admin`      | acesso completo aos endpoints atuais                                 |
| `diretoria`  | acesso completo aos endpoints atuais                                 |
| `secretaria` | acesso ao download de oficios; sem acesso ao relatorio de associados |

### Logging e Observabilidade

Erros em endpoints HTTP são logados via `src/lib/logger.ts` com redação automática de PII. O logger estruturado emite JSON em produção e formato colorizado em desenvolvimento, com nível configurável via `LOG_LEVEL`.

### Observação importante

Não existem hoje:

- OAuth de integracao
- tokens de acesso pessoal
- webhooks inbound publicos
- ingestao inbound de eventos

A fundacao `/api/v1/*` existe para padronizar autenticacao e envelopes JSON, mas ainda nao representa uma API publica ampla.

### Seguranca dos webhooks outbound

Webhooks outbound sao assinados com HMAC SHA-256 usando o secret da subscription. O secret fica persistido como `secret_ciphertext` e deve ser gerado por `encryptWebhookSecret()`, que usa AES-256-GCM com HKDF (formato V2 `enc:v2:{keyId}.{iv}.{authTag}.{ciphertext}`) derivado de `ENCRYPTION_MASTER_KEY`. A funcao `decryptWebhookSecret()` suporta V2 (HKDF com `ENCRYPTION_MASTER_KEY`) e V1 legado (SHA-256 com `ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY`).

Subscriptions aceitam apenas `targetUrl` HTTPS e publico. O schema de entrada rejeita HTTP, localhost, hostnames locais/internos e faixas IPv4/IPv6 privadas, loopback, link-local ou reservadas para reduzir risco de SSRF. Para testes locais, use um endpoint publico controlado ou tunnel temporario.

Secrets sem prefixo de criptografia (`enc:v1:` ou `enc:v2:`) sao rejeitados com erro pela funcao `decryptWebhookSecret()`. Nao existe compatibilidade com texto puro — todo webhook secret deve estar criptografado com V1 ou V2. O fluxo de migracao para V2 e: acessar `/app/config/integracoes/webhooks`, usar "Rotacionar segredo" para gerar um novo valor com pelo menos 32 caracteres; o novo secret sera criptografado automaticamente no formato V2 (`enc:v2:`). Operadores `admin` devem revisar subscriptions com secrets V1 e rotaciona-los para migrar para V2.

Os payloads do outbox passam por allowlist por tipo de evento antes de persistir em `domain_events.payload`. Antes do envio HTTP, o dispatcher aplica sanitizacao defensiva adicional em chaves sensiveis como CPF, SIAPE, email, endereco, telefone, tokens e secrets.

### Tipos de evento suportados (outbox de webhooks)

Subscriptions filtram por tipo de evento. A lista canônica de valores vive no enum `domain_event_type` (`src/lib/db/schema/integrations.ts`) e em `payloadSchemaByEventType` (`src/lib/integrations/outbox.ts`); o vocabulário de domínio está em `CONTEXT.md`.

- `associate.updated` — associado atualizado
- `legal_consultation.created` — consulta jurídica criada
- `legal_consultation.status_changed` — status de consulta jurídica alterado
- `official_letter.created` — ofício criado
- `official_letter.published` — ofício publicado
- `official_letter.status_changed` — status de ofício alterado
- `monthly_payment.updated` — mensalidade atualizada
- `activity.created` — atividade criada no Kanban
- `activity.status_changed` — transição de status de atividade (`a_fazer`/`em_andamento`/`aguardando_terceiros`/`concluido`)
- `activity.assigned` — atribuição/reatribuição de responsável (não emitido em auto-atribuição)
- `activity.completed` — transição para `concluido` (emitido em paralelo a `activity.status_changed`)
- `activity.priority_changed` — mudança de prioridade
- `activity.due_date_changed` — mudança de vencimento

Os eventos `activity.*` são emitidos transacionalmente em `db.transaction` junto com a mutação do Kanban (`src/lib/activities/service.ts`), com dispatch inline fire-and-forget após commit. Payloads levam apenas IDs + `links.app` (sem `title`/`description`, minimização de PII no outbox que retém 90 dias). O roteamento do destinatário (ex.: notificar o `createdById` — coordenador — em vez do `actorAdminId`) é decisão do consumer. Ver ADR 018.

---

## Endpoints Publicos

### 1. Download de Relatorio de Associados

**Metodo:** `GET`
**Rota:** `/app/associados/relatorio/download`

#### Descricao

Gera um arquivo CSV UTF-8 com BOM contendo associados filtrados. O endpoint consulta o banco em tempo real, aplica filtros simples de status e mes de aniversario, registra auditoria do download e retorna o arquivo como anexo.

#### Autorizacao

- Requer sessao autenticada
- Roles permitidas: `admin`, `diretoria`
- `secretaria` nao tem acesso

#### Query Parameters

| Parametro            | Tipo       | Obrigatorio | Valores aceitos                                        | Descricao                                          |
| -------------------- | ---------- | ----------- | ------------------------------------------------------ | -------------------------------------------------- |
| `fields`             | `string[]` | Nao         | ver lista abaixo                                       | Campos a incluir no CSV; se omitido, exporta todos |
| `functionalStatus`   | `string`   | Nao         | `ativo`, `aposentado`, `cedido`, `em_licenca`, `todos` | Filtra pela situacao funcional                     |
| `associationStatus`  | `string`   | Nao         | `associado`, `nao_associado`, `todos`                  | Filtra pelo vínculo ASOF                           |
| `contributionStatus` | `string`   | Nao         | `em_dia`, `inadimplente`, `todos`                      | Filtra pela contribuicao                           |
| `birthMonth`         | `number`   | Nao         | `1` a `12`, `todos`                                    | Filtra pelo mes de aniversario                     |

#### Campos disponiveis em `fields`

`fullName`, `primaryEmail`, `secondaryEmail`, `birthDate`, `cpf`, `address`, `locationCity`, `locationCountry`, `phone`, `whatsapp`, `siape`, `assignment`, `assignmentStartDate`, `classPattern`, `functionalStatus`, `associationStatus`, `contributionStatus`, `joinedAt`, `associationCategory`

#### Formato da solicitacao

Exemplo:

```http
GET /app/associados/relatorio/download?fields=fullName&fields=cpf&fields=siape&functionalStatus=ativo&associationStatus=associado HTTP/1.1
Cookie: <sessao autenticada>
```

#### Resposta de sucesso

**Status:** `200 OK`

**Headers principais:**

```http
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="relatorio-asof-YYYY-MM-DD.csv"
```

**Body:** texto CSV UTF-8 com BOM.

Exemplo ilustrativo:

```csv
"Nome completo","CPF","SIAPE"
"Fulano de Tal","000.000.000-00","1234567"
```

#### Respostas de erro

| Status                      | Quando ocorre                                   | Observacoes                                                                             |
| --------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `403 Forbidden`             | sessao ausente ou role sem permissao            | hoje o helper retorna `403` sem distinguir claramente nao autenticado de nao autorizado |
| `429 Too Many Requests`     | limite de 10 requisicoes/minuto por IP excedido | retorna header `Retry-After`                                                            |
| `500 Internal Server Error` | falha ao consultar dados ou gerar o CSV         | corpo: `Falha ao gerar relatório.`                                                      |

#### Exemplo de uso

```bash
curl -L \
  -H "Cookie: session=VALOR_DO_COOKIE" \
  "https://intranet.asof.com.br/app/associados/relatorio/download?fields=fullName&fields=cpf&fields=siape&functionalStatus=ativo&associationStatus=associado" \
  -o relatorio-asof.csv
```

#### Auditoria e seguranca

Cada download tenta registrar um evento em `audit_logs` com:

- `action: report_download`
- `entityType: associate`
- filtros aplicados
- campos selecionados
- quantidade de linhas exportadas

Se a auditoria falhar, o download continua.

#### Limitacoes e restricoes

- So ha suporte a `GET`
- Nao ha paginacao: o endpoint exporta o conjunto inteiro que casar com os filtros
- Nao ha ordenacao customizavel por query string
- Parametros invalidos sao ignorados silenciosamente em vez de gerar `400`
- O CSV pode incluir dados LGPD sensiveis como `cpf`, `siape`, `address`, `phone`, `whatsapp` e emails
- O endpoint depende de sessao humana autenticada; nao foi projetado para integracoes M2M

---

### 2. Download de PDF de Oficio

**Metodo:** `GET`  
**Rota:** `/api/oficios/[id]/download`

#### Descricao

Busca um oficio pelo ID numerico, gera o PDF sob demanda e devolve o arquivo como anexo.

#### Autorizacao

- Requer sessao autenticada
- Roles permitidas: `admin`, `diretoria`, `secretaria`

#### Path Parameters

| Parametro | Tipo     | Obrigatorio | Descricao             |
| --------- | -------- | ----------- | --------------------- |
| `id`      | `number` | Sim         | ID numerico do oficio |

#### Formato da solicitacao

Exemplo:

```http
GET /api/oficios/42/download HTTP/1.1
Cookie: <sessao autenticada>
```

#### Resposta de sucesso

**Status:** `200 OK`

**Headers principais:**

```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="OF_CIO_No_001_2026_ASOF.pdf"
```

**Body:** bytes do PDF gerado no momento da requisicao.

#### Respostas de erro

| Status                      | Quando ocorre                           | Observacoes                                                                                      |
| --------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `400 Bad Request`           | `id` nao e numerico                     | corpo: `ID inválido`                                                                             |
| `404 Not Found`             | oficio inexistente                      | corpo: `Ofício não encontrado`                                                                   |
| `307 Temporary Redirect`    | sessao ausente ou role sem permissao    | via `requireRole()`: sem sessao redireciona para `/login`; role invalida redireciona para `/app` |
| `500 Internal Server Error` | falha ao buscar o oficio ou gerar o PDF | corpo: `Erro ao gerar PDF`                                                                       |

#### Exemplo de uso

```bash
curl -L \
  -H "Cookie: session=VALOR_DO_COOKIE" \
  "https://intranet.asof.com.br/api/oficios/42/download" \
  -o oficio-42.pdf
```

#### Auditoria e seguranca

Cada download tenta registrar um evento em `audit_logs` com:

- `action: official_letter_downloaded`
- `entityType: official_letter`
- `entityId`
- metadado com `number`

Se a auditoria falhar, o download continua.

#### Limitacoes e restricoes

- So ha suporte a `GET`
- O PDF e gerado sob demanda; nao ha URL pre-assinada nem cache publico
- O endpoint depende de sessao humana autenticada; nao ha token de integracao
- O nome do arquivo e sanitizado para ASCII seguro no header `Content-Disposition`
- O endpoint nao expõe metadados JSON do oficio; ele retorna apenas o arquivo PDF

---

### 3. Healthcheck de Integracoes

**Metodo:** `GET`  
**Rota:** `/api/v1/health`

#### Descricao

Retorna um envelope JSON padronizado confirmando que a superficie versionada de integracoes esta ativa. O endpoint foi endurecido para nao expor detalhes operacionais desnecessarios de configuracao.

#### Autorizacao

- aceita assinatura M2M valida
- ou sessao humana com role `admin` ou `diretoria` (rate-limited: 60 req/15 min por IP)

#### Respostas de erro

| Status                    | Quando ocorre                                                                   |
| ------------------------- | ------------------------------------------------------------------------------- |
| `401 Unauthorized`        | headers M2M ausentes/invalidos e sem sessao autorizada                          |
| `403 Forbidden`           | sessao humana existe, mas sem role permitida                                    |
| `429 Too Many Requests`   | limite de 60 requisicoes por 15 minutos por IP excedido (`rate_limit_exceeded`) |
| `503 Service Unavailable` | integracoes habilitadas sem configuracao completa                               |

#### Resposta de sucesso

**Status:** `200 OK`

```json
{
  "ok": true,
  "data": {
    "service": "asof-intranet",
    "scope": "integrations",
    "status": "ok",
    "auth": {
      "authenticated": true,
      "principalType": "integration"
    },
    "capabilities": {
      "inboundEvents": false,
      "outboundWebhooks": true
    },
    "deployment": {
      "gitCommitSha": "0123456789abcdef0123456789abcdef01234567"
    }
  },
  "meta": {
    "apiVersion": "v1",
    "requestId": "req-id",
    "timestamp": "2026-05-13T00:00:00.000Z"
  }
}
```

`deployment` expoe somente o SHA completo do commit do deployment, ou `null`
quando a variavel de sistema da Vercel estiver ausente ou malformada. Mensagem,
branch e autor do commit nao sao retornados.

#### Respostas de erro

| Status                    | Quando ocorre                                          |
| ------------------------- | ------------------------------------------------------ |
| `401 Unauthorized`        | headers M2M ausentes/invalidos e sem sessao autorizada |
| `403 Forbidden`           | sessao humana existe, mas sem role permitida           |
| `503 Service Unavailable` | integracoes habilitadas sem configuracao completa      |

---

### 4. Dispatch de Eventos Versionado

**Metodos:** `GET`, `POST`  
**Rota:** `/api/v1/events`

#### Descricao

Rota administrativa da camada outbound-only. Ela nao aceita ingestao inbound, mas ja permite disparar a entrega de eventos pendentes ou de um evento especifico previamente persistido em `domain_events`.

#### Autorizacao

- aceita assinatura M2M valida
- ou sessao humana com role `admin`

#### Comportamento atual

- `GET` retorna metadados da superficie outbound com `implemented: true`
- `POST` executa dispatch outbound:
  - sem body, processa lote pendente
  - com `eventId`, processa um evento especifico
  - com `limit`, limita o lote entre `1` e `100`
- o body de `POST` e validado por Zod; campos desconhecidos ou tipos invalidos retornam `400`
- cada dispatch manual grava auditoria em `audit_logs` com `entityType: domain_event`
- `PUT`, `PATCH` e `DELETE` retornam `405 Method Not Allowed`

#### Formato da solicitacao `POST`

Batch:

```json
{
  "limit": 20
}
```

Evento especifico:

```json
{
  "eventId": 123
}
```

#### Exemplo de resposta de sucesso

```json
{
  "ok": true,
  "data": {
    "mode": "batch",
    "result": {
      "processed": 2,
      "results": [
        {
          "dispatched": true,
          "eventId": 123,
          "subscriptions": 1,
          "results": ["delivered"]
        }
      ]
    }
  },
  "meta": {
    "apiVersion": "v1",
    "requestId": "req-id",
    "timestamp": "2026-05-13T00:00:00.000Z"
  }
}
```

#### Exemplo de erro esperado

```json
{
  "ok": false,
  "error": {
    "code": "invalid_request",
    "message": "Invalid payload."
  },
  "meta": {
    "apiVersion": "v1",
    "requestId": "req-id",
    "timestamp": "2026-05-13T00:00:00.000Z"
  }
}
```

---

### 5. Dispatch Agendado de Eventos

**Metodo:** `GET`
**Rota:** `/api/v1/events/dispatch`

#### Descricao

Processa eventos pendentes do outbox para webhooks outbound. A rota e bearer-only e foi criada para ser chamada por Vercel Cron. Operacao manual por usuario interno deve usar `POST /api/v1/events`, que exige sessao `admin` ou assinatura M2M.

#### Autorizacao

- `Authorization: Bearer <CRON_SECRET>` para chamadas agendadas
- sessao humana nao e aceita nesta rota
- se um bearer token for enviado e estiver incorreto, a rota retorna `401`
- se `CRON_SECRET` nao estiver configurado para chamada bearer, a rota retorna `503`

#### Query Parameters

| Parametro | Tipo     | Obrigatorio | Descricao                                       |
| --------- | -------- | ----------- | ----------------------------------------------- |
| `limit`   | `number` | Nao         | Tamanho do lote entre `1` e `100`; default `20` |

#### Exemplo de solicitacao

```http
GET /api/v1/events/dispatch?limit=20 HTTP/1.1
Authorization: Bearer <CRON_SECRET>
```

---

### 6. Avisos Agendados de SLA Juridico

**Metodo:** `GET`
**Rota:** `/api/v1/juridico/sla-warnings`

#### Descricao

Executa o job de verificacao de consultas/processos juridicos com SLA proximo do vencimento e emite notificacoes internas. A rota e bearer-only e foi criada para Vercel Cron.

#### Autorizacao

- `Authorization: Bearer <CRON_SECRET>` para chamadas agendadas
- sessao humana nao e aceita nesta rota
- se um bearer token for enviado e estiver incorreto, a rota retorna `401`
- se `CRON_SECRET` nao estiver configurado, a rota retorna `503`

#### Query Parameters

| Parametro | Tipo     | Obrigatorio | Descricao                                       |
| --------- | -------- | ----------- | ----------------------------------------------- |
| `limit`   | `number` | Nao         | Tamanho do lote entre `1` e `100`; default `50` |

#### Exemplo de solicitacao

```http
GET /api/v1/juridico/sla-warnings?limit=50 HTTP/1.1
Authorization: Bearer <CRON_SECRET>
```

#### Resposta de sucesso

```json
{
  "ok": true,
  "data": {
    "mode": "scheduled",
    "result": {
      "scanned": 5,
      "eligible": 3,
      "emitted": 3,
      "skipped": 2,
      "failed": 0,
      "limit": 50,
      "failures": []
    }
  },
  "meta": {
    "apiVersion": "v1",
    "requestId": "req-id",
    "timestamp": "2026-05-14T00:00:00.000Z"
  }
}
```

#### Auditoria e restricoes

Cada execucao grava `audit_logs.action = domain_event_dispatch_scheduled`. O endpoint nao ingere eventos externos e nao aceita `POST`; ele apenas consome `domain_events` ja persistidos por servicos internos.

---

### 7. Processamento de Triagem de Email

**Metodo:** `POST`
**Rota:** `/api/v1/email-triage/process`

#### Descricao

Processa emails pendentes na fila de triagem. Busca emails nao lidos na caixa de entrada do Gmail (controller@asof.org.br), extrai conteudo, classifica com Gemini AI e persiste o resultado em `email_triagens`. Pode ser chamado por cron (bearer) ou manualmente por admin.

#### Autorizacao

- `Authorization: Bearer <CRON_SECRET>` para chamadas agendadas
- ou sessao humana com role `admin`

#### Resposta de sucesso

```json
{
  "ok": true,
  "data": {
    "processed": 3,
    "results": [
      { "emailId": "msg001", "status": "analisado", "triagemId": 42 },
      { "emailId": "msg002", "status": "erro_validacao_ia" }
    ]
  }
}
```

---

### 8. Webhook de Notificacao Push do Gmail

**Metodo:** `POST`
**Rota:** `/api/v1/gmail-webhook`

#### Descricao

Recebe notificacoes push do Gmail via Google Pub/Sub quando novos emails chegam na caixa controller@asof.org.br. Inicia o processamento da triagem para o email notificado. O endpoint e assincrono e nao exige resposta imediata de processamento completo.

#### Autorizacao

- Verifica o token bearer configurado em `GMAIL_WEBHOOK_TOKEN`
- A requisicao vem do Google Pub/Sub, nao de usuarios internos

#### Observacoes

- O watch Gmail e renovado semanalmente pelo cron `/api/v1/cron/gmail-watch`
- A assinatura Pub/Sub e gerenciada externamente (`gmail-inbox-sub`)

---

### 9. Renovacao Agendada do Watch Gmail

**Metodo:** `GET`
**Rota:** `/api/v1/cron/gmail-watch`

#### Descricao

Renova a watch subscription da API Gmail para a caixa controller@asof.org.br. O watch expira a cada 7 dias e precisa ser renovado periodicamente. Executado por Vercel Cron.

#### Autorizacao

- `Authorization: Bearer <CRON_SECRET>` para chamadas agendadas
- sessao humana nao e aceita nesta rota

#### Resposta de sucesso

```json
{
  "ok": true,
  "data": {
    "watchRenewed": true,
    "expiration": "2026-06-10T00:00:00.000Z"
  }
}
```

---

### 9.1 Processamento da Fila de Mala Direta

**Metodo:** `GET`
**Rota:** `/api/v1/mailing/process`

#### Descricao

Processa um lote da fila de campanhas de e-mail (`mailing_campaigns` em `em_envio`). Reivindica destinatários com `FOR UPDATE SKIP LOCKED`, envia via Mailjet e atualiza sucesso/falha por destinatário. Agenda Vercel: diária (`0 7 * * *`, limite Hobby). Lotes extras saem da UI (“Iniciar envio” / “Processar lote”).

#### Autorizacao

- `Authorization: Bearer <CRON_SECRET>`

#### Resposta de sucesso

```json
{
  "ok": true,
  "data": {
    "mode": "scheduled",
    "result": { "processed": 2, "sent": 2, "failed": 0 }
  }
}
```

#### Observacoes

- Não expõe e-mail, nome ou outros PII no JSON nem em logs
- Cancelamento em voo não envia e não promove a campanha de `cancelada` para `concluida`
- Campanha só vai para `falhou` quando todos os destinatários falharam e o status ainda é `em_envio`

---

### 10. Job Agendado de Retencao LGPD

**Metodo:** `GET`
**Rota:** `/api/v1/cron/lgpd-retention`

#### Descricao

Executa a politica de retencao e anonimizacao de dados conforme ADR 006. Anonimiza registros de associados que solicitaram exclusao ou atingiram o prazo de retencao legal. Executado por Vercel Cron.

#### Autorizacao

- `Authorization: Bearer <CRON_SECRET>` para chamadas agendadas
- sessao humana nao e aceita nesta rota

#### Resposta de sucesso

```json
{
  "ok": true,
  "data": {
    "anonymized": 0,
    "retentionApplied": 5,
    "errors": []
  }
}
```

---

### 11. Geracao de Etiquetas Pimaco

**Metodo:** `POST`
**Rota:** `/app/etiquetas/gerar`

#### Descricao

Gera um arquivo PDF A4 com etiquetas Pimaco para impressao administrativa. A geracao e feita server-side e recebe os dados por corpo JSON para evitar PII em query string.

#### Autorizacao

- Requer sessao autenticada
- Roles permitidas: `admin`, `diretoria`, `secretaria`

#### Corpo JSON

| Parametro                 | Tipo                                         | Obrigatorio                        | Descricao                                        |
| ------------------------- | -------------------------------------------- | ---------------------------------- | ------------------------------------------------ |
| `recipientIds`            | `number[]`                                   | Sim, quando `recipients` ausente   | IDs dos associados selecionados                  |
| `recipients`              | `object[]`                                   | Sim, quando `recipientIds` ausente | Destinatarios normalizados para geracao testavel |
| `templateCode`            | `'6182' \| '3080' \| 'A4256'`                | Sim                                | Modelo Pimaco                                    |
| `mode`                    | `'postal' \| 'mala_diplomatica' \| 'custom'` | Sim                                | Modo de impressao                                |
| `selectedFields`          | `string[]`                                   | Nao                                | Campos incluidos quando aplicavel                |
| `flags`                   | `object`                                     | Nao                                | Flags `peo` e `ectOpenable`                      |
| `startPosition`           | `number`                                     | Nao                                | Posicao inicial base 1                           |
| `offsetXmm` / `offsetYmm` | `number`                                     | Nao                                | Ajuste fino em milimetros                        |
| `debug`                   | `boolean`                                    | Nao                                | Desenha bordas para calibracao                   |

#### Observacoes

Nao cria historico de impressao nesta etapa. A UI orienta impressao em folha A4, escala 100%, sem ajuste automatico a pagina.

#### Resposta de sucesso

**Status:** `200 OK`
**Content-Type:** `application/pdf`
**Body:** bytes do PDF com as etiquetas formatadas.

---

### 12. Webhook de Retorno de Assinatura Digital (Assinafy)

**Metodo:** `POST`
**Rota:** `/api/webhooks/assinafy`

#### Descricao

Recebe callbacks da plataforma Assinafy quando um documento e assinado ou rejeitado. Atualiza o status do oficio na intranet e registra o evento de auditoria.

#### Autorizacao

- Verifica header de segredo compartilhado (X-Webhook-Secret) conforme configurado na integracao com Assinafy
- Endpoint publico (nao requer sessao)

#### Payload esperado

```json
{
  "event": "document_signed",
  "documentId": "assinafy-doc-123",
  "status": "signed",
  "signedAt": "2026-06-03T12:00:00Z",
  "signers": [{ "name": "Nome do Signatario", "email": "signatario@example.com" }]
}
```

#### Resposta de sucesso

**Status:** `200 OK`

```json
{ "ok": true }
```

---

## Formatos de Resposta

### Arquivo CSV

Usado por:

- `/app/associados/relatorio/download`

Caracteristicas:

- `Content-Type: text/csv; charset=utf-8`
- BOM UTF-8 para melhor compatibilidade com Excel
- celulas potencialmente perigosas para formula injection sao prefixadas com tab

### Arquivo PDF

Usado por:

- `/api/oficios/[id]/download`

Caracteristicas:

- `Content-Type: application/pdf`
- nome de arquivo retornado em `Content-Disposition`

### Envelope JSON versionado (`/api/v1/*`)

Usado por:

- `/api/v1/health`
- `/api/v1/events`
- `/api/v1/events/dispatch`
- `/api/v1/juridico/sla-warnings`

Caracteristicas:

- `Content-Type: application/json; charset=utf-8`
- `Cache-Control: no-store`
- header `X-Request-Id` espelhado na resposta
- envelope com `ok`, `data` ou `error`, e `meta`

Formato base:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "apiVersion": "v1",
    "requestId": "req-id",
    "timestamp": "2026-05-13T00:00:00.000Z"
  }
}
```

### Erros em texto simples

Os endpoints atuais nao usam envelope JSON padronizado para erros. Hoje os erros HTTP retornam texto simples, por exemplo:

```txt
ID inválido
Ofício não encontrado
Falha ao gerar relatório.
Too many requests.
```

---

## Exemplos de Uso

### Exportar associados ASOF adimplentes

```bash
curl -L \
  -H "Cookie: session=VALOR_DO_COOKIE" \
  "https://intranet.asof.com.br/app/associados/relatorio/download?fields=fullName&fields=primaryEmail&fields=assignment&associationStatus=associado&contributionStatus=em_dia" \
  -o associados-ativos.csv
```

### Exportar aniversariantes de maio

```bash
curl -L \
  -H "Cookie: session=VALOR_DO_COOKIE" \
  "https://intranet.asof.com.br/app/associados/relatorio/download?fields=fullName&fields=birthDate&birthMonth=5" \
  -o aniversariantes-maio.csv
```

### Baixar PDF de oficio

```bash
curl -L \
  -H "Cookie: session=VALOR_DO_COOKIE" \
  "https://intranet.asof.com.br/api/oficios/123/download" \
  -o oficio-123.pdf
```

---

## Limitacoes e Restricoes Gerais

- A API HTTP atual nao e uma API REST completa
- Nao existe documentacao OpenAPI/Swagger
- Nao existem endpoints JSON publicos amplos de consulta ou mutacao de dominio
- A fundacao M2M atual cobre `/api/v1/health`, `/api/v1/events`, `/api/v1/email-triage/process`, `/api/v1/gmail-webhook`, `/api/v1/mailing/process` e os crons `/api/v1/events/dispatch`, `/api/v1/juridico/sla-warnings`, `/api/v1/cron/*` (estes ultimos com bearer `CRON_SECRET`)
- Nao existe OAuth de integracao
- Excecao: `/api/webhooks/assinafy` e um endpoint inbound publico para webhooks da plataforma Assinafy (validacao por header de segredo compartilhado (X-Webhook-Secret))
- A superficie atual foi desenhada para uso por usuarios autenticados na propria intranet
- Como a base contem dados protegidos pela LGPD, qualquer ampliacao de superficie HTTP deve partir de payload minimo, auditoria e controle estrito de permissao
- O cron atual processa pendencias por lote; nao ha fila dedicada externa nem concorrencia distribuida
- No plano Free/Hobby da Vercel, o cron e limitado a execucao diaria; para dispatch mais frequente, use `POST /api/v1/events` manualmente ou migre para Vercel Pro/worker externo
- A UI administrativa de webhook subscriptions e interna e restrita a `admin`; nao ha CRUD publico de subscriptions
- Mutacoes de dominio (ex: enviar ofício para assinatura) sao implementadas como **Server Actions**, nao como endpoints HTTP publicos

---

## Roadmap de API

Parcialmente iniciado no codigo:

- endpoints versionados minimos em `/api/v1/...`
- autenticacao M2M por API key/HMAC/timestamp
- chaves M2M table-backed com escopos em `integration_api_keys`
- outbox de `domain_events`
- dispatch outbound por `/api/v1/events`
- dispatch agendado por `/api/v1/events/dispatch`
- avisos agendados de SLA juridico por `/api/v1/juridico/sla-warnings`
- `webhook_subscriptions.secret_ciphertext` para secrets de webhooks
- auditoria de dispatch manual de eventos
- auditoria de subscription CRUD/rotacao de segredo
- allowlist de payloads por tipo de evento
- **webhook inbound Assinafy** (`/api/webhooks/assinafy`) — implementado, validação HMAC, processamento transacional com notificações

Ainda nao implementado:

- contratos publicos amplos de eventos para terceiros
- endpoints inbound para comandos externos (além do Assinafy)

As rotas novas existem apenas como groundwork; nao devem ser tratadas como API de negocio completa.
