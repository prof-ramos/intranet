# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ASOF Intranet — Sistema interno da Associação dos Oficiais de Chancelaria do Ministério das Relações Exteriores do Brasil. Gerencia ~763 associados, atividades administrativas, financeiro e comunicações internas da diretoria.

**Stack:** Next.js 16.2.6 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · DaisyUI 5 · Drizzle ORM · PostgreSQL/Neon · Auth server-side própria

## Setup

```bash
npm install
cp .env.example .env.local   # preencha SESSION_SECRET, DATABASE_URL etc. (use clone asof_intranet_neon_clone para dev realista — veja README)
npm run dev
```

## Commands

```bash
npm run dev              # next dev --webpack (padrão)
npm run dev:turbo        # next dev --turbopack (diagnóstico)
npm run build            # next build --webpack
npm run build:turbo      # next build --turbopack (diagnóstico)
npm run lint             # ESLint
npm run typecheck        # tsc --noEmit
npm run test             # vitest run (testes unitários)
npm run test:e2e         # playwright — usa 127.0.0.1:3001, não 3000
npm run test:db          # schema contract contra PostgreSQL ao vivo
npm run db:generate      # drizzle-kit generate
npm run db:migrate       # guarded — exige ALLOW_PRODUCTION_MIGRATIONS=true em produção
npm run db:seed          # seed admin via INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD
npm run db:studio        # Drizzle Studio
npm run audit            # npm audit (0 vulnerabilidades)
```

Rodar um arquivo de teste: `npx vitest run src/lib/auth/password.test.ts`

## Auth

- Server-side própria: `SESSION_SECRET`, `admins.password_hash`, cookie `httpOnly` assinado.
- `requireAuth()` / `requireRole()` para proteção de rotas.
- Dev local: `.env.local` com `SKIP_AUTH=true` + `DEV_USER_ID`, `DEV_USER_ROLE` etc.
- Roles: `admin`, `diretoria`, `secretaria`.

## Banco de Dados

- PostgreSQL gerenciado (Neon, `ep-empty-cake-ac26vl6w`, sa-east-1) em produção.
- **Desenvolvimento local:** Recomendado usar clone completo do Neon (`asof_intranet_neon_clone`) para dados reais (associados, etc.). Veja instruções completas em README.md (seção Banco de dados) e CONTRIBUTING.md. 
  - **Aviso LGPD:** Siga controles estritos (PII sensível — delete dumps, autorizado apenas, etc.). Prefira mínimo. Consulte lib/lgpd e ADRs.
- Alternativa mínima: `asof_intranet` vazio + `npm run db:seed`.
- Pooled (`DATABASE_URL`) para runtime, direct (`DATABASE_MIGRATION_URL`) para migrations.
- Conexão: `max: 10`, `max_lifetime: 1800`, `statement_timeout: 30000`, `application_name: 'asof-intranet'`.
- Multi-tabela: sempre usar `db.transaction()`.
- PII: `encryptPii()` + `piiBlindIndex()` para CPF, SIAPE, email, telefone, endereço. Plaintext nunca em logs.
- RLS: fora do gate do dia 1. Barreira de segurança = app server + credentials PostgreSQL restritas + LGPD.
- Para referência completa de tabelas, enums, índices e migrações, veja [`DATABASE.md`](./DATABASE.md).

## Estrutura

| Diretório | Conteúdo |
|-----------|----------|
| `src/app/` | App Router pages e Server Actions |
| `src/app/app/` | Área autenticada (sidebar + layout) |
| `src/app/login/` | Login e troca de senha |
| `src/components/` | UI components compartilhados |
| `src/lib/` | Serviços, repositórios, schema Drizzle |
| `src/hooks/` | React hooks |
| `src/lib/db/schema/` | Schemas Drizzle (admins, associates, activities, audit, finance, legal, monthly_payments, oficios, assignments, notifications, etc.) |
| `drizzle/postgres/` | Migrations SQL (baseline `0000_green_glorian.sql` + incrementais) |
| `docs/adr/` | ADRs (001-012) — decisões arquiteturais |
| `docs/` | Runbook, compliance LGPD, design, jornadas |

## Arquivos Importantes

- `src/proxy.ts` — route guard (verifica cookie de sessão, redireciona para /login)
- `src/lib/auth/require-auth.ts` — auth guard para pages
- `src/lib/env.ts` — validação de variáveis de ambiente (Zod)
- `src/lib/crypto/` — HKDF, encrypt/decrypt PII, blind index
- `src/lib/logger.ts` — logger estruturado com redacao de PII
- `src/lib/db/index.ts` — cliente Drizzle
- `src/lib/db/schema/enums.ts` — enums compartilhados
- `src/lib/notifications/` — notificações persistidas (polling, sem Realtime)
- `next.config.ts` — Next.js config
- `vercel.json` — deploy Vercel
- `TODO-PROD.md` — checklist de go-live

## PII e LGPD

- Campos protegidos: `cpf`, `siape`, `email`, `phone`, `whatsapp`, `address`, `birthDate`, `internalNotes`.
- Usar `encryptPii()` para armazenamento, `piiBlindIndex()` para busca, `sanitizePii()` para logs.
- Nunca expor plaintext em logs, erros ou respostas de API.
- Desfiamento/anonimização: ver ADR 006.

## API de Integrações

