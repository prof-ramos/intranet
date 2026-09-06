# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ASOF Intranet — Sistema interno da Associação dos Oficiais de Chancelaria do Ministério das Relações Exteriores do Brasil. Gerencia o Cadastro de Oficiais de Chancelaria, o vínculo ASOF, atividades administrativas, financeiro e comunicações internas da diretoria.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · DaisyUI 5 · Drizzle ORM · PostgreSQL/Neon · Auth server-side própria

## Setup

```bash
npm install
cp .env.example .env.local   # preencha SESSION_SECRET, DATABASE_URL etc.; dev padrão usa asof_intranet local
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
npm run test:coverage    # vitest run --coverage (requer @vitest/coverage-v8)
npm run test:e2e         # playwright — usa 127.0.0.1:3001, não 3000
npm run test:db          # schema contract read-only — seguro contra staging e .env.local
npm run test:integration # DML integration tests — requer .env.test.local com DB localhost
                         # pula graciosamente se .env.test.local não existir
npm run validate:quick   # lint + typecheck + testes unitários
npm run validate:full    # validate:quick + test:db + test:integration + build
npm run pr:check         # verificações de prontidão para PR
npm run scope:check      # verifica escopo de arquivos alterados
npm run db:generate      # drizzle-kit generate
npm run db:migrate       # guarded — exige ALLOW_PRODUCTION_MIGRATIONS=true em produção
npm run db:seed          # seed base mínimo: admin + advogados
npm run db:seed:dev      # seed sintético local: oficiais, mensalidades, atividades, jurídico e ofícios
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

- Fonte oficial de ambientes/bancos: `docs/environments.md` (ADR 015). Se outro arquivo divergir, corrija o outro arquivo.
- PostgreSQL gerenciado (Neon, projeto `intranet-db` / `long-leaf-97822199`, `ep-empty-cake-ac26vl6w`, sa-east-1) em produção.
- Desenvolvimento diário padrão: Postgres local `asof_intranet` + seed sintético.
- `npm run db:seed` é o seed base mínimo. `npm run db:seed:dev` é a massa sintética robusta para desenvolvimento local. Não usar dados reais como onboarding padrão.
- `npm run db:seed:dev` bloqueia hosts remotos por padrão. Só usar `ALLOW_REMOTE_DEV_SEED=SEED_SYNTHETIC_DATA` em branch remoto descartável e documentado.
- Dados reais em `vercel-dev` ou `asof_intranet_neon_clone` são exceção LGPD restrita para bugs de volume/importação/performance; não são onboarding padrão.
- Pooled (`DATABASE_URL`) para runtime, direct (`DATABASE_MIGRATION_URL`) para migrations. `DATABASE_URL_UNPOOLED` pode existir por integração Vercel/Neon, mas não é o contrato operacional oficial.
- Conexão: `max: 10`, `max_lifetime: 1800`, `statement_timeout: 30000`, `application_name: 'asof-intranet'`.
- Nunca aplique migrations direto na branch Neon `main` fora do runbook.
- Staging só migra com `DATABASE_MIGRATION_ENV=staging`, `ALLOW_STAGING_MIGRATIONS=true` e `DATABASE_STAGING_HOST` batendo exatamente com o host direto do banco oficial de staging.
- Multi-tabela: sempre usar `db.transaction()`.
- PII: `encryptPii()` + `piiBlindIndex()` para CPF, SIAPE, email, telefone, endereço. Plaintext nunca em logs.
- RLS: fora do gate do dia 1. Barreira de segurança = app server + credentials PostgreSQL restritas + LGPD.
- Para referência completa de tabelas, enums, índices e migrações, veja [`DATABASE.md`](./DATABASE.md).

### Domínio cadastral

- O módulo principal é **Cadastro de Oficiais**. A rota permanece `/app/associados` por compatibilidade histórica.
- A tabela `associates` representa a totalidade conhecida dos Oficiais de Chancelaria, incluindo associados e não associados à ASOF, ativos e aposentados.
- `associationStatus` significa **Vínculo ASOF** e usa somente `associado` ou `nao_associado`.
- `functionalStatus` significa **Situação funcional** e usa `ativo`, `aposentado`, `cedido`, `em_licenca`.
- Não usar `inativo` para não associado. No domínio da ASOF, “inativo” é sinônimo operacional de aposentadoria/inatividade funcional.
- `contributionStatus` usa somente `em_dia` ou `inadimplente`; `pendente_migracao` não existe como status de contribuição.

## Estrutura

| Diretório            | Conteúdo                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/`           | App Router pages e Server Actions                                                                                                                                   |
| `src/app/app/`       | Área autenticada (sidebar + layout)                                                                                                                                 |
| `src/app/login/`     | Login e troca de senha                                                                                                                                              |
| `src/components/`    | UI components compartilhados                                                                                                                                        |
| `src/lib/`           | Serviços, repositórios, schema Drizzle                                                                                                                              |
| `src/hooks/`         | React hooks                                                                                                                                                         |
| `src/lib/db/schema/` | Schemas Drizzle (admins, associates, activities, audit, finance, legal, monthly_payments, oficios, assignments, notifications, dependents, health_agreements, etc.) |
| `drizzle/postgres/`  | Migrations SQL (baseline `0000_green_glorian.sql` + incrementais)                                                                                                   |
| `docs/adr/`          | ADRs — decisões arquiteturais                                                                                                                                       |
| `docs/`              | Runbook, compliance LGPD, design, jornadas                                                                                                                          |

