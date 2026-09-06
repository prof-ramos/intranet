<!-- Generated: 2026-05-26 | Updated: 2026-07-16 -->
<!-- Parent: none (root) -->

# ASOF Intranet — AI Agent Directory

## Purpose

Next.js 16 App Router application for ASOF (associação) internal management — associates, activities (kanban), juridico/consultas, financeiro/mensalidades, oficios, notifications, audit, LGPD compliance. Drizzle ORM + Neon Postgres, Playwright e2e, Vitest unit+integration, Server Actions, self-hosted auth with cookie sessions.

## Key Files

| File                           | Description                                                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md`                    | Project instructions for AI agents (read FIRST)                                                                       |
| `AGENTS.md`                    | This file — AI agent directory navigation                                                                             |
| `CONTEXT.md`                   | Glossary, domain rules, institutional context                                                                         |
| `docs/environments.md`         | Official environment/database/data/migration matrix                                                                   |
| `TODO-PROD.md`                 | Go-live checklist and production readiness                                                                            |
| `package.json`                 | Dependencies and scripts (dev, build, test, e2e, typecheck, lint, migrate, validate)                                  |
| `next.config.ts`               | Next.js 16 config — security headers, E2E `distDir` swap, fixed `turbopack.root`                                      |
| `src/lib/env.ts`               | Zod-validated env; **throws on startup** if required vars are missing (blocks build)                                  |
| `src/proxy.ts`                 | Route guard (Next.js 16 `proxy.ts`); redirects to `/login` for `/app/*` and `/change-password` when no session cookie |
| `drizzle.config.ts`            | Drizzle Kit — rejects transaction-mode pooler URLs (port 6543); use `DATABASE_MIGRATION_URL`                          |
| `playwright.config.ts`         | baseURL `http://localhost:3001`, `expect.timeout: 15_000`, workers=1, retries 2 in CI                                 |
| `vitest.config.ts`             | Unit config — `src/**/*.test.{ts,tsx}` + `scripts/**/*.test.ts`; mocks `server-only`                                  |
| `vitest.integration.config.ts` | Integration config — `src/**/*.integration.test.{ts,tsx}`                                                             |
| `vercel.json`                  | Vercel deployment + cron schedules (7 cron jobs)                                                                      |

## Subdirectories

| Directory  | Purpose                                                                  |
| ---------- | ------------------------------------------------------------------------ |
| `src/`     | Application source (pages, components, lib, hooks) — see `src/AGENTS.md` |
| `docs/`    | ADRs, design docs, runbooks, compliance — see `docs/AGENTS.md`           |
| `scripts/` | DB scripts, seed, migrations, PII encryption — see `scripts/AGENTS.md`   |
| `e2e/`     | Playwright end-to-end tests — see `e2e/AGENTS.md`                        |
| `drizzle/` | SQL migrations and schema snapshots — see `drizzle/AGENTS.md`            |
| `.github/` | CI/CD workflows, branch rules, PR template — see `.github/AGENTS.md`     |

---

<!-- BEGIN:nextjs-agent-rules -->

# Contexto Institucional

A ASOF (Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro) é uma associação civil sem fins lucrativos fundada em 1991, com ~763 associados. Representa a carreira de Oficial de Chancelaria do Ministério das Relações Exteriores (Itamaraty/MRE) — servidores de nível superior responsáveis pela gestão administrativa da política externa brasileira.

## Vocabulário do domínio → campos do banco

| Termo                   | Significado                                                                           | Campo DB             |
| ----------------------- | ------------------------------------------------------------------------------------- | -------------------- |
| **Lotação**             | Posto ou órgão onde o servidor está em exercício (ex: "Embaixada em Paris", "SERE")   | `assignment`         |
| **Posto**               | Representação diplomática no exterior (embaixada, consulado) ou a SERE em Brasília    | `assignment`         |
| **Padrão / Classe**     | Nível na carreira: Classe A → B → C → Especial, cada uma com 5 padrões                | `classPattern`       |
| **Vínculo ASOF**        | Vínculo associativo do oficial: `associado`, `nao_associado`                          | `associationStatus`  |
| **Situação funcional**  | Status no serviço público: `ativo`, `aposentado`, `cedido`, `em_licenca`              | `functionalStatus`   |
| **SIAPE**               | Número de matrícula do servidor federal                                               | `siape`              |
| **Contribuição**        | Status derivado de pagamento da anuidade ASOF: `em_dia`, `inadimplente`               | `contributionStatus` |
| **Mensalidade**         | Registro mensal de pagamento de associado                                             | `monthly_payments`   |
| **Ofício**              | Documento oficial gerado pelo sistema                                                 | `oficios`            |
| **Método de pagamento** | Forma de quitação da mensalidade: `folha`, `boleto`, `pix`, `transferencia`, `outros` | `paymentMethod`      |
| **Status de pagamento** | Situação da mensalidade: `pago`, `pendente`, `atrasado`, `isento`, `cancelado`        | `paymentStatus`      |

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
- Para GitHub CLI, `gh` está autorizado por default.
- Sempre que possível, utilizar subagentes com o modelo Luna em esforço de raciocínio XHIGH (`gpt-5.6-luna`, `reasoning_effort=xhigh`) para subtarefas independentes.
- Para Git, comandos que alteram o repositório (commit, push, branch -d, merge, reset) requerem aprovação explícita.
- Use Context7 automaticamente para queries sobre bibliotecas/frameworks/APIs externas. Não confie no conhecimento de treinamento.
- **Validation gates (use exatamente nesta ordem):** `npm run lint` → `npm run typecheck` → `npm run test` → `npm run test:db` → `npm run build`. Os agregadores `validate:quick` (lint+typecheck+test) e `validate:full` (+test:db+build) executam nessa ordem; `pr:check` adiciona `scope:check` e é o melhor gate único antes de abrir PR.
- Rodar um único teste: `npx vitest run src/lib/auth/password.test.ts`. Rodar um spec E2E: `npx playwright test e2e/tests/associados.spec.ts`.

### Governança do Jules

- Jules deve propor um plano e aguardar aprovação humana explícita antes de alterar arquivos. Uma sugestão automática não conta como aprovação.
- Não publicar branch ou pull request automaticamente. O resultado deve permanecer na sessão até uma pessoa revisar o plano e o diff e pedir a publicação.
- Quando houver publicação autorizada, abrir o PR como **draft**, manter Jules identificado como autor/coautor e usar branch com prefixo `jules-`.
- Antes de iniciar, consultar `main` e os PRs abertos. Se a mudança já existir, for falso positivo ou duplicar outro trabalho, registrar a conclusão na sessão e encerrar sem criar branch/PR.
- Uma sessão por problema e uma branch por PR. Não abrir sessões paralelas que modifiquem os mesmos arquivos.
- Só reagir a comentários de PR que mencionem explicitamente `@jules`.
- Manter `Suggestions` e `CI Fixer` desativados; nenhuma análise proativa ou correção automática de CI está autorizada neste repositório.
- Nunca fazer merge, rebase, force-push, exclusão de branch, alteração de proteção do GitHub, migração/SQL de produção, deploy ou edição de segredos/variáveis de ambiente.
- Antes de oferecer publicação, executar `npm run validate:quick` e `npm run pr:check`. Se um gate não puder ser executado, informar exatamente qual e por quê.
- O procedimento de operação, auditoria e resposta a incidentes está em `docs/agents/jules-governance.md`.

### Governança do CodeRabbit

- O CodeRabbit atua como revisor: Autofix, geração de testes/docstrings e simplificação permanecem desativados. Nunca acione resolução automática de conflitos, pois esse recurso ainda pode criar merge commit e não possui toggle no schema YAML atual. Implementações continuam sujeitas à revisão humana e aos gates do repositório.
- Revisões de PR são opt-in pelo label `review-ready`. Drafts e PRs com `do-not-review` não devem consumir a cota OSS; remova `review-ready` ou use `@coderabbitai pause` durante rajadas de commits.
- PRs do Jules só recebem `review-ready` depois de plano, diff e gates locais serem aprovados por uma pessoa. O label `agent:jules` identifica autoria; `ai-slop` é apenas sinal de triagem, nunca motivo automático para fechar ou descartar.
- Em comentários, mencione explicitamente `@coderabbitai`; respostas automáticas estão desativadas. Como `prof-ramos/intranet` pertence a uma conta pessoal, `allow_non_org_members: false` não é uma barreira universal: trate menções externas como entrada não confiável e aprove ou rejeite novos learnings no painel.
- Cada comentário acionável deve ser implementado ou rejeitado com justificativa técnica. Não use resolução em massa antes de verificar cada thread no commit atual.
- O status do CodeRabbit é evidência adicional, não o único gate obrigatório: a cota OSS é adaptativa. CI obrigatório e resolução de conversas continuam protegendo `main`.
- A configuração versionada está em `.coderabbit.yaml`; operação, limites e resposta a ruído estão em `docs/agents/coderabbit-governance.md`.

### Banco de dados

- Neon Postgres (`intranet-db`, `ep-empty-cake-ac26vl6w`, sa-east-1).
- A matriz oficial de ambientes/bancos/dados é `docs/environments.md`; se outro documento divergir, corrija o outro documento.
- Pooled (`DATABASE_URL`) para runtime, direct (`DATABASE_MIGRATION_URL`) para migrations.
- Dev diário padrão: Postgres local `asof_intranet` com seed sintético.
- Dados reais em `vercel-dev` ou clone local são exceção LGPD restrita, não onboarding padrão.
- Conexão: `max: 10`, `max_lifetime: 1800`, `statement_timeout: 30000`, `application_name: 'asof-intranet'`.
- Multi-tabela: sempre `db.transaction()`.
- Enums para todos os campos de status/tipo; nunca `text`.
- Indexes: parciais para `WHERE` condicionais, GIN trigram para `LIKE '%term%'`, compostos `(filter, order)`. Prefixo `idx_` nos custom.
- Migrations: nomear com zero-padding + descrição (e.g. `0009_quality_improvements.sql`). Atualizar `meta/_journal.json`.
- Não usar `Record<string, unknown>` em funções de update; usar interfaces tipadas.
- Para referência completa de tabelas, enums, índices e migrações, veja [`DATABASE.md`](./DATABASE.md).

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

- Unitários: Vitest, `src/**/*.test.{ts,tsx}`. Suite atual: 1879 testes.
- Integração: `vitest.integration.config.ts` contra PostgreSQL real (banco dedicado, ex: `asof_intranet_test`). Dev local padrão usa `asof_intranet`; clones com PII real são exceção restrita conforme `docs/environments.md`.
- E2E: Playwright, `http://127.0.0.1:3001` (não 3000), database `asof_test` criado por `e2e/global-setup.ts`.
- `npm run test:db` — schema contract contra PostgreSQL ao vivo (valida tables, columns, enums, indexes, extensions e alinhamento de migrations). **Importante:** ao mudar qualquer schema Drizzle ou migração SQL, atualizar também `src/lib/db/schema.integration.test.ts` (expectedColumns, expectedEnums, expectedIndexes). Enums do banco usam valores em português (ex: `activity_priority: ['baixa', 'normal', 'alta', 'urgente']`), nunca assumir valores em inglês.
- `npm run test:e2e` nunca contra `http://localhost:3000`; apontar para `3001` com `NEXT_E2E=1` e `.next-e2e` como `distDir`. Gotchas não-triviais (JIT warmup, órfãos EADDRINUSE, filtros de vínculo ASOF) estão em `e2e/AGENTS.md` — leia antes de tocar em specs.

