<!-- Generated: 2026-05-26 | Updated: 2026-06-01 -->
<!-- Parent: none (root) -->

# ASOF Intranet — AI Agent Directory

## Purpose

Next.js 16 App Router application for ASOF (associação) internal management — associates, activities (kanban), juridico/consultas, financeiro/mensalidades, oficios, notifications, audit, LGPD compliance. Drizzle ORM + Neon Postgres, Playwright e2e, Vitest unit+integration, Server Actions, self-hosted auth with cookie sessions.

## Key Files

| File | Description |
|------|-------------|
| `CLAUDE.md` | Project instructions for AI agents (read FIRST) |
| `AGENTS.md` | This file — AI agent directory navigation |
| `CONTEXT.md` | Glossary, domain rules, institutional context |
| `TODO-PROD.md` | Go-live checklist and production readiness |
| `package.json` | Dependencies and scripts (dev, build, test, e2e, typecheck, lint, migrate, validate) |
| `next.config.ts` | Next.js 16.2.6 config — security headers, E2E `distDir` swap, fixed `turbopack.root` |
| `src/lib/env.ts` | Zod-validated env; **throws on startup** if required vars are missing (blocks build) |
| `src/proxy.ts` | Route guard (Next.js 16 `proxy.ts`); redirects to `/login` for `/app/*` and `/change-password` when no session cookie |
| `drizzle.config.ts` | Drizzle Kit — rejects transaction-mode pooler URLs (port 6543); use `DATABASE_MIGRATION_URL` |
| `playwright.config.ts` | baseURL `http://localhost:3001`, `expect.timeout: 15_000`, workers=1, retries 2 in CI |
| `vitest.config.ts` | Unit config — `src/**/*.test.{ts,tsx}` + `scripts/**/*.test.ts`; mocks `server-only` |
| `vitest.integration.config.ts` | Integration config — `src/**/*.integration.test.{ts,tsx}` |
| `vercel.json` | Vercel deployment + cron schedules (5 cron jobs) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | Application source (pages, components, lib, hooks) — see `src/AGENTS.md` |
| `docs/` | ADRs, design docs, runbooks, compliance — see `docs/AGENTS.md` |
| `scripts/` | DB scripts, seed, migrations, PII encryption — see `scripts/AGENTS.md` |
| `e2e/` | Playwright end-to-end tests — see `e2e/AGENTS.md` |
| `drizzle/` | SQL migrations and schema snapshots — see `drizzle/AGENTS.md` |
| `.github/` | CI/CD workflows, branch rules, PR template — see `.github/AGENTS.md` |

---

<!-- BEGIN:nextjs-agent-rules -->

# Contexto Institucional

A ASOF (Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro) é uma associação civil sem fins lucrativos fundada em 1991, com ~763 associados. Representa a carreira de Oficial de Chancelaria do Ministério das Relações Exteriores (Itamaraty/MRE) — servidores de nível superior responsáveis pela gestão administrativa da política externa brasileira.

## Vocabulário do domínio → campos do banco

| Termo                    | Significado                                                                           | Campo DB             |
| ------------------------ | ------------------------------------------------------------------------------------- | -------------------- |
| **Lotação**              | Posto ou órgão onde o servidor está em exercício (ex: "Embaixada em Paris", "SERE")   | `assignment`         |
| **Posto**                | Representação diplomática no exterior (embaixada, consulado) ou a SERE em Brasília    | `assignment`         |
| **Padrão / Classe**      | Nível na carreira: Classe A → B → C → Especial, cada uma com 5 padrões                | `classPattern`       |
| **Situação associativa** | Status do associado na ASOF: `ativo`, `inativo`                                       | `associationStatus`  |
| **Situação funcional**   | Status no serviço público: `ativo`, `aposentado`, `cedido`, `em_licenca`              | `functionalStatus`   |
| **SIAPE**                | Número de matrícula do servidor federal                                               | `siape`              |
| **Contribuição**         | Status de pagamento da anuidade ASOF: `em_dia`, `inadimplente`, `pendente_migracao`   | `contributionStatus` |
| **Mensalidade**          | Registro mensal de pagamento de associado                                             | `monthly_payments`   |
| **Ofício**               | Documento oficial gerado pelo sistema                                                 | `oficios`            |
| **Método de pagamento**  | Forma de quitação da mensalidade: `folha`, `boleto`, `pix`, `transferencia`, `outros` | `paymentMethod`      |
| **Status de pagamento**  | Situação da mensalidade: `pago`, `pendente`, `atrasado`, `isento`, `cancelado`        | `paymentStatus`      |

