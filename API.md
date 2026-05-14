# API Documentation — ASOF Intranet

> Documentacao dos endpoints HTTP publicos atualmente expostos pela ASOF Intranet.
> Ultima atualizacao: 2026-05-14

---

## Visao Geral

A superficie HTTP publica atual da ASOF Intranet e pequena e intencionalmente restrita.

Hoje existem **5 endpoints HTTP expostos**, mas apenas **3** deles executam trabalho de negocio real:

| Metodo | Rota | Finalidade |
|---|---|---|
| `GET` | `/app/associados/relatorio/download` | Exportar associados filtrados em CSV |
| `GET` | `/api/oficios/[id]/download` | Gerar e baixar PDF de um oficio |
| `GET` | `/api/v1/health` | Healthcheck autenticado da fundacao de integracoes |
| `GET`, `POST` | `/api/v1/events` | Superficie administrativa para dispatch outbound-only; sem ingestao inbound |
| `GET` | `/api/v1/events/dispatch` | Dispatch agendado por cron bearer para pendencias e retries outbound |

### O que esta fora deste documento

- `Server Actions` em `src/app/**/actions.ts`
- consultas internas feitas por `Server Components`
- acesso direto ao banco via Drizzle
- qualquer API publica ampla para terceiros

### Padrao arquitetural atual

| Superficie | Uso | Localizacao |
|---|---|---|
| `Route Handlers` | Endpoints HTTP publicos | `src/app/**/route.ts` |
| `Server Actions` | Mutacoes internas disparadas pela UI React | `src/app/**/actions.ts` |

---

## Autenticacao e Autorizacao

### Sessao

Os endpoints legados usam a sessao autenticada da intranet, baseada em Supabase Auth com cookies server-side.

### Fundacao M2M (`/api/v1/*`)

As rotas versionadas novas aceitam **uma de duas formas de autenticacao**:

1. assinatura M2M por headers (`x-asof-key`, `x-asof-timestamp`, `x-asof-signature`)
2. fallback de sessao humana autorizada, apenas para operadores internos, exceto `/api/v1/events/dispatch`, que e bearer-only para evitar dispatch por navegacao/CSRF

O fluxo M2M atual usa:

- `ASOF_INTEGRATIONS_ENABLED=true` para habilitar a verificacao
- `ASOF_INTEGRATION_API_KEY` como identificador compartilhado da integracao
- `ASOF_INTEGRATION_HMAC_SECRET` como segredo de assinatura
- `ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS` para janela de tolerancia; default `300`
- `ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY` para criptografar secrets de subscriptions outbound
- `CRON_SECRET` para autorizar o endpoint agendado `/api/v1/events/dispatch`

Headers esperados:

```http
X-ASOF-Key: <api-key>
X-ASOF-Timestamp: <unix-seconds>
X-ASOF-Signature: sha256=<hex-hmac>
```

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

| Role | Acesso |
|---|---|
| `admin` | acesso completo aos endpoints atuais |
| `diretoria` | acesso completo aos endpoints atuais |
| `secretaria` | acesso ao download de oficios; sem acesso ao relatorio de associados |

### Observacao importante

Nao existem hoje:

- OAuth de integracao
- tokens de acesso pessoal
- webhooks inbound publicos
- ingestao inbound de eventos

A fundacao `/api/v1/*` existe para padronizar autenticacao e envelopes JSON, mas ainda nao representa uma API publica ampla.

### Seguranca dos webhooks outbound

Webhooks outbound sao assinados com HMAC SHA-256 usando o secret da subscription. O secret fica persistido como `secret_ciphertext` e deve ser gerado por `encryptWebhookSecret()`, que usa AES-256-GCM com chave derivada de `ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY`.

Subscriptions aceitam apenas `targetUrl` HTTPS e publico. O schema de entrada rejeita HTTP, localhost, hostnames locais/internos e faixas IPv4/IPv6 privadas, loopback, link-local ou reservadas para reduzir risco de SSRF. Para testes locais, use um endpoint publico controlado ou tunnel temporario.

