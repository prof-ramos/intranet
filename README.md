# ASOF Intranet

Sistema interno da [ASOF](https://asof.org.br) — Associação dos Oficiais de Chancelaria do Ministério das Relações Exteriores do Brasil. Gerencia associados, atividades administrativas e comunicações internas da diretoria.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL gerenciado · auth server-side própria

---

## Guia rápido de navegação

- **Primeira execução local:** siga [Início rápido](#início-rápido).
- **Variáveis e banco:** veja [Variáveis de ambiente](#variáveis-de-ambiente) e [Banco de dados](#banco-de-dados).
- **Comandos de trabalho:** use [Comandos](#comandos), especialmente `npm run validate:quick`, `npm run validate:full` e `npm run pr:check`.
- **Arquitetura:** comece pelo mapa de módulos em [`ARCHITECTURE.md`](./ARCHITECTURE.md#21-domain-module-and-caller-map).
- **Operação e deploy:** use [`docs/runbook.md`](./docs/runbook.md) e a seção 6 de [`ARCHITECTURE.md`](./ARCHITECTURE.md#6-deployment--infrastructure).
- **Go-live Release 1.0:** use [`docs/release-1-operational-go-live.md`](./docs/release-1-operational-go-live.md) para smoke manual, backup Nivel 1 Neon/PostgreSQL, restore de teste e revisão de integrações.

## Módulos principais

| Módulo                    | Rota principal                 | Responsabilidade                                                                          |
| ------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| Dashboard                 | `/app`                         | Visão operacional de associados, atividades, jurídico e financeiro.                       |
| Associados                | `/app/associados`              | Cadastro, perfil, lotação/posto, situação funcional, situação associativa e contribuição. |
| Atividades                | `/app/atividades`              | Kanban administrativo com responsáveis, prioridades, prazos e vínculos com associados.    |
| Jurídico                  | `/app/juridico`                | Consultas jurídicas, notas, SLA e histórico de atendimento.                               |
| Secretaria / Ofícios      | `/app/secretaria/oficios`      | Geração, edição, cancelamento e download de ofícios.                                      |
| Financeiro / Mensalidades | `/app/financeiro/mensalidades` | Controle mensal de pagamentos e status de mensalidade.                                    |
| Relatórios                | `/app/associados/relatorio`    | Exportação auditada de dados de associados para `admin` e `diretoria`.                    |
| Configurações             | `/app/config`                  | Usuários, lotações, auditoria, API keys e webhooks outbound.                              |

> Dados como CPF, SIAPE, email, endereço e dados funcionais são sensíveis pela LGPD. Use os helpers de sanitização/logging do projeto e não exponha esses dados em logs, erros ou payloads públicos.

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

| Variável                 | Descrição                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`           | URL PostgreSQL de runtime. Em produção, prefira pooler/runtime com usuário restrito. |
| `DATABASE_MIGRATION_URL` | URL PostgreSQL direta/non-pooling para migrations do Drizzle.                        |
| `SESSION_SECRET`         | Segredo forte para assinar cookies `httpOnly` de sessão.                             |

No setup atual de producao em Vercel:

- `DATABASE_URL` aponta para o pooler do Neon `ep-empty-cake-ac26vl6w-pooler.sa-east-1.aws.neon.tech`
- `DATABASE_MIGRATION_URL` aponta para o host direto do Neon `ep-empty-cake-ac26vl6w.sa-east-1.aws.neon.tech`
- Fallbacks legados como `DATABASE_POSTGRES_URL` e `POSTGRES_URL` nao devem permanecer configurados em producao

### Seed do admin inicial

| Variável                 | Padrão | Descrição                                                                                |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------- |
| `INITIAL_ADMIN_EMAIL`    | —      | Obrigatória. Email do primeiro admin                                                     |
| `INITIAL_ADMIN_PASSWORD` | —      | Obrigatória. Deve ter pelo menos 8 caracteres, incluindo 1 número e 1 caractere especial |

### Bypass de autenticação (apenas desenvolvimento)

| Variável                        | Valor            | Descrição                                   |
| ------------------------------- | ---------------- | ------------------------------------------- |
| `SKIP_AUTH`                     | `true`           | Usa o usuário de dev abaixo sem sessão real |
| `DEV_USER_ID`                   | `1`              | ID do usuário simulado                      |
| `DEV_USER_NAME`                 | `ASOF Dev User`  | Nome exibido na sidebar                     |
| `DEV_USER_EMAIL`                | `dev@asof.local` | —                                           |
| `DEV_USER_ROLE`                 | `admin`          | `admin` \| `diretoria` \| `secretaria`      |
| `DEV_USER_MUST_CHANGE_PASSWORD` | `false`          | Simula fluxo de troca de senha              |

### Logging

| Variável    | Padrão | Descrição                                                                                                                        |
| ----------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL` | `info` | Nível mínimo de log: `debug`, `info`, `warn`, `error`. Em produção, o logger emite JSON; em desenvolvimento, formato colorizado. |

> `SKIP_AUTH=true` é **ignorado em `NODE_ENV=production`** — o proxy rejeita a flag mesmo que esteja definida.

### Integrações e webhooks outbound

| Variável                                       | Padrão  | Descrição                                                                                                             |
| ---------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `ASOF_INTEGRATIONS_ENABLED`                    | `false` | Habilita autenticação M2M para `/api/v1/*`; mantenha `false` no primeiro go-live, salvo decisão operacional explícita |
| `ASOF_INTEGRATION_HMAC_SECRET`                 | —       | Segredo legado para `ASOF_INTEGRATION_API_KEY` e fallback temporario de linhas antigas sem segredo por chave          |
| `ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS` | `300`   | Janela máxima de diferença para `x-asof-timestamp`                                                                    |
| `ASOF_WEBHOOK_SECRET_ENCRYPTION_KEY`           | —       | Chave usada para criptografar/decriptografar `webhook_subscriptions.secret_ciphertext`                                |
| `CRON_SECRET`                                  | —       | Segredo bearer enviado pelo Vercel Cron para `/api/v1/events/dispatch` e `/api/v1/juridico/sla-warnings`              |
| `ASOF_INTEGRATION_API_KEY`                     | —       | Compatibilidade legada para chave global sem escopos; não configurar em produção nova sem exceção registrada          |
| `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER`      | —       | Identificador publico Novu para renderizar o inbox; sem ele, o componente nao e carregado                             |
| `NEXT_PUBLIC_NOVU_BACKEND_URL`                 | —       | URL backend Novu opcional para self-hosted                                                                            |
| `NEXT_PUBLIC_NOVU_SOCKET_URL`                  | —       | URL websocket Novu opcional para self-hosted                                                                          |

O caminho M2M principal usa chaves persistidas em `integration_api_keys`, criadas por admin em `/app/config/integracoes/api-keys`, com escopos como `events:read`, `events:write`, `webhooks:manage` e `admin`. A UI exibe a API key e o segredo HMAC por chave uma unica vez na criacao ou rotacao; clientes devem assinar `x-asof-signature` com esse segredo. A chave global `ASOF_INTEGRATION_API_KEY` existe apenas como compatibilidade de transição, usa `ASOF_INTEGRATION_HMAC_SECRET`, gera log de depreciação e tem acesso irrestrito quando configurada.

As rotas versionadas atuais são `/api/v1/health`, `/api/v1/events`, `/api/v1/events/dispatch` e `/api/v1/juridico/sla-warnings`. Elas suportam a fundação outbound-only: eventos são gravados em `domain_events`, subscriptions são gerenciadas internamente por admins em `/app/config/integracoes/webhooks`, dispatch manual é feito por `/api/v1/events`, e os jobs agendados são feitos por rotas bearer-only configuradas em `vercel.json`. Como o deploy usa o plano Free/Hobby da Vercel, cada cron roda no máximo uma vez por dia (`0 3 * * *` para eventos e `0 4 * * *` para SLA jurídico). URLs de destino de webhooks devem ser HTTPS públicas; localhost, hostnames locais/internos e redes privadas/reservadas são rejeitados. Ainda não há endpoint inbound público.

Para o primeiro go-live, integrações/webhooks não são obrigatórios e produção deve manter `ASOF_INTEGRATIONS_ENABLED=false`, salvo decisão separada. Notificações são alertas persistidos e não dependem de entrega em tempo real.

---

## Banco de dados

O projeto usa PostgreSQL via Drizzle.

- **Desenvolvimento local:** PostgreSQL via Homebrew. Use `DATABASE_URL=postgres://<user>@localhost:5432/asof_intranet` e a mesma URL para `DATABASE_MIGRATION_URL` (não há pooler local, então a URL direta serve para ambos).
- **Produção / remoto:** Neon Postgres. Use a URL pooled em `DATABASE_URL` e a URL direta/non-pooling em `DATABASE_MIGRATION_URL`.
- **Staging / preview:** use banco separado. No setup atual, o ambiente `Preview` da Vercel nao deve carregar envs gerais de banco.

```bash
npm run db:generate   # gera migrações a partir do schema
npm run db:migrate    # aplica migrações pendentes com guardrail contra produção
npm run db:migrate:unsafe # chama drizzle-kit migrate diretamente; use só em diagnóstico controlado
npm run db:seed       # insere admin inicial (use --force para sobrescrever role/isActive)
npm run db:studio     # abre Drizzle Studio no browser
```

`npm run db:migrate` bloqueia `DATABASE_MIGRATION_ENV=production`, `VERCEL_ENV=production`, alvos com nome de host que parecem producao e alvos remotos quando `NODE_ENV=production`. Para uma migration manual de produção, execute somente depois de backup/snapshot, janela aprovada e plano de rollback documentado:

```bash
ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate
```

As migrações versionadas em `drizzle/postgres/` são tratadas como migrations transacionais. Operações PostgreSQL que exigem execução fora de transação, como `CREATE INDEX CONCURRENTLY` ou `DROP INDEX CONCURRENTLY`, não devem ser incluídas no fluxo `npm run db:migrate`. Para esses casos, use o procedimento operacional em `docs/runbook.md`: backup/snapshot, teste em staging, execução direta via `psql "$DATABASE_MIGRATION_URL"` em janela aprovada e validação posterior com `npm run test:db`.

As migrações PostgreSQL atuais ficam em `drizzle/postgres/`. O schema está em `src/lib/db/schema/`.

Se um segredo de banco for exposto em chat, log ou arquivo temporario, rotacione a senha no Neon e atualize imediatamente `DATABASE_URL` e `DATABASE_MIGRATION_URL` no Vercel.

---

## Comandos

### Desenvolvimento

```bash
npm run dev           # servidor de desenvolvimento (Webpack)
npm run dev:turbo     # servidor de desenvolvimento (Turbopack — diagnóstico)
npm run build         # build de produção (Webpack)
npm run build:turbo   # build de produção (Turbopack — diagnóstico)
npm run start         # serve o build de produção local
```

### Qualidade e PR

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript sem emitir arquivos
npm run format        # formata código com Prettier
npm run format:check  # valida formatação
npm run test          # Vitest (testes unitários)
npm run test:watch    # Vitest em modo watch
npm run audit         # npm audit
npm run validate:quick  # typecheck + lint + testes unitários
npm run validate:full   # quick validation + testes de DB + build
npm run scope:check   # verifica escopo de arquivos alterados
npm run pr:check      # verificações de prontidão para PR
```

`npm run pr:check` é o melhor gate único antes de abrir ou atualizar PR, porque combina checagem de escopo, typecheck, lint, testes, contrato de banco e build conforme a política atual do repo.

### Banco e testes dependentes de serviços

```bash
npm run test:db       # schema contract contra PostgreSQL real
npm run test:e2e      # Playwright (sobe app e banco E2E próprios)
npm run test:e2e:ui   # Playwright modo interativo
npm run test:e2e:debug # Playwright modo debug
npm run db:generate   # gera migrações Drizzle
npm run db:migrate    # aplica migrações com guardrails de produção
npm run db:seed       # insere admin inicial (use --force para sobrescrever role/isActive)
npm run db:studio     # abre Drizzle Studio
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

## Estrutura do projeto

```text
src/
  app/
    app/          # área autenticada (/app/*)
      associados/           # CRUD de associados + relatórios
      atividades/            # Kanban de atividades administrativas
      config/                # configurações, auditoria, usuários, integrações, lotações
      financeiro/mensalidades/ # mensalidades e dashboard financeiro
      juridico/              # consultas, processos, pareceres e notas jurídicas
      notifications/         # actions de notificação
      search/                # busca global
      secretaria/oficios/    # gestão de ofícios
    change-password/         # fluxo de troca de senha obrigatória
    login/        # página e actions de autenticação
    layout.tsx    # layout raiz (fontes, tema)
  components/     # componentes compartilhados (Sidebar, NavLink…)
  lib/
    activities/   # Activity (board) CRUD, assignments
    ai/           # integração Gemini
    associates/   # queries, repository, PII masking
    auth/         # sessão própria, requireAuth, config, rate limit
    crypto/       # criptografia PII (AES-256-GCM, HKDF, HMAC blind indexes)
    dashboard/    # queries de agregação
    db/           # cliente Drizzle/PostgreSQL + schema
    email/        # envio de email (Mailjet)
    finance/      # repository, service, queries do módulo financeiro
    integrations/ # auth M2M, envelopes JSON, outbox e webhooks outbound
    juridico/     # repository, service, queries do módulo jurídico
    notifications/ # repository, service, event bus de notificações
    oficios/      # repository, service, PDF, validações
    reports/      # geração de CSV e queries de relatório
    sanitize-pii.ts # sanitização de PII para logs e webhooks
    search/       # queries de busca
    storage/      # interface para storage de objetos privado
    ui/           # design tokens

proxy.ts          # proxy de autenticação (Next.js 16 — substitui middleware.ts)
drizzle/postgres/ # migrações PostgreSQL geradas
scripts/          # seed, diagnóstico e guardrails operacionais
```

## Documentação de referência

| Documento                              | Quando usar                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Arquitetura, fluxo de dados, mapa de módulos, deploy target e decisões técnicas.   |
| [`CONTEXT.md`](./CONTEXT.md)           | Glossário de domínio e regras de negócio.                                          |
| [`AGENTS.md`](./AGENTS.md)             | Instruções para agentes, vocabulário institucional, comandos e gotchas do projeto. |
| [`DESIGN.md`](./DESIGN.md)             | Design system, tokens, cores, tipografia e padrões visuais.                        |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Guia do desenvolvedor e padrão de contribuição.                                    |
| [`docs/runbook.md`](./docs/runbook.md) | Procedimentos operacionais: deploy, backup, rollback, smoke tests e incidentes.    |
| [`TODO-PROD.md`](./TODO-PROD.md)       | Checklist vivo de prontidão de produção e bloqueadores atuais.                     |
