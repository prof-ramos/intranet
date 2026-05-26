# Guia do Desenvolvedor — ASOF Intranet

Este guia orienta a configuração local, a navegação pelo código, o fluxo de desenvolvimento, a abordagem de testes e os problemas mais comuns da ASOF Intranet.

Última atualização: 2026-05-25

## 1. Instruções de configuração

### Pré-requisitos

- Node.js compatível com Next.js 16 e TypeScript 6.
- `npm`. Este projeto usa `package-lock.json`; não use `pnpm` ou `yarn` por padrão.
- PostgreSQL local, preferencialmente via Homebrew no macOS.
- Git e GitHub CLI (`gh`) para branches, PRs e triagem.
- Para qualquer script Python futuro, use `uv` por padrão (`uv run`, `uv add`, `uv sync`).

### Instalação local

```bash
git clone https://github.com/prof-ramos/intranet.git
cd intranet
npm install
cp .env.example .env.local
```

Para desenvolvimento local, configure `.env.local` apontando para PostgreSQL local:

```bash
DATABASE_URL=postgres://$USER@localhost:5432/asof_intranet
DATABASE_MIGRATION_URL=postgres://$USER@localhost:5432/asof_intranet
SKIP_AUTH=true
DEV_USER_ID=1
DEV_USER_NAME="ASOF Dev User"
DEV_USER_EMAIL=dev@asof.local
DEV_USER_ROLE=admin
DEV_USER_MUST_CHANGE_PASSWORD=false
```

No macOS com Homebrew, o PostgreSQL costuma criar a role com o nome do usuário do sistema. Nesta máquina, por exemplo, `postgres://gabrielramos@localhost:5432/...` é o padrão; não assuma `postgres://postgres@localhost:5432/...`.

Inicialize o banco e a aplicação:

```bash
createdb asof_intranet
npm run db:migrate
npm run db:seed
npm run dev
```

Acesse `http://localhost:3000`.

### Banco de Produção (Neon)

- Desenvolvimento local deve usar PostgreSQL local.
- Produção oficial: Instância PostgreSQL gerenciada (`asof-intranet` no Vercel).
- Autenticação: O app possui auth própria via cookie de sessão assinado por `SESSION_SECRET` (httpOnly). O login de administradores usa `admins.email` e `admins.password_hash` (bcryptjs), conforme `ARCHITECTURE.md`.
- Staging/preview deve usar banco separado.
- `npm run db:migrate` passa por `scripts/guarded-migrate.ts` e bloqueia produção sem `ALLOW_PRODUCTION_MIGRATIONS=true`.
- Para o fluxo de reset de senha (senha temporária), `ASOF_INTRANET_URL` deve apontar para `https://intranet.asof.com.br`.

Use o runbook para operações reais de deploy, backup, rollback e smoke test: [`docs/runbook.md`](./docs/runbook.md).

## 2. Visão geral da estrutura do projeto

O projeto é uma aplicação Next.js 16 App Router full-stack. Server Components, Server Actions, Route Handlers e acesso ao banco vivem no mesmo repositório.

```text
src/
  app/
    app/                    # área autenticada (/app/*)
      associados/           # cadastro, perfil, relatórios e exportação
      atividades/           # kanban administrativo
      config/               # usuários, lotações, auditoria e integrações
      financeiro/           # mensalidades e pagamentos
      juridico/             # consultas jurídicas, SLA e histórico
      secretaria/oficios/   # geração e gestão de ofícios
      search/               # busca global
    login/                  # login com auth server-side e cookie HTTP-only
    change-password/        # troca de senha obrigatória
  components/               # componentes compartilhados
  lib/
    auth/                   # sessão, autorização, rate limit e senha
    db/                     # cliente Drizzle e schema
    crypto/                 # contextos de criptografia e master key
    associates/             # domínio de associados
    activities/             # domínio de atividades
    juridico/               # repository, service e queries jurídicas
    finance/                # repository, service e queries financeiras
    oficios/                # ofícios, validações e PDF
    integrations/           # API keys, webhooks e auth M2M
    notifications/          # notificações e realtime
    email/                  # Mailjet e templates
    logger.ts               # logger estruturado com redação de PII
    sanitize-pii.ts         # sanitização de CPF, SIAPE, email e tokens
  proxy.ts                  # guarda de autenticação do Next.js 16

drizzle/postgres/           # migrations Drizzle/PostgreSQL
scripts/                    # seed, diagnóstico e migrations
docs/                       # runbooks, ADRs, compliance e notas operacionais
```