Durante a transicao, secrets legados sem prefixo `enc:v1:` ainda sao aceitos pelo dispatcher para evitar quebra de entregas existentes. Essa compatibilidade deve ser removida em **2026-08-31**; apos essa data, subscriptions com secret em texto puro devem falhar ate que o segredo seja rotacionado. O fluxo de migracao e: acessar `/app/config/integracoes/webhooks`, usar "Rotacionar segredo" para gerar um novo valor com pelo menos 32 caracteres, e confirmar que `secret_ciphertext` passou a usar o prefixo `enc:v1:`. Operadores `admin` devem revisar subscriptions legadas antes da data de corte e notificar os responsaveis pelos destinos externos quando o secret for alterado.

Os payloads do outbox passam por allowlist por tipo de evento antes de persistir em `domain_events.payload`. Antes do envio HTTP, o dispatcher aplica sanitizacao defensiva adicional em chaves sensiveis como CPF, SIAPE, email, endereco, telefone, tokens e secrets.

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

| Parametro | Tipo | Obrigatorio | Valores aceitos | Descricao |
|---|---|---|---|---|
| `fields` | `string[]` | Nao | ver lista abaixo | Campos a incluir no CSV; se omitido, exporta todos |
| `functionalStatus` | `string` | Nao | `ativo`, `aposentado`, `cedido`, `em_licenca`, `todos` | Filtra pela situacao funcional |
| `associationStatus` | `string` | Nao | `ativo`, `inativo`, `todos` | Filtra pela situacao associativa |
| `contributionStatus` | `string` | Nao | `em_dia`, `inadimplente`, `pendente_migracao`, `todos` | Filtra pela contribuicao |
| `birthMonth` | `number` | Nao | `1` a `12`, `todos` | Filtra pelo mes de aniversario |

#### Campos disponiveis em `fields`

`fullName`, `primaryEmail`, `secondaryEmail`, `birthDate`, `cpf`, `address`, `locationCity`, `locationCountry`, `phone`, `whatsapp`, `siape`, `assignment`, `assignmentStartDate`, `classPattern`, `functionalStatus`, `associationStatus`, `contributionStatus`, `joinedAt`, `associationCategory`

#### Formato da solicitacao

Exemplo:

```http
GET /app/associados/relatorio/download?fields=fullName&fields=cpf&fields=siape&functionalStatus=ativo&associationStatus=ativo HTTP/1.1
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

| Status | Quando ocorre | Observacoes |
|---|---|---|
| `403 Forbidden` | sessao ausente ou role sem permissao | hoje o helper retorna `403` sem distinguir claramente nao autenticado de nao autorizado |
| `429 Too Many Requests` | limite de 10 requisicoes/minuto por IP excedido | retorna header `Retry-After` |
| `500 Internal Server Error` | falha ao consultar dados ou gerar o CSV | corpo: `Falha ao gerar relatório.` |

#### Exemplo de uso

```bash
curl -L \
  -b "__Host-asof-session=SEU_COOKIE_AQUI" \
  "https://intranet.asof.com.br/app/associados/relatorio/download?fields=fullName&fields=cpf&fields=siape&functionalStatus=ativo&associationStatus=ativo" \
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

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `id` | `number` | Sim | ID numerico do oficio |

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

| Status | Quando ocorre | Observacoes |
|---|---|---|
| `400 Bad Request` | `id` nao e numerico | corpo: `ID inválido` |
| `404 Not Found` | oficio inexistente | corpo: `Ofício não encontrado` |
| `307 Temporary Redirect` | sessao ausente ou role sem permissao | via `requireRole()`: sem sessao redireciona para `/login`; role invalida redireciona para `/app` |
| `500 Internal Server Error` | falha ao buscar o oficio ou gerar o PDF | corpo: `Erro ao gerar PDF` |

#### Exemplo de uso