- Autenticação dual: env-var (`ASOF_INTEGRATIONS_ENABLED`) ou API key table-backed (`integration_api_keys`).
- Rate limiting: `src/lib/integrations/rate-limit.ts` (PostgreSQL-backed).
- Webhooks: dispatch transacional com `Promise.allSettled`, `webhook_deliveries` para retry.
- Cron jobs: `src/app/api/v1/cron/` — protegidos com `CRON_SECRET`.

## Testes

- Unitários: Vitest, `src/**/*.test.{ts,tsx}`, Node environment.
- Integração: `vitest.integration.config.ts` contra PostgreSQL real.
- E2E: Playwright, `http://127.0.0.1:3001`, database `asof_test` criado por `e2e/global-setup.ts`.
- Schema contract: `npm run test:db` valida tables, columns, enums, indexes, extensions e alinhamento de migrations.

## CI/CD

- 4 jobs: Lint/Typecheck/Test, Database Contract, Build Verification, E2E Tests.
- Node 24.x nos runners GitHub Actions.
- Deploy via push para `main` (produção) ou PR (preview).
- Domínio: `intranet.asof.com.br`.

## Gotchas

- Não fazer downgrade do Next.js abaixo de 16.2.6.
- `next.config.ts` fixa `turbopack.root` para evitar resolução de Tailwind pelo diretório pai.
- Dev server pesado em 8 GB RAM: usar `scripts/run-dev-60s.sh` para diagnósticos de freeze.
- E2E nunca aponta para `http://localhost:3000` (dev server); usa `3001` com `NEXT_E2E=1`.

## Documentação Relacionada

- `CONTEXT.md` — glossário e regras de negócio
- `README.md` — quick start
- `DATABASE.md` — schema, migrações, índices e convenções de banco
- `TODO-PROD.md` — checklist de go-live
- `docs/runbook.md` — runbook operacional
- `docs/adr/` — ADRs 001-012
- `API.md` — superfície HTTP pública
- `PAGES.md` — páginas e funcionalidades

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` at root + `docs/adr/`. See `docs/agents/domain.md`.

## Feedback e Armadilhas Operacionais (Memória)

- **Neon Free Tier Retention Limit:** O roteiro de Go-Live exige retenção de backup contínuo (PITR) de no mínimo 24h. No entanto, o plano *Free* do Neon Database limita o `history_retention_seconds` a 21600 (exatas 6 horas). Não é possível alterar este valor via API ou CLI (`neonctl projects update ...`) sem antes migrar o projeto para o plano Launch/Pro. Se for realizar validações de Go-Live e rollbacks na camada Free, a janela completa deve durar menos de 6 horas.
- **Vercel CLI Interactive Prompts:** Ao usar `vercel env add <KEY> production --force` em um processo não interativo (background), a CLI pode congelar esperando confirmação `(y/N)` se a variável já existir ou for sobreposição. **Solução:** Sempre use a flag combinada `--force --yes` para scripts automatizados ou background tasks.
- **Vercel Postgres Integration (Branching):** Na integração oficial da Neon com a Vercel, o setup de "Create Database Branch For Deployment" permite injetar o prefixo customizado `DATABASE` (gerando a esperada `DATABASE_URL`). O **checkbox de Preview** deve ser marcado para rodar testes em clones descartáveis, mas o **checkbox de Production** deve ser rigorosamente **desmarcado** para que o ambiente Vercel de produção se conecte à branch principal (`main`) e não crie ramificações divergentes na produção.
- **Variáveis Obrigatórias no Next.js (CRON_SECRET):** O esquema de validação em `src/lib/env.ts` exige a presença de `CRON_SECRET` e `ASOF_INTRANET_URL` no Vercel (se `VERCEL_ENV === 'production'`). Sem essas variáveis cadastradas via painel ou Vercel CLI, o *build* (e consequentemente o E2E test) falha. Em testes locais/E2E com pipeline simulando produção (`global-setup.ts`), essas variáveis devem ser explicitamente mockadas.
- **Next.js Native Code Signing em Agentes (E2E):** O ambiente do Next.js (pacotes nativos como `@next/swc-darwin-arm64` e `lightningcss`) falha com erros de `dlopen` sob o Node.js embutido do Codex.app/Antigravity devido a uma divergência estrita de Team ID no macOS (Code Signing). Ao rodar `npm run test:e2e` ou `npm run dev` localmente através da IA no Mac, deve-se forçar o uso do Node do sistema (ex: `PATH="/opt/homebrew/bin:$PATH" npm run test:e2e`) para evitar falhas silenciosas de runtime.
- **Timeout Oculto no Playwright `global-setup.ts`:** Durante o setup do E2E, se o `fetch` que verifica a prontidão do Next.js (dev server) não tiver um `AbortSignal` configurado, uma compilação lenta do Next.js (comum em setups frios, levando mais de 60s) fará a requisição travar indefinidamente. Isso estoura o deadline do `global-setup` silenciosamente sem expor a causa raiz. Sempre use timeouts curtos no `fetch` (5-10s) dentro do loop de verificação, junto com um deadline elástico (ex: 120s).
- **Processos Órfãos do Next.js (EADDRINUSE):** Ao rodar E2E local, matar o processo de PID registrado frequentemente deixa os *workers* filhos do Next.js ativos, travando a porta 3001 nas execuções subsequentes. Use sempre a porta para limpeza agressiva: `lsof -ti:3001 | xargs kill -9`.