### Gotchas

- Next.js 16 — não fazer downgrade. Verificar `node_modules/next/dist/docs/` antes de mudar APIs. Versão exata em `package.json`.
- `next.config.ts` fixa `turbopack.root` para evitar resolução de Tailwind pelo diretório pai. O padrão é Webpack; Turbopack é modo de diagnóstico explícito (problema de resolução de Tailwind reproduzido em máquinas com 8 GB RAM).
- Dev server pesado em 8 GB RAM: usar `scripts/run-dev-60s.sh` para diagnósticos de freeze.
- Após mudanças em dependências, Next ou Tailwind: rodar `lint` + `typecheck` + `test` + `build`.
- Migrations PostgreSQL em `drizzle/postgres/` são transacionais; `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY` e `ALTER TYPE ... ADD VALUE` **não** entram em `npm run db:migrate` — executar via `psql "$DATABASE_MIGRATION_URL"` em janela controlada (ver `docs/runbook.md`) e inserir o hash da migração manualmente em `drizzle.__drizzle_migrations`.
- Não apontar E2E/Playwright para o dev server em 3000; usuários `e2e-*@asof.local` não existem naquele banco e tentativas falhadas acumulam em `login_attempts` até gerar `?error=rate-limit`. Se isso acontecer, limpar apenas tentativas E2E: `DELETE FROM login_attempts WHERE email LIKE 'e2e-%@asof.local';`.

### Documentação

| Documento         | Conteúdo                        |
| ----------------- | ------------------------------- |
| `CONTEXT.md`      | Glossário e regras de negócio   |
| `README.md`       | Quick start                     |
| `TODO-PROD.md`    | Checklist de go-live            |
| `docs/runbook.md` | Runbook operacional             |
| `docs/adr/`       | ADRs                            |
| `API.md`          | Superfície HTTP pública         |
| `PAGES.md`        | Páginas e funcionalidades       |
| `ARCHITECTURE.md` | Diagrama, deployment, glossário |
| `DESIGN.md`       | Design system                   |
| `CONTRIBUTING.md` | Convenções de contribuição      |