```bash
curl -L \
  -b "__Host-asof-session=SEU_COOKIE_AQUI" \
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
- ou sessao humana com role `admin` ou `diretoria`

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
    }
  },
  "meta": {
    "apiVersion": "v1",
    "requestId": "req-id",
    "timestamp": "2026-05-13T00:00:00.000Z"
  }
}
```

#### Respostas de erro

| Status | Quando ocorre |
|---|---|
| `401 Unauthorized` | headers M2M ausentes/invalidos e sem sessao autorizada |
| `403 Forbidden` | sessao humana existe, mas sem role permitida |
| `503 Service Unavailable` | integracoes habilitadas sem configuracao completa |

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

| Parametro | Tipo | Obrigatorio | Descricao |
|---|---|---|---|
| `limit` | `number` | Nao | Tamanho do lote entre `1` e `100`; default `20` |

#### Exemplo de solicitacao

```http
GET /api/v1/events/dispatch?limit=20 HTTP/1.1
Authorization: Bearer <CRON_SECRET>
```

#### Resposta de sucesso

```json
{
  "ok": true,
  "data": {
    "mode": "scheduled",
    "result": {
      "processed": 1,
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
    "timestamp": "2026-05-14T00:00:00.000Z"
  }
}
```

#### Auditoria e restricoes

Cada execucao grava `audit_logs.action = domain_event_dispatch_scheduled`. O endpoint nao ingere eventos externos e nao aceita `POST`; ele apenas consome `domain_events` ja persistidos por servicos internos.

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

### Exportar associados ativos e adimplentes

```bash
curl -L \
  -b "__Host-asof-session=SEU_COOKIE_AQUI" \
  "https://intranet.asof.com.br/app/associados/relatorio/download?fields=fullName&fields=primaryEmail&fields=assignment&associationStatus=ativo&contributionStatus=em_dia" \
  -o associados-ativos.csv
```

### Exportar aniversariantes de maio

```bash
curl -L \
  -b "__Host-asof-session=SEU_COOKIE_AQUI" \
  "https://intranet.asof.com.br/app/associados/relatorio/download?fields=fullName&fields=birthDate&birthMonth=5" \
  -o aniversariantes-maio.csv
```

### Baixar PDF de oficio

```bash
curl -L \
  -b "__Host-asof-session=SEU_COOKIE_AQUI" \
  "https://intranet.asof.com.br/api/oficios/123/download" \
  -o oficio-123.pdf
```

---

## Limitacoes e Restricoes Gerais

- A API HTTP atual nao e uma API REST completa
- Nao existe documentacao OpenAPI/Swagger
- Nao existem endpoints JSON publicos amplos de consulta ou mutacao de dominio
- A fundacao M2M atual e minima e restrita a `/api/v1/health`, `/api/v1/events` e `/api/v1/events/dispatch`
- Nao existe OAuth de integracao
- Nao existe endpoint inbound publico para receber eventos de terceiros
- Nao existe ingestao inbound de eventos
- A superficie atual foi desenhada para uso por usuarios autenticados na propria intranet
- Como a base contem dados protegidos pela LGPD, qualquer ampliacao de superficie HTTP deve partir de payload minimo, auditoria e controle estrito de permissao
- O cron atual processa pendencias por lote; nao ha fila dedicada externa nem concorrencia distribuida
- A UI administrativa de webhook subscriptions e interna e restrita a `admin`; nao ha CRUD publico de subscriptions

---

## Roadmap de API

Parcialmente iniciado no codigo:

- endpoints versionados minimos em `/api/v1/...`
- autenticacao M2M por API key/HMAC/timestamp
- outbox de `domain_events`
- dispatch outbound por `/api/v1/events`
- dispatch agendado por `/api/v1/events/dispatch`
- `webhook_subscriptions.secret_ciphertext` para secrets de webhooks
- auditoria de dispatch manual de eventos
- auditoria de subscription CRUD/rotacao de segredo
- allowlist de payloads por tipo de evento

Ainda nao implementado:

- contratos publicos amplos de eventos para terceiros
- endpoints inbound para comandos externos

As rotas novas existem apenas como groundwork; nao devem ser tratadas como API de negocio completa.
