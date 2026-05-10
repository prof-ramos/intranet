# API Documentation — ASOF Intranet

> Documentação dos endpoints e Server Actions disponíveis na ASOF Intranet.
> Última atualização: 2026-05-10

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Route Handlers (HTTP)](#route-handlers-http)
4. [Server Actions](#server-actions)
5. [Erros e Códigos de Status](#erros-e-códigos-de-status)
6. [Rate Limiting](#rate-limiting)
7. [Exemplos de Uso](#exemplos-de-uso)
8. [Limitações e Restrições](#limitações-e-restrições)

---

## Visão Geral

A ASOF Intranet utiliza a arquitetura **Next.js App Router** com dois padrões de API:

| Padrão | Uso | Localização |
|---|---|---|
| **Route Handlers** | Endpoints HTTP tradicionais (downloads, webhooks) | `src/app/**/route.ts` |
| **Server Actions** | Mutações acionadas por formulários React | `src/app/**/actions.ts` |

Não há rotas REST tradicionais (`/api/v1/...`). Toda a comunicação de dados passa por Server Components (query direto ao banco) ou Server Actions (mutações via `FormData`).

---

## Autenticação

### Sessão JWT

A autenticação é baseada em **sessão JWT** armazenada em cookie `httpOnly`:

- **Nome do cookie**: `__Host-asof-session`
- **Atributos**: `Secure`, `HttpOnly`, `SameSite=Strict`, `Partitioned`
- **TTL**: 8 horas (configurável em `SESSION_COOKIE_MAX_AGE`)
- **Secret**: `SESSION_SECRET` (mínimo 32 caracteres)

### Fluxo de Login

1. POST implícito via `<form action={login}>`
2. Validação de credenciais com bcrypt
3. Criação de sessão JWT via `createSession()`
4. Redirecionamento para `/app` (ou `/change-password` se `mustChangePassword=true`)

### Autorização

| Role | Permissões |
|---|---|
| `admin` | Acesso total |
| `diretoria` | Acesso total |
| `secretaria` | Acesso negado ao módulo jurídico |

---

## Route Handlers (HTTP)

### 1. Download de Relatório de Associados

```
GET /app/associados/relatorio/download
```

**Descrição**: Exporta associados filtrados para CSV com BOM UTF-8.

**Auth**: Requer sessão ativa com role `admin` ou `diretoria`.

**Query Parameters**:

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `fields` | string[] | Não | Campos a incluir. Se omitido, exporta todos. |
| `functionalStatus` | string | Não | `ativo`, `aposentado`, `cedido`, `em_licenca` ou `todos` |
| `associationStatus` | string | Não | `ativo`, `inativo` ou `todos` |
| `contributionStatus` | string | Não | `em_dia`, `inadimplente`, `pendente_migracao` ou `todos` |
| `birthMonth` | number | Não | Mês de aniversário (1–12) ou `todos` |

**Campos disponíveis** (`fields`):

`fullName`, `primaryEmail`, `secondaryEmail`, `birthDate`, `cpf`, `address`, `locationCity`, `locationCountry`, `phone`, `whatsapp`, `siape`, `assignment`, `assignmentStartDate`, `classPattern`, `functionalStatus`, `associationStatus`, `contributionStatus`, `joinedAt`, `associationCategory`

**Response**:

- **200 OK** — `Content-Type: text/csv; charset=utf-8` com `Content-Disposition: attachment; filename="relatorio-asof-YYYY-MM-DD.csv"`
- **302 Found** — Redireciona para `/login` se não autenticado
- **403 Forbidden** — Usuário sem permissão (`secretaria`)
- **429 Too Many Requests** — Limite de 10 requisições/minuto por IP excedido

**Exemplo**:

```bash
curl -L \
  -b "__Host-asof-session=SEU_JWT_AQUI" \
  "https://asof-intranet.vercel.app/app/associados/relatorio/download?fields=fullName&fields=cpf&fields=siape&functionalStatus=ativo&associationStatus=ativo" \
  -o relatorio.csv
```

**Auditoria (LGPD)**:

Cada download gera um registro em `audit_logs` com:
- `action: report_download`
- `entityType: associate`
- Filtros aplicados, campos selecionados e contagem de linhas

---

## Server Actions

Server Actions são funções assíncronas marcadas com `'use server'`. São invocadas exclusivamente via formulários React (`<form action={action}>`) ou chamadas programáticas no cliente.

### 2. Login

```
POST (Server Action) → /login/actions.ts
```

**Função**: `login(formData: FormData)`

**Parâmetros (FormData)**:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `email` | string | Sim | E-mail do administrador |
| `password` | string | Sim | Senha (plain text) |

**Respostas**:

- **Sucesso**: Redirect 302 para `/app`
- **Erro**: Redirect 302 para `/login?error=1` (credenciais inválidas) ou `/login?error=rate-limit` (muitas tentativas)

**Rate Limiting**: 5 tentativas em 15 minutos por e-mail. Usa tabela `login_attempts` no PostgreSQL.

**Exemplo**:

```tsx
<form action={login}>
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">Entrar</button>
</form>
```

---

### 3. Troca de Senha

```
POST (Server Action) → /change-password/actions.ts
```

**Função**: `changePassword(formData: FormData)`

**Parâmetros (FormData)**:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `currentPassword` | string | Sim | Senha atual |
| `newPassword` | string | Sim | Nova senha (mínimo 12 caracteres, maiúscula, minúscula, número, símbolo) |
| `confirmPassword` | string | Sim | Confirmação da nova senha |

**Respostas**:

- **Sucesso**: Redirect 302 para `/app`
- **Erro**: Redirect 302 para `/change-password?error=...` com mensagem descritiva

**Validações**:

- `newPassword === confirmPassword`
- `validateNewPassword()` — regras de complexidade (12+ chars, mixed case, number, symbol)
- Verificação da senha atual com bcrypt

**Exemplo**:

```tsx
<form action={changePassword}>
  <input name="currentPassword" type="password" required />
  <input name="newPassword" type="password" required minLength={12} />
  <input name="confirmPassword" type="password" required />
  <button type="submit">Alterar senha</button>
</form>
```

---

### 4. Criar Consulta Jurídica

```
POST (Server Action) → /app/juridico/actions.ts
```

**Função**: `createConsultation(formData: FormData)`

**Parâmetros (FormData)**:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `title` | string | Sim | Título da consulta |
| `questionSummary` | string | Sim | Resumo em uma linha |
| `questionFullText` | string | Não | Descrição completa |
| `associateId` | number | Não | ID do associado vinculado |
| `slaDays` | number | Não | Prazo de resposta em dias (padrão: 7) |

**Respostas**:

- **Sucesso**: Redirect 302 para `/app/juridico/consultas/{id}`
- **Erro**: `Error` com mensagem descritiva

**Geração de Número Interno**: `JUR-{ano}-{sequência}` (ex: `JUR-2026-001`). Usa transação PostgreSQL com retry e backoff exponencial para evitar race conditions.

**Rate Limiting**: 30 requisições/minuto por IP.

**Exemplo**:

```tsx
<form action={createConsultation}>
  <input name="title" required />
  <input name="questionSummary" required />
  <textarea name="questionFullText" />
  <select name="associateId"><option value="">Selecione...</option></select>
  <input name="slaDays" type="number" min={1} max={90} defaultValue={7} />
  <button type="submit">Salvar</button>
</form>
```

---

### 5. Atualizar Status de Consulta

```
POST (Server Action) → /app/juridico/actions.ts
```

**Funções**:
- `updateConsultationStatus(id: number, status: string)`
- `updateConsultationStatusFromForm(formData: FormData)` — wrapper com FormData

**Parâmetros (FormData)**:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | number | Sim | ID da consulta |
| `status` | string | Sim | `aberta`, `aguardando_escritorio`, `respondida`, `arquivada` |

**Respostas**:

- **Sucesso**: Atualiza banco e revalida cache (`revalidatePath`)
- **Erro**: `Error('ID da consulta inválido.')` ou `Error('O novo status é obrigatório.')`

**Comportamento especial**:

- Status `respondida` atualiza automaticamente `lastInteractionAt` para `now()`.
- Status inválido é silenciosamente convertido para `'aberta'`.

**Rate Limiting**: 30 requisições/minuto por IP.

**Exemplo**:

```tsx
<form action={updateConsultationStatusFromForm}>
  <input type="hidden" name="id" value={consultationId} />
  <select name="status" defaultValue="aberta" onChange={(e) => e.target.form?.submit()}>
    <option value="aberta">Aberta</option>
    <option value="aguardando_escritorio">Aguardando escritório</option>
    <option value="respondida">Respondida</option>
    <option value="arquivada">Arquivada</option>
  </select>
</form>
```

---

### 6. Adicionar Nota

```
POST (Server Action) → /app/juridico/actions.ts
```

**Função**: `addNote(formData: FormData)`

**Parâmetros (FormData)**:

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `entityType` | string | Sim | `'consultation'` (ou `'process'` no futuro) |
| `entityId` | number | Sim | ID da entidade |
| `content` | string | Sim | Texto da nota |
| `isEscritorioResponse` | boolean | Não | Marca como resposta do escritório |

**Respostas**:

- **Sucesso**: Atualiza banco, atualiza `lastInteractionAt` da consulta e revalida cache
- **Erro**: `Error` com mensagem de validação

**Rate Limiting**: 30 requisições/minuto por IP.

**Exemplo**:

```tsx
<form action={addNote}>
  <input type="hidden" name="entityType" value="consultation" />
  <input type="hidden" name="entityId" value={consultationId} />
  <textarea name="content" required rows={3} />
  <label>
    <input type="checkbox" name="isEscritorioResponse" value="true" />
    Resposta do escritório
  </label>
  <button type="submit">Adicionar nota</button>
</form>
```

---

## Erros e Códigos de Status

### HTTP Status Codes (Route Handlers)

| Status | Significado | Contexto |
|---|---|---|
| 200 | OK | Download CSV bem-sucedido |
| 302 | Found | Redirect para `/login` (não autenticado) |
| 403 | Forbidden | Sem permissão (`secretaria`) |
| 429 | Too Many Requests | Rate limit excedido |

### Erros de Server Actions

Server Actions não retornam HTTP status tradicionais. Em vez disso:

- **Sucesso**: `redirect()` ou retorno implícito
- **Erro de validação**: `throw new Error('mensagem')`
- **Erro de rate limit**: `throw new Error('Muitas requisições. Aguarde um momento.')`
- **Erro de auth**: `requireAuth()` lança redirect para `/login`

---

## Rate Limiting

| Escopo | Janela | Máximo | Implementação |
|---|---|---|---|
| Login por e-mail | 15 min | 5 tentativas | PostgreSQL (`login_attempts`) |
| Download CSV por IP | 1 min | 10 requisições | PostgreSQL (`rate_limits`) |
| Jurídico actions por IP | 1 min | 30 requisições | PostgreSQL (`rate_limits`) |

**Headers de resposta (HTTP 429)**:

```
Retry-After: {segundos}
```

---

## Exemplos de Uso

### cURL — Download CSV com filtros

```bash
curl -L \
  -b "__Host-asof-session=SEU_JWT_AQUI" \
  "https://asof-intranet.vercel.app/app/associados/relatorio/download?fields=fullName&fields=cpf&fields=locationCountry&functionalStatus=ativo&birthMonth=5" \
  -o aniversariantes_maio.csv
```

### JavaScript — Invocar Server Action programaticamente

```tsx
'use client';

import { createConsultation } from '@/app/app/juridico/actions';

async function handleCreate() {
  const formData = new FormData();
  formData.append('title', 'Dúvida sobre aposentadoria');
  formData.append('questionSummary', 'Regra de aposentadoria compulsória');
  formData.append('associateId', '42');
  formData.append('slaDays', '14');

  try {
    await createConsultation(formData);
    // redirect ocorre automaticamente no Server Action
  } catch (err) {
    console.error(err.message);
  }
}
```

### Python — Download CSV

```python
import requests

session = requests.Session()
session.cookies.set('__Host-asof-session', 'SEU_JWT_AQUI')

params = {
    'fields': ['fullName', 'primaryEmail', 'siape'],
    'functionalStatus': 'ativo',
    'associationStatus': 'ativo',
}

r = session.get(
    'https://asof-intranet.vercel.app/app/associados/relatorio/download',
    params=params,
    allow_redirects=True,
)
r.raise_for_status()

with open('relatorio.csv', 'wb') as f:
    f.write(r.content)
```

---

## Limitações e Restrições

### Arquitetura

- **Sem API REST tradicional**: Não há endpoints `/api/v1/...`. Dados são consultados por Server Components e mutados por Server Actions.
- **Sem Swagger/OpenAPI**: A documentação é manual.
- **Sem GraphQL**: Queries são Drizzle ORM direto no PostgreSQL.

### Autenticação

- JWT session cookie obrigatório para todas as rotas em `/app/:path*`.
- Cookie `__Host-` prefixado requer HTTPS em produção.
- Não há suporte a API keys ou tokens de acesso pessoal.

### Dados

- **Campos sensíveis (LGPD)**: CPF, SIAPE, e-mail e endereço são protegidos. Não são expostos em logs ou respostas não autorizadas.
- **CSV Injection Prevention**: Células que começam com `-`, `=`, `+`, `@` ou tab recebem prefixo `\t` e aspas.
- **Tamanho máximo de CSV**: Limitado apenas pela memória e timeout do Vercel Function (300s).

### Jurídico

- `secretaria` não tem acesso ao módulo jurídico (bloqueio em `src/app/app/juridico/layout.tsx`).
- Associação de consulta a associado é opcional.
- Anexos ainda não são suportados (Fase 2).

### Relatórios

- Download de CSV limitado a 10 requisições/minuto por IP.
- Filtros de data de nascimento usam `EXTRACT(month FROM birthDate)`.

### Migrações Pendentes

- A migration `0003` (tabela `rate_limits`) ainda não foi aplicada ao banco de produção (Issue #15).
- Sem essa tabela, o rate limiting por IP **não funciona** e retornará erro de tabela inexistente.

---

## Changelog

| Data | Mudança |
|---|---|
| 2026-05-10 | Adicionado rate limiting por IP e audit trail em downloads CSV |
| 2026-05-10 | Criação da documentação inicial |