## Roles do sistema

| Role DB      | Quem é                                                     |
| ------------ | ---------------------------------------------------------- |
| `admin`      | Coordenador administrativo da ASOF (equipe interna)        |
| `diretoria`  | Membros da Diretoria Executiva (presidente, VP, diretores) |
| `secretaria` | Auxiliar administrativo / secretaria                       |

## Contexto geográfico

Associados servem na SERE (Brasília) ou em ~220 postos no exterior. Cerca de 63% estão no exterior. O campo `locationCountry` / `locationCity` indica onde o servidor está lotado. Remoções ocorrem a cada 2–5 anos.

## Dados sensíveis

CPF, SIAPE, email, endereço e dados funcionais são informações protegidas pela LGPD. Não expor em logs, respostas de API públicas ou mensagens de erro.

Em auditorias de segurança, documentar falsos positivos relevantes para evitar redescoberta em rodadas futuras.

Os campos `assigneeName`/`associateName` em `BoardActivity` são fallbacks de renderização otimista (usados antes de o mapa `peopleById` ser atualizado); não são a fonte canônica de nomes. O mapa `peopleById` é autoritativo. Não remover esses campos sob o argumento de desnormalização de PII.

<!-- END:nextjs-agent-rules -->

---

## Convenções de Desenvolvimento

### Tooling

- Use `npm` para este projeto; tem `package-lock.json`.
- Para Python, use `uv`: `uv run`, `uv add`, `uv sync`.
- Use Context7 automaticamente para queries sobre bibliotecas/frameworks/APIs externas. Não confie no conhecimento de treinamento.
- **Validation gates (use exatamente nesta ordem):** `npm run lint` → `npm run typecheck` → `npm run test` → `npm run test:db` → `npm run build`. Os agregadores `validate:quick` (lint+typecheck+test) e `validate:full` (+test:db+build) executam nessa ordem; `pr:check` adiciona `scope:check` e é o melhor gate único antes de abrir PR.
- Rodar um único teste: `npx vitest run src/lib/auth/password.test.ts`. Rodar um spec E2E: `npx playwright test e2e/tests/associados.spec.ts`.

### Banco de dados

- Neon Postgres (`intranet-db`, `ep-empty-cake-ac26vl6w`, sa-east-1).
- Pooled (`DATABASE_URL`) para runtime, direct (`DATABASE_MIGRATION_URL`) para migrations.
- Conexão: `max: 10`, `max_lifetime: 1800`, `statement_timeout: 30000`, `application_name: 'asof-intranet'`.
- Multi-tabela: sempre `db.transaction()`.
- Enums para todos os campos de status/tipo; nunca `text`.
- Indexes: parciais para `WHERE` condicionais, GIN trigram para `LIKE '%term%'`, compostos `(filter, order)`. Prefixo `idx_` nos custom.
- Migrations: nomear com zero-padding + descrição (e.g. `0009_quality_improvements.sql`). Atualizar `meta/_journal.json`.
- Não usar `Record<string, unknown>` em funções de update; usar interfaces tipadas.

### Auth