## Arquivos Importantes

- `src/proxy.ts` — route guard (verifica cookie de sessão, redireciona para /login)
- `src/lib/auth/require-auth.ts` — auth guard para pages
- `src/lib/env.ts` — validação de variáveis de ambiente (Zod)
- `src/lib/crypto/` — HKDF, encrypt/decrypt PII, blind index
- `src/lib/logger.ts` — logger estruturado com redacao de PII
- `src/lib/db/index.ts` — cliente Drizzle
- `src/lib/db/schema/enums.ts` — enums compartilhados
- `src/lib/associates/search-params.ts` — parâmetros de busca (searchBy: name/cpf/siape, returnTo)
- `src/lib/associates/lgpd.ts` — campos exportáveis, classificação PII/PUBLIC, mapeamento de descriptografia
- `src/lib/reports/csv.ts` — geração CSV com formatação pt-BR, prevenção de injeção de fórmula, labels de enum
- `src/lib/reports/queries.ts` — queries de relatório com descriptografia PII (ciphertext fallback)
- `src/app/app/associados/[id]/actions.ts` — server actions CRUD para dependentes e convênios
- `src/app/app/associados/[id]/DependentManager.tsx` — componente cliente para gerenciamento inline de dependentes e convênios
- `scripts/seed-dev.ts` — massa sintética robusta para desenvolvimento local, sem PII real
- `src/lib/notifications/` — persistência PostgreSQL via `emitEvent`; UI = `NotificationBell` (polling) no layout autenticado
- `src/lib/assinafy/service.ts` — orquestra webhook Assinafy; idempotência dentro de `db.transaction`; veja ADR 013
- `src/lib/integrations/verify-request.ts` — autenticação M2M dual (env-var + table-backed), rate limiting, prevenção de replay via nonces
- `next.config.ts` — Next.js config
- `vercel.json` — deploy Vercel
- `TODO-PROD.md` — checklist de go-live

## PII e LGPD

- Campos protegidos: `cpf`, `siape`, `rg`, `email`, `phone`, `whatsapp`, `address`, `birthDate`, `internalNotes`.
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
- Validation gates na ordem oficial: `npm run lint` → `npm run typecheck` → `npm run test` → `npm run test:db` → `npm run build`.

## CI/CD

- 4 jobs: Lint/Typecheck/Test, Database Contract, Build Verification, E2E Tests.
- Node 20.x nos runners GitHub Actions.
- Deploy via push para `main` (produção) ou PR (preview).
- Domínio: `intranet.asof.com.br`.

## Gotchas

- Não fazer downgrade do Next.js abaixo de Next.js 16. Versão exata em `package.json`.
- `next.config.ts` fixa `turbopack.root` para evitar resolução de Tailwind pelo diretório pai.
- Dev server pesado em 8 GB RAM: usar `scripts/run-dev-60s.sh` para diagnósticos de freeze.
- E2E nunca aponta para `http://localhost:3000` (dev server); usa `3001` com `NEXT_E2E=1`.