Mapa mental para uma feature típica:

```text
src/app/app/<area>/page.tsx
  -> src/app/app/<area>/actions.ts
  -> src/lib/<domain>/{queries,service,repository}.ts
  -> src/lib/db/schema/<domain>.ts
  -> PostgreSQL (Neon / Local)
```

Regras importantes:

- Use `requireAuth()` para usuário autenticado e `requireRole()` para restrições de papel.
- Não exponha CPF, SIAPE, email, tokens, reset links completos ou dados funcionais em logs, erros ou payloads públicos.
- Use `createLogger('module-name')` em vez de `console.*` em código de produção.
- Prefira repository/service para regras e SQL; Server Actions devem validar entrada, chamar domínio e revalidar cache.
- O mapa arquitetural mais completo está em [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## 3. Fluxo de trabalho de desenvolvimento

### Antes de começar

```bash
git status --short --branch
git worktree list
```

Não misture frentes no mesmo PR. Se houver mudanças não relacionadas, preserve-as em branch, stash ou worktree dedicado antes de iniciar outra tarefa.

Para features novas, prefira worktree isolado:

```bash
git worktree add -b codex/minha-feature .worktrees/minha-feature
cd .worktrees/minha-feature
npm install
```

### Durante a implementação

1. Leia o módulo existente antes de editar.
2. Siga padrões locais de imports, componentes, services e repositories.
3. Para páginas, comece com Server Component; crie Client Component apenas para interação.
4. Para mutações, use Server Action com validação explícita de auth, role e input.
5. Para mudanças de banco, edite `src/lib/db/schema/*`, rode `npm run db:generate`, revise a migration e aplique localmente com `npm run db:migrate`.
6. Não coloque `CREATE INDEX CONCURRENTLY` ou `DROP INDEX CONCURRENTLY` em migrations Drizzle transacionais; use o procedimento operacional do runbook.
7. Evite `git add .`; faça staging por arquivo e confira o diff.

Comandos comuns:

```bash
npm run dev             # Next dev com Webpack
npm run dev:turbo       # Turbopack, apenas diagnóstico
npm run typecheck
npm run lint
npm run test
npm run validate:quick
npm run validate:full
npm run pr:check
```

`npm run pr:check` é o melhor gate único antes de abrir ou atualizar PR porque combina escopo, typecheck, lint, testes, contrato de banco e build.

### Antes de abrir PR

```bash
git status --short
npm run pr:check
git diff --cached --name-status
```

O PR deve ter uma responsabilidade clara. Explique impacto, validação executada e qualquer bloqueio externo, especialmente quando depender de Vercel, Neon, Mailjet ou smoke test em ambiente alvo.

## 4. Abordagem de teste

### Camadas de teste

| Camada     | Comando             | Quando usar                                                                           |
| ---------- | ------------------- | ------------------------------------------------------------------------------------- |
| Unitário   | `npm run test`      | Regras puras, helpers, Server Actions mockadas, validações e services sem banco real. |
| Typecheck  | `npm run typecheck` | Sempre antes de PR; pega contratos TypeScript e imports quebrados.                    |
| Lint       | `npm run lint`      | Sempre antes de PR; mantém padrões Next/React/TS.                                     |
| Banco real | `npm run test:db`   | Mudanças em schema, migrations, enums, RLS, índices e contrato Drizzle.               |
| E2E        | `npm run test:e2e`  | Fluxos de login, navegação e workflows críticos.                                      |
| Build      | `npm run build`     | Mudanças em Next.js, env, renderização, imports server/client e deploy readiness.     |

### Testes unitários

Use Vitest. Arquivos ficam próximos ao código:

```text
src/lib/auth/password.test.ts
src/lib/juridico/service.test.ts
src/app/app/config/usuarios/actions.test.ts
```

Rode um arquivo específico:

```bash
npx vitest run src/lib/auth/password.test.ts
```

Rode por nome:

```bash
npx vitest run -t "rejects password reset"
```

### Testes de banco

`npm run test:db` usa `.env.local` e valida o PostgreSQL real contra schema, migrations, enums, índices, extensões e `drizzle.__drizzle_migrations`.

Use banco dedicado para integração. Nunca rode testes contra produção.

```bash
createdb asof_intranet_test
DATABASE_URL=postgres://$USER@localhost:5432/asof_intranet_test \
DATABASE_MIGRATION_URL=postgres://$USER@localhost:5432/asof_intranet_test \
npm run db:migrate
```

### Testes E2E

Use sempre:

```bash
npm run test:e2e
```

O Playwright usa `http://localhost:3001`. O `global-setup` cria/migra/semeia `asof_test` e sobe um servidor Next separado com `NEXT_E2E=1` e `distDir: .next-e2e`.

Não aponte E2E para `http://localhost:3000` sem semear intencionalmente esse banco. O servidor em `3000` usa `.env.local`, normalmente `asof_intranet`, e logins E2E podem falhar ou disparar rate limit.

## 5. Solução de problemas comum

### `npm run dev` congela, fica lento ou consome memória demais

Use o wrapper controlado:

```bash
scripts/run-dev-60s.sh
```

Ele inicia o dev server, coleta estado, faz `curl`, grava `next-dev-60s.log` e encerra a árvore de processos.

### Turbopack falha ou Tailwind/CSS parece incorreto

Use Webpack, que é o padrão do repo:

```bash
npm run dev
npm run build
```

`npm run dev:turbo` e `npm run build:turbo` são checks explícitos de diagnóstico.

### Migração bloqueada pelo guardrail

Se a URL contém o Neon de produção conhecido, `npm run db:migrate` bloqueia por segurança.

Para produção real, só use opt-in depois de backup/snapshot, janela aprovada e rollback documentado:

```bash
ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate
```

Para desenvolvimento, corrija `.env.local` para apontar ao PostgreSQL local.

### `DATABASE_MIGRATION_URL ... must be set`

O migrador não encontrou URL. Defina pelo menos uma destas variáveis:

```bash
DATABASE_MIGRATION_URL=postgres://$USER@localhost:5432/asof_intranet
DATABASE_URL=postgres://$USER@localhost:5432/asof_intranet
```

### Login retorna `/login?error=1`

A autenticação é server-side e validada diretamente contra a tabela `admins`.

Possíveis causas:

- O usuário não existe na tabela `admins` do ambiente usado.
- Credenciais incorretas (verifique se `email` e `password_hash` batem com o esperado).
- `.env.local` aponta para banco diferente do que você acha.
- E2E foi rodado contra o servidor normal em `3000`.

Para desenvolvimento rápido, use `SKIP_AUTH=true` com `DEV_USER_*`.

### Login retorna `/login?error=rate-limit`

Limpe apenas as tentativas do usuário de teste no banco local:

```sql
DELETE FROM login_attempts WHERE email_hash IS NOT NULL;
```

Se estiver diagnosticando um email específico, prefira usar os helpers/testes de rate limit em vez de tentar reconstruir o hash manualmente.

### Build falha por env inválida

Confira [`src/lib/env.ts`](./src/lib/env.ts). Em produção, `CRON_SECRET` é obrigatório quando `VERCEL_ENV=production`; `SKIP_AUTH=true` é ignorado em `NODE_ENV=production`.

### Erro de Server Component com event handler

Server Components não podem passar `onClick`, `onChange` ou closures interativas para filhos client-side. Extraia a parte interativa para um arquivo com `'use client'`.

### Fluxo de reset de senha apresenta problemas

Confirme:

```bash
ASOF_INTRANET_URL=https://intranet.asof.com.br
```

O sistema gera uma senha temporária no backend e a entrega à UI/usuário conforme o fluxo atual. Não há geração de link com token mágico.

### E2E falha em `/login`

Não use o dev server de `3000`. Rode `npm run test:e2e` e deixe o Playwright subir `3001` com banco `asof_test`.

Se houver erro persistente, apague apenas o estado E2E local (`.next-e2e`, banco `asof_test` se necessário) e rode novamente.

## Referências rápidas

- [`README.md`](./README.md): visão geral, comandos e setup rápido.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): mapa completo de módulos e decisões de arquitetura.
- [`docs/runbook.md`](./docs/runbook.md): operação, backup, rollback, deploy e incidentes.
- [`TODO-PROD.md`](./TODO-PROD.md): checklist vivo de prontidão de produção.
- [`AGENTS.md`](./AGENTS.md): instruções operacionais para agentes neste repo.
