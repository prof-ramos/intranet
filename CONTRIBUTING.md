# Guia do Desenvolvedor — ASOF Intranet

> Documentação para contribuidores e desenvolvedores da ASOF Intranet.
> Última atualização: 2026-05-18

---

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração do Ambiente](#configuração-do-ambiente)
3. [Visão Geral da Estrutura](#visão-geral-da-estrutura)
4. [Fluxo de Desenvolvimento](#fluxo-de-desenvolvimento)
5. [Banco de Dados](#banco-de-dados)
6. [Testes](#testes)
7. [Autenticação e Autorização](#autenticação-e-autorização)
8. [Solução de Problemas](#solução-de-problemas)
9. [Decisões Arquiteturais](#decisões-arquiteturais)

---

## Pré-requisitos

- **Node.js 20+**
- **npm** (não pnpm/yarn — o lockfile é `package-lock.json`)
- **PostgreSQL 15+** ou conta **Supabase**
- **Git**

---

## Configuração do Ambiente

### 1. Clone e instalação

```bash
git clone https://github.com/prof-ramos/intranet.git
cd intranet
npm install
```

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` conforme o modo de desenvolvimento:

#### Modo de desenvolvimento com bypass de auth (recomendado para iniciar)

```bash
DATABASE_URL=postgres://$USER@localhost:5432/asof_intranet
SKIP_AUTH=true
DEV_USER_ID=1
DEV_USER_NAME="Desenvolvedor"
DEV_USER_EMAIL=dev@asof.local
DEV_USER_ROLE=admin
DEV_USER_MUST_CHANGE_PASSWORD=false
```

> `SKIP_AUTH=true` é **ignorado em produção** (`NODE_ENV=production`). O proxy rejeita a flag mesmo que definida.

#### Modo de desenvolvimento com auth real (recomendado para testar login)

```bash
DATABASE_URL=postgres://$USER@localhost:5432/asof_intranet
INITIAL_ADMIN_EMAIL=admin@asof.local
INITIAL_ADMIN_PASSWORD=SenhaSegura123!
```

### 3. Banco de dados

```bash
# Criar banco (se necessário)
createdb asof_intranet

# Aplicar migrações
npm run db:migrate

# Popular dados iniciais (admin user only — seed-associados.ts was removed)
npm run db:seed
```

### 4. Subir servidor

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

> `npm run dev` usa Webpack por padrão. Turbopack (`npm run dev:turbo`) está disponível mas é tratado como modo de diagnóstico — houve problemas de resolução do Tailwind em máquinas com 8 GB RAM.

### 5. Referência de Scripts

| Script | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Webpack) |
| `npm run dev:turbo` | Servidor de desenvolvimento (Turbopack, diagnóstico) |
| `npm run build` | Build de produção |
| `npm run start` | Inicia servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos (`tsc --noEmit`) |
| `npm run test` | Roda testes unitários (Vitest) |
| `npm run test:watch` | Testes em modo watch |
| `npm run test:db` | Schema contract contra PostgreSQL real |
| `npm run test:e2e` | Testes end-to-end (Playwright) |
| `npm run test:e2e:ui` | Playwright com UI |
| `npm run test:e2e:debug` | Playwright em modo debug |
| `npm run format` | Formata código com Prettier |
| `npm run format:check` | Verifica formatação |
| `npm run audit` | npm audit de segurança |
| `npm run validate:quick` | typecheck + lint + testes unitários |
| `npm run validate:full` | quick validation + testes de DB + build |
| `npm run scope:check` | Verifica escopo de arquivos alterados (strict) |
| `npm run pr:check` | Verificações de prontidão para PR |
| `npm run db:migrate:unsafe` | drizzle-kit migrate direto (diagnóstico controlado) |
| `npm run db:supabase:status` | Consulta status/totais via Supabase SDK |
| `npm run db:studio` | Abre Drizzle Studio no browser |

---

## Visão Geral da Estrutura

```
src/
  app/                      # Next.js App Router
    app/                    # Área autenticada (/app/*)
      associados/           # CRUD de associados + relatórios
      atividades/           # Kanban de atividades administrativas
      config/               # Configurações, auditoria, usuários, integrações e lotações
      financeiro/mensalidades/ # Mensalidades e dashboard financeiro
      juridico/             # Módulo jurídico (consultas, processos)
      notifications/        # Actions de notificação
      search/               # Busca global
      secretaria/oficios/   # Gestão de ofícios
      layout.tsx            # Layout com sidebar
      page.tsx              # Dashboard
      error.tsx             # Error boundary global
    login/                  # Página de login + action
    change-password/        # Fluxo de troca de senha obrigatória
    layout.tsx              # Layout raiz (fontes, tema, metadata)
    page.tsx                # Landing page pública
    globals.css             # Tailwind + DaisyUI imports

  components/               # Componentes compartilhados
    Sidebar.tsx             # Navegação lateral
    NavLink.tsx             # Links ativos
    LogoutButton.tsx        # Botão de logout com action

  lib/                      # Código de negócio e infraestrutura
    activities/             # Activity (board) CRUD, assignments
    ai/                     # Integração Gemini
    associates/             # Queries, repository, PII masking e helpers de associados
    auth/                   # Supabase session lookup, login, guards, rate limit
    crypto/                 # Criptografia de PII (AES-256-GCM, HKDF, HMAC blind indexes)
    dashboard/              # Queries de agregação
    db/                     # Cliente Drizzle + schema
    email/                  # Envio de email (Mailjet)
    finance/                # Repository, service, queries do módulo financeiro
    integrations/           # Auth M2M, webhooks outbound, rate limiting de API
    juridico/               # Repository, service, queries do módulo jurídico
    notifications/          # Repository, service, event bus de notificações
    oficios/                # Repository, service, PDF, validations do módulo de ofícios
    reports/                # Geração de CSV e queries de relatório
    routing/                # Helpers de navegação e rotas (entry: params.ts)
    search/                 # Queries de busca de associados e atividades
    server-actions/         # Utilitários compartilhados de Server Actions (entry: utils.ts)
    storage/                # Supabase Storage (buckets de ofícios, documentos)
    validation/             # Schemas de validação compartilhados (entry: schemas.ts)
    sanitize-pii.ts         # Sanitização de PII para logs e webhooks
    logger.ts               # Logger estruturado com redação de PII
    supabase/               # Clientes Supabase (server/admin)
    ui/                     # Design tokens
    env.ts                  # Validação de variáveis de ambiente (Zod)
    events.ts               # Event bus em processo para notificações

  proxy.ts                  # Guarda de autenticação (Next.js 16)

drizzle/postgres/           # Migrações geradas pelo Drizzle Kit
scripts/                    # Seed, diagnóstico, status Supabase
```

### Padrões de Arquitetura

| Padrão | Onde usar | Exemplo |
|---|---|---|
| **Server Component** | Páginas que buscam dados | `src/app/app/juridico/consultas/page.tsx` |
| **Client Component** | Interatividade (forms, estado) | `src/app/app/juridico/consultas/nova/NovaConsultaForm.tsx` |
| **Server Action** | Mutações via formulário | `src/app/app/juridico/actions.ts` |
| **Route Handler** | Downloads, webhooks | `src/app/app/associados/relatorio/download/route.ts` |
| **Repository** | SQL isolado | `src/lib/juridico/repository.ts` |
| **Service** | Regras de negócio | `src/lib/juridico/service.ts` |

---

## Fluxo de Desenvolvimento

### Adicionar uma nova página

1. **Crie a rota** em `src/app/app/<modulo>/<rota>/page.tsx`
2. **Adicione `loading.tsx`** com skeleton (`animate-pulse`)
3. **Adicione `error.tsx`** se a rota tiver queries críticas
4. **Exporte como Server Component** por padrão
5. **Extraia para Client Component** apenas quando necessitar interatividade

```tsx
// Exemplo: página Server Component
import { requireAuth } from '@/lib/auth/require-auth';

export default async function MinhaPaginaPage() {
  const user = await requireAuth();
  const dados = await minhaQuery();

  return (
    <main className="mx-auto max-w-[1180px] px-5 py-7">
      <h1 className="font-serif text-3xl font-bold">Título</h1>
    </main>
  );
}
```

### Adicionar um formulário

1. **Shell**: Server Component busca dados
2. **Form**: Client Component recebe dados e chama Server Action

```tsx
// page.tsx (Server Component)
export default async function NovaPaginaPage() {
  const opcoes = await db.select().from(minhaTabela);
  return <MeuForm opcoes={opcoes} />;
}

// MeuForm.tsx (Client Component)
'use client';
import { minhaAction } from './actions';

export function MeuForm({ opcoes }) {
  return (
    <form action={minhaAction}>
      <select name="opcaoId">
        {opcoes.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
      </select>
      <button type="submit">Salvar</button>
    </form>
  );
}
```

### Adicionar uma Server Action

1. **Marque com `'use server'`**
2. **Valide auth** com `requireAuth()`
3. **Valide rate limit** se aplicável
4. **Valide inputs** (não confie em FormData)
5. **Chame repository/service** (não escreva SQL na action)
6. **Chame `revalidatePath()`** para invalidar cache
7. **Redirecione** ou retorne erro

```ts
'use server';

import { requireAuth } from '@/lib/auth/require-auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function minhaAction(formData: FormData) {
  const user = await requireAuth();

  const nome = String(formData.get('nome') ?? '').trim();
  if (!nome) throw new Error('Nome é obrigatório.');

  await meuRepository.insert({ nome, createdBy: user.userId });

  revalidatePath('/app/minha-rota');
  redirect('/app/minha-rota');
}
```

### Adicionar uma migração de banco

1. **Edite o schema** em `src/lib/db/schema/nova-tabela.ts`
2. **Exporte** em `src/lib/db/schema/index.ts`
3. **Gere a migração**:

   ```bash
   npm run db:generate
   ```

4. **Aplique localmente**:

   ```bash
   npm run db:migrate
   ```

5. **Aplique em produção** via Vercel (ou manualmente via Drizzle Kit)

> **Nunca** edite arquivos em `drizzle/postgres/` manualmente. Sempre regenere via `drizzle-kit generate`.

### Branch e Commit

```bash
# Criar branch
gh issue create --title "feat: minha feature" --body "..."
git checkout -b feat/minha-feature

# Desenvolver, testar, lint
git add .
git commit -m "feat: descrição da mudança"

# Push e PR
git push -u origin feat/minha-feature
gh pr create --fill
```

---

## Banco de Dados

### Schema

O schema está dividido por domínio em `src/lib/db/schema/`:

| Arquivo | Domínio |
|---|---|
| `admins.ts` | Usuários administrativos |
| `associates.ts` | Associados da ASOF |
| `activities.ts` | Atividades administrativas (Kanban) |
| `audit.ts` | Logs de auditoria (LGPD) |
| `login-attempts.ts` | Rate limiting de login |
| `legal-consultations.ts` | Consultas jurídicas |
| `legal-processes.ts` | Processos jurídicos |
| `legal-notes.ts` | Notas/histórico |
| `legal-opinions.ts` | Pareceres e tags |
| `finance.ts` | Mensalidades e pagamentos |
| `oficios.ts` | Ofícios oficiais |
| `rate-limits.ts` | Rate limiting por IP |
| `integrations.ts` | Eventos de domínio, webhooks outbound e chaves de API M2M |
| `notifications.ts` | Notificações em tempo real |
| `assignments.ts` | Lotações/postos |
| `enums.ts` | Enums compartilhados |
| `views.ts` | Views PII-safe (`associates_list_view`)

### Comandos úteis

```bash
# Drizzle Studio — UI visual do banco
npm run db:studio

# Status do Supabase
npm run db:supabase:status

# Reset completo (cuidado!)
# 1. Dropar tabelas manualmente ou recriar banco
# 2. Aplicar migrações: npm run db:migrate
# 3. Popular seeds: npm run db:seed
```

### Conexão

O cliente Drizzle detecta automaticamente:

- **Pooler** (`port 6543` ou hostname com `pooler`): desabilita `prepare`
- **SSL**: ativado em produção ou quando `DB_SSL=true`

---

## Testes

### Executar testes

```bash
# Todos os testes (CI)
npm run test

# Watch mode (desenvolvimento)
npm run test:watch

# Arquivo específico
npx vitest run src/lib/auth/password.test.ts

# Teste específico
npx vitest run -t "deve rejeitar senha curta"
```

### Estrutura de testes

```
src/
  lib/
    auth/
      config.test.ts              # Testes de config
      authorization.test.ts      # Testes de autorização
      login-rate-limit.test.ts   # Testes de rate limit
      password.test.ts           # Testes de validação de senha
    juridico/
      service.test.ts            # Testes de regras de negócio
    associates/
      search-params.test.ts      # Testes de helpers
```

### Escrevendo um teste

```ts
import { describe, it, expect } from 'vitest';
import { minhaFuncao } from './minha-funcao';

describe('minhaFuncao', () => {
  it('deve retornar true para input válido', () => {
    expect(minhaFuncao('valido')).toBe(true);
  });

  it('deve lançar erro para input inválido', () => {
    expect(() => minhaFuncao('')).toThrow('Input inválido');
  });
});
```

> Não é necessário mockar o banco para testes de service/repository. Os testes de service testam regras de negócio puras. Testes que precisam do banco devem usar um banco de testes dedicado.

---

## Autenticação e Autorização

### Fluxo de login

```
Usuário → /login → Server Action: login()
  → Supabase Auth signInWithPassword → session
  → Redirect /app (ou /change-password se mustChangePassword=true)
```

### Verificação de sessão

- **Proxy** (`src/proxy.ts`): lookup grosso de usuário Supabase para rotas `/app/*`
- **Layout** (`src/app/app/layout.tsx`): `requireAuth()` completo com query ao banco
- **Página**: `requireAuth()` retorna o usuário logado

### Roles

| Role | Acesso jurídico | Relatórios |
|---|---|---|
| `admin` | Sim | Sim |
| `diretoria` | Sim | Sim |
| `secretaria` | Não | Não |

---

## Solução de Problemas

### Build falha com "Invalid environment variables"

Verifique `src/lib/env.ts` para identificar variáveis obrigatórias. `SESSION_SECRET` não é mais usado desde a migração para Supabase Auth. Se o build exigir variáveis inesperadas, confira se o código reintroduziu validação customizada obsoleta.

### Typecheck falha com "Range out of order in character class"

**Sintoma:** Regex inválida com range de caracteres.

**Solução:** Em character classes `[]`, o hífen `-` deve ser escapado ou colocado no início/fim:

```ts
// ❌ Inválido
/^[=-+@ ]/

// ✅ Correto
/^[-=+@ ]/
```

### "Event handlers cannot be passed to Client Component props"

**Sintoma:** Next.js rejeita `onChange` passado de Server para Client Component.

**Solução:** Extrair o `<select onChange>` para um Client Component separado:

```tsx
// StatusUpdater.tsx
'use client';
export function StatusUpdater({ defaultValue, children }) {
  return (
    <select name="status" defaultValue={defaultValue} onChange={e => e.target.form?.submit()}>
      {children}
    </select>
  );
}
```

### Rate limit de login bloqueou desenvolvimento

**Sintoma:** `?error=rate-limit` após várias tentativas.

**Solução:**

```bash
# No Drizzle Studio ou SQL:
DELETE FROM login_attempts WHERE email = 'seu-email@asof.local';
```

### Turbopack lento ou com erros de CSS

**Sintoma:** Classes Tailwind não carregam ou builds demoram.

**Solução:** Use Webpack (padrão):

```bash
npm run dev        # ✅ Webpack
npm run dev:turbo  # ⚠️ Apenas diagnóstico
```

### "Cannot find module '@/lib/...'"

**Sintoma:** Import alias `@/` não resolve.

**Solução:** Verifique `tsconfig.json` e `next.config.ts`:

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Migração não aplica em produção

**Sintoma:** Tabela inexistente após deploy.

**Solução:**

1. Verifique se `DATABASE_MIGRATION_URL` ou `DATABASE_POSTGRES_URL_NON_POOLING` está configurado
2. Aplique manualmente:

   ```bash
   DATABASE_MIGRATION_URL="postgres://..." npx drizzle-kit migrate
   ```

3. Ou execute o SQL da migration diretamente no Supabase SQL Editor

### CSV gerado com caracteres estranhos no Excel

**Sintoma:** Acentos ou caracteres especiais não aparecem corretamente.

**Solução:** O CSV já inclui BOM UTF-8 (`﻿` no início). Se persistir, abra o arquivo no Excel via **Dados → Importar de texto/CSV** e selecione codificação UTF-8.

### "db" não inicializa durante build

**Sintoma:** Build falha com erro de conexão ao banco.

**Solução:** Use importação tardia em Route Handlers:

```ts
const { db } = await import('@/lib/db');
```

Isso evita que o Drizzle tente conectar durante o build estático do Next.js.

---

## Decisões Arquiteturais

### Por que não há `middleware.ts`?

Next.js 16 renomeou `middleware.ts` para `proxy.ts`. O arquivo `src/proxy.ts` faz o lookup grosso de usuário Supabase para rotas `/app/*`.

### Por que não há API routes REST?

O projeto segue o padrão **Server Component + Server Action** do Next.js App Router:

- **Leitura**: Server Components consultam o banco diretamente
- **Escrita**: Server Actions recebem `FormData` e executam mutações
- **Downloads**: Route Handlers para casos específicos (CSV)

Isso elimina a necessidade de endpoints REST intermediários e simplifica o código.

### Por que Webpack como padrão?

Turbopack apresentou problemas de resolução do Tailwind CSS em máquinas com 8 GB RAM. Webpack é estável e o padrão recomendado.

### Por que repository pattern no jurídico?

O módulo jurídico usa repository pattern para:

- Isolar SQL em um único lugar
- Facilitar testes sem mockar o banco
- Permitir troca futura de ORM

### Por que rate limit no PostgreSQL?

Em vez de memória (Redis), o rate limit usa PostgreSQL para:

- Consistência entre múltiplas instâncias (serverless)
- Persistência entre deploys
- Simplicidade (uma tecnologia a menos)

---

### Por que logger estruturado em vez de `console.*`?

O projeto usa `src/lib/logger.ts` para centralizar logs com:

- Níveis configuráveis via `LOG_LEVEL` (`trace`, `debug`, `info`, `warn`, `error`, `fatal`)
- Redação automática de PII (CPF, SIAPE, email, tokens, secrets) antes de logar
- Formato JSON em produção e colorizado em desenvolvimento
- Identificação de módulo via `createLogger('nome-do-modulo')`

Nunca use `console.error`, `console.warn` ou `console.log` diretamente em código de produção. Sempre importe `createLogger` e chame `logger.error()`, `logger.warn()`, etc.

---

## Recursos

- [`API.md`](./API.md) — Documentação de endpoints e Server Actions
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Diagramas e decisões técnicas
- [`DESIGN.md`](./DESIGN.md) — Design system, tokens e tipografia
- [`AGENTS.md`](./AGENTS.md) — Contexto institucional e vocabulário do domínio
- [`docs/runbook.md`](./docs/runbook.md) — Procedimentos operacionais (deploy, backup, rollback, smoke test)