## Documentação Relacionada

- `CONTEXT.md` — glossário e regras de negócio; autoridade de vocabulário do domínio
- `README.md` — quick start
- `DATABASE.md` — schema, migrações, índices e convenções de banco
- `TODO-PROD.md` — checklist de go-live
- `docs/runbook.md` — runbook operacional
- `docs/environments.md` — matriz oficial de ambientes, bancos, dados e migrations
- `docs/adr/015-official-environment-and-data-matrix.md` — decisão oficial de ambientes/dados
- `docs/adr/016-neon-free-tier-pre-go-live-reset.md` — reset pré-go-live no Neon Free Tier
- `docs/adr/` — ADRs
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

- **Comunicação pt-BR:** default com usuário/operador é português. Skills com templates em inglês (ex. menus de `finishing-a-development-branch`) devem apresentar opções e status em pt-BR — não espelhar o idioma do SKILL.md. Detalhe em `docs/agent-memory/feedback.md`.
- **Neon prod via GHA, não OAuth pessoal:** conta OAuth típica **não** é membro de `org-red-mode-09715915`. Usar workflows `Migrate Production` / reconcile / clear-duplicate-hashes com `NEON_API_KEY`. Não colar callback OAuth com `code=` no chat. Detalhe em `docs/agent-memory`.
- **zsh + placeholders `<…>`:** `<role>` vira redirecionamento; usar nome literal ou omitir `--role-name`.
- **Webhook unit tests:** mockar `isPublicWebhookUrl` (DNS ao vivo em `example.com` quebra a suite). PR #439 / #436.
- **Unique hash 0033:** duplicatas bloqueiam migrate; se reconcile tem `eligibleCount: 0`, clear hashes (NULL; múltiplos NULL OK no unique) — não forçar merge cadastral. Clear só zera hash (ciphertext fica): editar o duplicata recria o hash e estoura unique. Audit do clear aponta para `keepId`. Script `--apply` não tem guard de host — só via GHA.
- **postgres.js `sql.begin`:** `TransactionSql` ≠ `Sql` → typecheck/preview quebram; SQL inline no callback. `array_agg` bigint → coerce `Number()` antes do sort.
- **npm audit / undici:** residual moderate transitivo do Next — não `npm audit fix --force`.
- **CI "Database Contract" ≠ só schema:** o job roda migrate + `test:db` + `test:integration`. Falha pode ser `server-only` sem alias no `vitest.integration.config.ts` (unit já tem). Ler o step do log antes de culpar migration.
- **Deploy Vercel não migra Neon:** após PR com coluna nova, aplicar `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate` (ou workflow GHA / neonctl + guarded-migrate) **antes** de confiar no smoke prod. Sintoma clássico: `column "X" does not exist` no POST de create.
- **Smoke "CPF já existe" sem CPF no form:** `buildPiiPatch` não pode hashear `''` — blank → clear (hash null). 1º create sem PII grava hash de vazio; 2º colide. Ver `docs/agent-memory` + PR #302.
- **Smoke fail-fast:** só `form [role="alert"]`; `.text-red-*` casa botão Remover e gera falso positivo (create pode ter sucesso no DB). PR #303.
- **Smoke residual:** limpar `SMOKE_%` após qualquer run (SQL impresso no log não auto-executa). Combinar com check de `cpf_hash`/`siape_hash` no residual.
- **vercel env pull production:** keys DATABASE\_\* podem vir com valor vazio (Neon integration). Preferir `neonctl connection-string` (org `org-red-mode-09715915`, project `long-leaf-97822199`) e **não imprimir** a URL com senha.
- **Husky pre-commit:** precisa shebang + mode 100755; leve no commit (lint-staged+typecheck), suite no pre-push. PR #300.
- **Orquestrador babysita CI até o fim:** após push, polle checks, fixe falhas e só encerre com status final — não "aguardar re-run" e parar.
- **finishing-branch em `main` com docs unstaged:** não mergear local; branch `docs/…` + PR (ex. #447).

- **Neon Free Tier Retention Limit:** O roteiro de Go-Live exige retenção de backup contínuo (PITR) de no mínimo 24h. No entanto, o plano _Free_ do Neon Database limita o `history_retention_seconds` a 21600 (exatas 6 horas). Não é possível alterar este valor via API ou CLI (`neonctl projects update ...`) sem antes migrar o projeto para o plano Launch/Pro. Se for realizar validações de Go-Live e rollbacks na camada Free, a janela completa deve durar menos de 6 horas.
- **Vercel CLI Interactive Prompts:** Ao usar `vercel env add <KEY> production --force` em um processo não interativo (background), a CLI pode congelar esperando confirmação `(y/N)` se a variável já existir ou for sobreposição. **Solução:** Sempre use a flag combinada `--force --yes` para scripts automatizados ou background tasks.
- **Vercel Postgres Integration (Branching):** Na integração oficial da Neon com a Vercel, o setup de "Create Database Branch For Deployment" permite injetar o prefixo customizado `DATABASE` (gerando a esperada `DATABASE_URL`). O **checkbox de Preview** deve ser marcado para rodar testes em clones descartáveis, mas o **checkbox de Production** deve ser rigorosamente **desmarcado** para que o ambiente Vercel de produção se conecte à branch principal (`main`) e não crie ramificações divergentes na produção.
- **Neon Free Tier: branch de preview não é limpa automaticamente pela Native Integration:** a integração nativa Vercel↔Neon (usada neste projeto, diferente da "Neon-Managed Integration" via Connectable Accounts) **não tem toggle de auto-delete de branch no dashboard**. Cada PR aberto cria uma branch `preview/<nome-do-branch-git>` no Neon que só é removida quando o Vercel expira a retenção do deployment — o que pode nunca acontecer antes de bater no limite de 10 branches do Free Tier e travar `Create database branch for deployment` em novos PRs (já ocorreu 2x). Mitigado por `.github/workflows/cleanup-neon-branch.yml`, que deleta a branch Neon correspondente assim que o PR fecha (merged ou não), via `NEON_API_KEY` (secret, escopo restrito a este projeto — não org-wide) e `NEON_PROJECT_ID` (variable) no repo GitHub. Se o limite for atingido mesmo assim, `npx neonctl branches list --project-id long-leaf-97822199 --org-id org-red-mode-09715915` mostra o estado atual; branches `preview/*` de PRs já fechados são sempre seguras para apagar.
- **Variáveis Obrigatórias no Next.js (CRON_SECRET):** O esquema de validação em `src/lib/env.ts` exige a presença de `CRON_SECRET` e `ASOF_INTRANET_URL` no Vercel (se `VERCEL_ENV === 'production'`). Sem essas variáveis cadastradas via painel ou Vercel CLI, o _build_ (e consequentemente o E2E test) falha. Em testes locais/E2E com pipeline simulando produção (`global-setup.ts`), essas variáveis devem ser explicitamente mockadas.
- **Next.js Native Code Signing em Agentes (E2E):** O ambiente do Next.js (pacotes nativos como `@next/swc-darwin-arm64` e `lightningcss`) falha com erros de `dlopen` sob o Node.js embutido do Codex.app/Antigravity devido a uma divergência estrita de Team ID no macOS (Code Signing). Ao rodar `npm run test:e2e` ou `npm run dev` localmente através da IA no Mac, deve-se forçar o uso do Node do sistema (ex: `PATH="/opt/homebrew/bin:$PATH" npm run test:e2e`) para evitar falhas silenciosas de runtime.
- **Timeout Oculto no Playwright `global-setup.ts`:** Durante o setup do E2E, se o `fetch` que verifica a prontidão do Next.js (dev server) não tiver um `AbortSignal` configurado, uma compilação lenta do Next.js (comum em setups frios, levando mais de 60s) fará a requisição travar indefinidamente. Isso estoura o deadline do `global-setup` silenciosamente sem expor a causa raiz. Sempre use timeouts curtos no `fetch` (5-10s) dentro do loop de verificação, junto com um deadline elástico (ex: 120s).
- **Processos Órfãos do Next.js (EADDRINUSE):** Ao rodar E2E local, matar o processo de PID registrado frequentemente deixa os _workers_ filhos do Next.js ativos, travando a porta 3001 nas execuções subsequentes. Use sempre a porta para limpeza agressiva: `lsof -ti:3001 | xargs kill -9`.
