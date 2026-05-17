# ASOF Intranet

Sistema interno da [ASOF](https://asof.org.br) — Associação dos Oficiais de Chancelaria do Ministério das Relações Exteriores do Brasil. Gerencia associados, atividades administrativas e comunicações internas da diretoria.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL/Supabase · Supabase Auth

---

## Pré-requisitos

- Node.js 20+
- npm (não pnpm, não yarn — o lockfile é `package-lock.json`)
- PostgreSQL local (recomendado via Homebrew) para desenvolvimento

---

## Início rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# edite .env.local conforme a seção abaixo
# Para desenvolvimento local, ajuste DATABASE_URL e DATABASE_MIGRATION_URL
# para apontar para o seu PostgreSQL local (ex: postgres://<user>@localhost:5432/asof_intranet)

# 3. Criar o banco local (se ainda não existir)
createdb asof_intranet

# 4. Aplicar migrações
npm run db:migrate

# 5. Popular com dados iniciais
npm run db:seed

# 6. Subir o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Variáveis de ambiente

### Obrigatórias em produção

| Variável                             | Descrição                                                                                                                |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                       | URL PostgreSQL de runtime. Pode apontar para o pooler do Supabase, com `sslmode=require`.                                |
| `DATABASE_MIGRATION_URL`             | URL PostgreSQL direta/non-pooling para migrations do Drizzle.                                                            |
| `DATABASE_SUPABASE_URL`              | URL HTTP do projeto Supabase, usada pelos helpers SDK.                                                                   |
| `DATABASE_SUPABASE_SERVICE_ROLE_KEY` | Chave service-role para scripts/admin server-side. Nunca expor no cliente.                                               |

### Seed do admin inicial

| Variável                 | Padrão | Descrição                                                                                            |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------------- |
| `INITIAL_ADMIN_EMAIL`    | —      | Obrigatória. Email do primeiro admin                                                                 |
| `INITIAL_ADMIN_PASSWORD` | —      | Obrigatória. Deve ter pelo menos 8 caracteres, incluindo 1 número e 1 caractere especial |

### Bypass de autenticação (apenas desenvolvimento)

| Variável                        | Valor            | Descrição                                  |
| ------------------------------- | ---------------- | ------------------------------------------ |
| `SKIP_AUTH`                     | `true`           | Desativa Supabase Auth e usa o usuário de dev abaixo |
| `DEV_USER_ID`                   | `1`              | ID do usuário simulado                     |
| `DEV_USER_NAME`                 | `ASOF Dev User`  | Nome exibido na sidebar                    |
| `DEV_USER_EMAIL`                | `dev@asof.local` | —                                          |
| `DEV_USER_ROLE`                 | `admin`          | `admin` \| `diretoria` \| `secretaria`     |
| `DEV_USER_MUST_CHANGE_PASSWORD` | `false`          | Simula fluxo de troca de senha             |

> `SKIP_AUTH=true` é **ignorado em `NODE_ENV=production`** — o proxy rejeita a flag mesmo que esteja definida.

### Integrações e webhooks outbound

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `ASOF_INTEGRATIONS_ENABLED` | `false` | Habilita autenticação M2M para `/api/v1/*` |
| `ASOF_INTEGRATION_API_KEY` | — | Chave compartilhada enviada em `x-asof-key` |
| `ASOF_INTEGRATION_HMAC_SECRET` | — | Segredo usado para validar `x-asof-signature` |
| `ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS` | `300` | Janela máxima de diferença para `x-asof-timestamp` |
| `ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY` | — | Chave usada para criptografar/decriptografar `webhook_subscriptions.secret_ciphertext` |
| `CRON_SECRET` | — | Segredo bearer enviado pelo Vercel Cron para `/api/v1/events/dispatch` |

As rotas versionadas atuais são `/api/v1/health`, `/api/v1/events` e `/api/v1/events/dispatch`. Elas suportam a fundação outbound-only: eventos são gravados em `domain_events`, subscriptions são gerenciadas internamente por admins em `/app/config/integracoes/webhooks`, dispatch manual é feito por `/api/v1/events`, e o dispatch agendado é feito pelo cron bearer-only configurado em `vercel.json`. Como o deploy usa o plano Free/Hobby da Vercel, o cron roda no máximo uma vez por dia (`0 3 * * *`). URLs de destino de webhooks devem ser HTTPS públicas; localhost, hostnames locais/internos e redes privadas/reservadas são rejeitados. Ainda não há endpoint inbound público.

Para o primeiro go-live, integrações/webhooks não são obrigatórios e produção deve manter `ASOF_INTEGRATIONS_ENABLED=false`, salvo decisão separada. Notificações realtime também não bloqueiam go-live; login, dashboard, associados, jurídico e ofícios devem operar sem depender de Supabase Realtime.

---

## Banco de dados

O projeto usa PostgreSQL via Drizzle.

- **Desenvolvimento local:** PostgreSQL via Homebrew. Use `DATABASE_URL=postgres://<user>@localhost:5432/asof_intranet` e a mesma URL para `DATABASE_MIGRATION_URL` (não há pooler local, então a URL direta serve para ambos).
- **Produção / remoto:** Supabase. Use a URL do pooler de runtime em `DATABASE_URL` e a URL direta/non-pooling em `DATABASE_MIGRATION_URL`.
- **Produção oficial:** Supabase `uftzjmmfkoqhjjwsiynk` (`db-intranet`).
- **Staging / preview:** use um projeto Supabase separado; previews da Vercel não devem apontar para o banco de produção.

```bash
npm run db:generate   # gera migrações a partir do schema
npm run db:migrate    # aplica migrações pendentes
npm run db:seed       # insere admin inicial
npm run db:supabase:status # consulta status/totais via Supabase SDK
npm run db:studio     # abre Drizzle Studio no browser
```

As migrações PostgreSQL atuais ficam em `drizzle/postgres/`. O schema está em `src/lib/db/schema/`.

---

## Comandos

```bash
npm run dev           # servidor de desenvolvimento (Webpack)
npm run dev:turbo     # servidor de desenvolvimento (Turbopack — diagnóstico)
npm run build         # build de produção (Webpack)
npm run build:turbo   # build de produção (Turbopack — diagnóstico)
npm run lint          # ESLint
npm run typecheck     # TypeScript sem emitir arquivos
npm run format:check  # valida formatação
npm run test          # Vitest (testes unitários)
npm run test:e2e      # Playwright (testes end-to-end)
npm run test:e2e:ui   # Playwright modo interativo
npm run audit         # npm audit
```

### Testes E2E com Playwright

Os testes E2E não devem ser apontados para o servidor normal de desenvolvimento em
`http://localhost:3000`.

O fluxo correto é:

```bash
npm run test:e2e
```

Esse comando usa `playwright.config.ts`, cujo `baseURL` é
`http://localhost:3001`. O `globalSetup` cria o banco `asof_test`, aplica as
migrações, roda `scripts/seed-e2e.ts` e sobe um servidor Next.js separado em
`127.0.0.1:3001` com `DATABASE_URL` apontando para `asof_test`.

O servidor E2E define `NEXT_E2E=1`, fazendo o Next.js usar
`distDir: .next-e2e`. Isso evita conflito com o lock do `next dev` normal em
`.next/dev` quando já houver um servidor aberto em `3000`.

O servidor de desenvolvimento em `3000` usa o banco normal da `.env.local`
(`asof_intranet` no setup local). Se os testes E2E forem rodados contra `3000`,
os usuários `e2e-*@asof.local` podem não existir nesse banco; o login retorna
`/login?error=1` e tentativas repetidas podem acumular em `login_attempts` até
gerar `/login?error=rate-limit`. Nesse caso, rode novamente pelo comando
oficial acima, aguarde a expiração do rate limit ou limpe apenas as tentativas
E2E no banco usado pelo servidor em `3000`:

```sql
DELETE FROM login_attempts WHERE email LIKE 'e2e-%@asof.local';
```

**Testes de integração (requer PostgreSQL):**

> Atenção: testes de integração **sempre** usam um banco de dados dedicado (ex: `asof_intranet_test`), nunca dev ou produção.

Configure o banco de testes em um arquivo `.env.test.local`:

```bash
DATABASE_URL=postgres://<user>@localhost:5432/asof_intranet_test
DATABASE_MIGRATION_URL=postgres://<user>@localhost:5432/asof_intranet_test
```

Crie o banco e aplique migrações antes da primeira execução:

```bash
createdb asof_intranet_test
DATABASE_MIGRATION_URL=postgres://<user>@localhost:5432/asof_intranet_test npm run db:migrate
```

Execute os testes de integração:

```bash
npx vitest run --config vitest.integration.config.ts
```

> `npm run dev` usa Webpack por padrão. O projeto reproduziu um problema de resolução do Tailwind no Turbopack em máquinas com 8 GB RAM — Turbopack está disponível mas é tratado como modo de diagnóstico explícito.

---

## Estrutura

```text
src/
  app/
    app/          # área autenticada (/app/*)
    login/        # página e actions de autenticação
    layout.tsx    # layout raiz (fontes, tema)
  components/     # componentes compartilhados (Sidebar, NavLink…)
  lib/
    auth/         # Supabase session lookup, requireAuth, config
    db/           # cliente Drizzle/PostgreSQL + schema
    integrations/ # auth M2M, envelopes JSON, outbox e webhooks outbound
    supabase/     # helpers Supabase SDK server/admin

proxy.ts          # proxy de autenticação (Next.js 16 — substitui middleware.ts)
drizzle/postgres/ # migrações PostgreSQL geradas
scripts/          # seed, diagnóstico e status Supabase
```

Detalhes de arquitetura, fluxo de dados e decisões técnicas: [`ARCHITECTURE.md`](./ARCHITECTURE.md).
Design system, tokens de cor e tipografia: [`DESIGN.md`](./DESIGN.md).
Contexto institucional e vocabulário do domínio: [`AGENTS.md`](./AGENTS.md).
Deploy target, env vars e checklist de release: seção 6 de [`ARCHITECTURE.md`](./ARCHITECTURE.md#6-deployment--infrastructure).

Auditoria técnica e status operacional de 2026-05-17:

- [`docs/codebase-audit-2026-05-17.md`](./docs/codebase-audit-2026-05-17.md) registra o hardening publicado em `main`, as validações locais e os riscos remanescentes.
- [`docs/dbsave.md`](./docs/dbsave.md) mantém o estado Supabase/Postgres/Vercel, incluindo o que ainda depende de migração ou configuração remota manual.