- Server-side própria: `SESSION_SECRET`, `admins.password_hash`, cookie `httpOnly` assinado.
- `requireAuth()` / `requireRole()` para proteção de rotas.
- Dev local: `SKIP_AUTH=true` + `DEV_USER_ID`, `DEV_USER_ROLE` em `.env.local`. `SKIP_AUTH=true` é **ignorado quando `NODE_ENV=production`**.
- `src/lib/env.ts` exige `SESSION_SECRET` (mín. 32 chars) quando `SKIP_AUTH` não está ativo, e exige `CRON_SECRET` + `ASOF_INTRANET_URL` quando `VERCEL_ENV=production`. Esquecer qualquer um deles quebra o build em produção.

### PII e LGPD

- Usuários autenticados da intranet têm visibilidade operacional integral de PII; não reintroduzir máscara por role sem nova decisão de produto.
- Preferir `encryptPii()` para novas rotas de escrita e `piiBlindIndex()` para busca quando a camada suportar; dados plaintext legados/importados são risco operacional aceito e devem ser tratados com controle de acesso ao Neon, auditoria e backups protegidos.
- `sanitizePii()` para logs — plaintext nunca em logs, erros ou respostas de API.
- Ver ADR 006 para desfiação/anonimização.

### Testing

- Unitários: Vitest, `src/**/*.test.{ts,tsx}`. Suite atual: 824+ testes.
- Integração: `vitest.integration.config.ts` contra PostgreSQL real (banco dedicado, ex: `asof_intranet_test`).
- E2E: Playwright, `http://127.0.0.1:3001` (não 3000), database `asof_test` criado por `e2e/global-setup.ts`.
- `npm run test:db` — schema contract contra PostgreSQL ao vivo (valida tables, columns, enums, indexes, extensions e alinhamento de migrations).
- `npm run test:e2e` nunca contra `http://localhost:3000`; apontar para `3001` com `NEXT_E2E=1` e `.next-e2e` como `distDir`. Gotchas não-triviais (JIT warmup, órfãos EADDRINUSE, hardcoded `associationStatus='ativo'`) estão em `e2e/AGENTS.md` — leia antes de tocar em specs.

### Gotchas

- Next.js `16.2.6` — não fazer downgrade. Verificar `node_modules/next/dist/docs/` antes de mudar APIs.
- `next.config.ts` fixa `turbopack.root` para evitar resolução de Tailwind pelo diretório pai. O padrão é Webpack; Turbopack é modo de diagnóstico explícito (problema de resolução de Tailwind reproduzido em máquinas com 8 GB RAM).
- Dev server pesado em 8 GB RAM: usar `scripts/run-dev-60s.sh` para diagnósticos de freeze.
- Após mudanças em dependências, Next ou Tailwind: rodar `lint` + `typecheck` + `test` + `build`.
- Migrations PostgreSQL em `drizzle/postgres/` são transacionais; `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY` **não** entram em `npm run db:migrate` — executar via `psql "$DATABASE_MIGRATION_URL"` em janela controlada (ver `docs/runbook.md`).
- Não apontar E2E/Playwright para o dev server em 3000; usuários `e2e-*@asof.local` não existem naquele banco e tentativas falhadas acumulam em `login_attempts` até gerar `?error=rate-limit`. Se isso acontecer, limpar apenas tentativas E2E: `DELETE FROM login_attempts WHERE email LIKE 'e2e-%@asof.local';`.

### Documentação

| Documento | Conteúdo |
|-----------|----------|
| `CONTEXT.md` | Glossário e regras de negócio |
| `README.md` | Quick start |
| `TODO-PROD.md` | Checklist de go-live |
| `docs/runbook.md` | Runbook operacional |
| `docs/adr/` | ADRs 001-012 |
| `API.md` | Superfície HTTP pública |
| `PAGES.md` | Páginas e funcionalidades |
| `ARCHITECTURE.md` | Diagrama, deployment, glossário |
| `DESIGN.md` | Design system |
| `CONTRIBUTING.md` | Convenções de contribuição |
