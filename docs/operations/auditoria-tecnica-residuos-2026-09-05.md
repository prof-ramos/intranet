# Auditoria técnica de resíduos — ASOF Intranet

**Data:** 2026-09-05  
**Commit analisado:** `dda8e2b` (`main`)  
**Escopo:** somente investigação e diagnóstico (nenhuma alteração de código, dependências, configuração ou limpeza)  
**Fonte primária:** implementação atual (`src/`, `package.json`, `vercel.json`, workflows, schema Drizzle), confrontada com documentação

---

## 1. Resumo executivo

O repositório é uma aplicação **Next.js App Router 16.2.12** (não 16.2.6 como vários docs ainda afirmam) com auth cookie própria, Drizzle + PostgreSQL/`postgres`, deploy **Vercel** + Neon, e um conjunto maduro de módulos de domínio (oficiais, atividades, jurídico, ofícios/Assinafy, integrações M2M, LGPD, email-triage, financeiro).

O acúmulo técnico não é caos generalizado: a maior parte do “estranho” é **legado consciente** (ADR 008 Documentos fora do dia 1, V2 #429 ocultando Financeiro/Email-triage, spike de storage ADR 020, ledgers de planos). Os resíduos mais úteis de limpeza estão em:

1. **Cluster de notificações inconsistente** — backend persiste em PostgreSQL; UI do sino (`NotificationBell` + polling) não está montada; Novu é só cliente React sem produtor server-side.
2. **Documentação desatualizada/contraditória** — versões Next, deps fantasma (`jose`/`argon2`/`@neondatabase/serverless`), caminhos inexistentes (`secretaria/documentos`), ARCHITECTURE vs layout real.
3. **Componentes/scripts órfãos pontuais** — `EmptyState`, benches Vitest não configurados, path absoluto macOS em script manual.
4. **Infra experimental isolada** — `Dockerfile` standalone sem uso em CI/Vercel; `@aws-sdk/*` só no spike; schema `documents` / `test_*` sem produtores de produto.

### Quantidade de achados por classificação

| Classe | Significado                       | Qtde |
| ------ | --------------------------------- | ---- |
| A      | Remoção segura                    | 6    |
| B      | Provavelmente removível           | 8    |
| C      | Precisa de investigação adicional | 7    |
| D      | Deve permanecer                   | 12   |
| E      | Documentação inconsistente        | 14   |
| F      | Consolidação/refatoração          | 6    |

### Áreas com maior potencial de limpeza

- UI/código morto de notificações in-app + decisão Novu (completar ou remover).
- Docs de stack/versão/arquitetura (alto valor, risco quase nulo).
- Artefatos de auditoria/HTML/arquivos de plano já arquivados.
- Spike S3 **após** encerrar ADR 020 (não antes).

### Riscos mais relevantes

- Remover `notifications` / eventos pensando que Novu os substitui — **falso**: Novu não recebe eventos deste app.
- Dropar tabelas `documents` / `test_runs` sem migration e decisão de produto — risco de schema/prod.
- Remover Financeiro/Email-triage por “não aparecer no menu” — são V2 intencional (#429).
- Remover `@aws-sdk/*` enquanto o spike ADR 020 estiver aberto.

---

## 2. Arquitetura atual identificada

### Aplicação

- **Runtime:** Next.js `16.2.12` (`package.json`), React 19, TypeScript ~6.0.3, Tailwind 4 + DaisyUI 5.
- **Entrypoints:** `src/app/` (App Router). Público: `/`, `/login`, `/forgot-password`, `/reset-password`, `/change-password`. Autenticado: `/app/*` via `src/proxy.ts` + `requireAuth()` / `requireRole()`.
- **UI autenticada:** sidebar (`Sidebar.tsx`) + header com busca global e inbox Novu opcional (`NotificationInboxWrapper`).
- **Bundler:** Webpack por padrão (`npm run dev` / `build`); Turbopack só diagnóstico.

### Módulos de domínio (código vivo)

| Área                     | Rotas / lib                                            | Nota operacional                                                             |
| ------------------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Oficiais (associados)    | `/app/associados`, `src/lib/associates`                | Módulo principal                                                             |
| Atividades               | `/app/atividades`, `src/lib/activities`                | Kanban + `@hello-pangea/dnd`                                                 |
| Jurídico                 | `/app/juridico`, `src/lib/juridico`                    | SLA + cron                                                                   |
| Secretaria / ofícios     | `/app/secretaria/oficios`, `src/lib/oficios`, Assinafy | PDF `pdf-lib` + TipTap                                                       |
| Mala direta / e-mails IA | `/app/secretaria/mala-direta`, `emails/gerar`          | Gemini                                                                       |
| Etiquetas                | `/app/etiquetas`                                       | **Fora do sidebar**; URL direta                                              |
| Financeiro               | `/app/financeiro/*`, `src/lib/finance`                 | **UI redireciona para `/app` (V2 #429)**                                     |
| Email triage             | `/app/email-triage`, `src/lib/email-triage`            | **UI redireciona (V2 #429)**; crons ativos                                   |
| Config                   | `/app/config/*`                                        | Usuários, lotações, auditoria, webhooks, API keys; página IA sem card no hub |
| Privacidade / busca      | `/app/privacidade`, `/app/search`                      | Ativos                                                                       |
| Notificações             | `src/lib/notifications` + actions                      | Persistência ativa; UI sino morta                                            |

### Backend / dados

- **ORM:** Drizzle (`src/lib/db/`, `src/lib/db/schema/*`).
- **Driver:** `postgres` (não `@neondatabase/serverless`).
- **Migrations:** `drizzle/postgres/` (até `0034_*.sql`) + `scripts/guarded-migrate.ts`.
- **Cache:** `unstable_cache` via `src/lib/cache/with-cache.ts` (Next), não Redis.
- **Auth:** HMAC-SHA256 cookie (`src/lib/auth/session.ts` + `bcryptjs`); sem `jose`/`argon2`.

### APIs, cron, integrações

- **HTTP:** `/api/v1/*` (events, health, email-triage, crons), `/api/webhooks/assinafy`, downloads administrativos.
- **Crons Vercel (`vercel.json`):** 7 jobs — events/dispatch, jurídico/sla-warnings, lgpd-retention, email-triage/process, overdue-payments, gmail-watch, cleanup-nonces.
- **Integrações:** Assinafy, Mailjet, Gmail, Gemini (`@google/genai`), M2M dual (env + `integration_api_keys`), WebMCP (`webmcp-types`).
- **Filas:** outbox de eventos de domínio (ADR 018), não broker externo (Redis/SQS).

### Deploy / CI / tooling

- **Produção:** Vercel (`vercel.json`); domínio documentado `intranet.asof.com.br`.
- **CI:** `.github/workflows/ci.yml` + migrate prod/staging, cleanup Neon/smoke, reconcile identities, issue-triage-shadow (runner self-hosted externo).
- **Docker:** `Dockerfile` multi-stage com `output: 'standalone'` em `next.config.ts` — **não referenciado** por workflows nem deploy Vercel.
- **Sem** `docker-compose`, Redis, MinIO/Garage em runtime, Supabase/Clerk/Auth0 no código.
- **Hooks:** Husky pre-commit (lint-staged + typecheck) e pre-push (`validate:quick`).
- **Cloud agent:** `.cursor/environment.json` + install/start/postgres scripts.

---

## 3. Achados

Legenda de confiança: **Muito alta** / **Alta** / **Média** / **Baixa**.

### A — Remoção segura

| ID  | Cat. | Caminho                                                                                      | Tipo             | Descrição                                          | Evidências                                                                                                                                       | Função original               | Uso atual                   | Recomendação                                                                    | Risco           | Impacto        | Deps                    | Confiança  |
| --- | ---- | -------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------- | --------------------------- | ------------------------------------------------------------------------------- | --------------- | -------------- | ----------------------- | ---------- | ---------- |
| A1  | A    | `src/components/EmptyState.tsx`                                                              | Código morto     | Componente sem importadores                        | `rg EmptyState` só encontra o próprio arquivo + menção em `CONTRIBUTING.md`                                                                      | Estado vazio reutilizável     | Nenhum                      | Remover arquivo e linha em CONTRIBUTING                                         | Muito baixo     | Menos ruído    | —                       | Muito alta |
| A2  | A    | `src/hooks/notifications-normalize.bench.ts`, `src/app/app/config/auditoria/format.bench.ts` | Microbench órfão | Arquivos `bench()` não entram no Vitest            | `vitest.config.ts` `include` só `*.test.{ts,tsx}`; sem config de benchmark                                                                       | Perf local                    | Não executados pela suite   | Remover ou mover para doc/script explícito                                      | Muito baixo     | Nenhum em CI   | vitest                  | Alta       |
| A3  | A    | Trecho path em `scripts/manual/generate-sample-pdf.ts`                                       | Script quebrado  | `outPath` absoluto de máquina pessoal              | Linha com `/Users/gabrielramos/.gemini/antigravity-cli/...`                                                                                      | Gerar PDF amostra             | Não roda em outras máquinas | Corrigir para `path.join(process.cwd(), ...)` **ou** remover script se obsoleto | Baixo           | Dev ergonomics | pdf-lib                 | Muito alta |
| A4  | A    | Referência `secretaria/documentos` em docs/AGENTS                                            | Doc fantasma     | Diretório inexistente                              | `ls src/app/app/secretaria/` → só emails/mala-direta/oficios; `ARCHITECTURE.md` lista `secretaria/documentos/error.tsx`                          | Módulo Documentos pré-ADR 008 | Inexistente                 | Apagar referências                                                              | Nulo            | Clareza        | —                       | Muito alta |
| A5  | A    | Claims `jose` / `argon2` / `@neondatabase/serverless` em `src/AGENTS.md`                     | Doc falsa        | Deps listadas sem existir no manifesto nem imports | `package.json` usa `bcryptjs` + `postgres`; session usa `crypto.createHmac`; `rg jose                                                            | argon2` sem uso de app        | Auth/driver antigos         | Nenhum                                                                          | Corrigir AGENTS | Nulo           | Evita onboarding errado | —          | Muito alta |
| A6  | A    | Versão Next “16.2.6” em vários docs                                                          | Doc stale        | Pin real é 16.2.12 (com teste de segurança)        | `package.json`, `scripts/next-security-version.test.ts` exigem `16.2.12`; docs CLAUDE/AGENTS/ARCHITECTURE/README/DEPENDENCIES ainda dizem 16.2.6 | Snapshot antigo               | Desatualizado               | Atualizar docs para 16.2.12                                                     | Nulo            | Alinhamento    | next                    | Muito alta |

### B — Provavelmente removível

| ID  | Cat. | Caminho                                                                                               | Tipo                  | Descrição                                          | Evidências                                                                                                                      | Função original               | Uso atual                                                                    | Recomendação                                                   | Risco          | Impacto                                                 | Deps        | Confiança |
| --- | ---- | ----------------------------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------- | ------------------------------------------------------- | ----------- | --------- |
| B1  | B    | `src/components/NotificationBell.tsx` (+ test)                                                        | UI morta              | Componente nunca importado fora de si              | `rg NotificationBell` só self+test; layout usa só `NotificationInboxWrapper`                                                    | Sino polling in-app           | Nenhum consumidor                                                            | Remover **após** decidir fallback sem Novu                     | Médio          | Remove UI morta; se Novu off, usuários já não veem sino | —           | Alta      |
| B2  | B    | `src/hooks/use-notifications.ts` (+ test, normalize)                                                  | Hook morto (UI)       | Só consumido por NotificationBell                  | Imports só em Bell + testes; audit de perf já marca “sem consumidor ativo” (`docs/development/performance-audit-2026-09-03.md`) | Polling 60s                   | Sem UI                                                                       | Remover com B1 **ou** religar no layout                        | Médio          | Idem B1                                                 | —           | Alta      |
| B3  | B    | Página `/app/notifications` (só `actions.ts`)                                                         | Rota incompleta       | Sem `page.tsx`; actions revalidam path inexistente | `ls src/app/app/notifications/` → só actions                                                                                    | Centro de notificações        | Actions usadas pelo hook morto                                               | Remover actions com B1–B2 **ou** restaurar página              | Médio          | Limpa superfície                                        | —           | Alta      |
| B4  | B    | `@novu/react` + wrappers                                                                              | Integração incompleta | Cliente Inbox sem publisher no repo                | Únicos usos: `NotificationInbox*.tsx`, `next.config` optimizePackageImports; **zero** chamada server Novu API                   | Entrega “tempo real” opcional | Se env não setado → `return null`; se setado → inbox vazio de eventos do app | Remover Novu **ou** implementar bridge a partir de `emitEvent` | Alto (produto) | Bundle / UX                                             | @novu/react | Alta      |
| B5  | B    | `docs/design/archive/asof-email-generator.html`, `docs/operations/archive/email-triage-zoom-out.html` | Artefato HTML         | Protótipos fora do app                             | Só em `docs/*/archive/`                                                                                                         | Spike visual                  | Não linkados ao build                                                        | Arquivar fora do repo ou manter explicitamente como histórico  | Baixo          | Menos peso git                                          | —           | Média     |
| B6  | B    | `docs/agents/padrao_oficio.md` (2487 linhas) vs `docs/design/padrao-oficio.md`                        | Doc duplicada         | Dois manuais de padrão ofício                      | Ambos existem; design é recorte menor                                                                                           | Referência ABNT/redação       | Possível duplicação                                                          | Consolidar em um canônico + link                               | Baixo          | Manutenção docs                                         | —           | Média     |
| B7  | B    | `repomix.config.json`                                                                                 | Tooling opcional      | Config sem script npm                              | Só o arquivo + ignore em `.gitignore`; sem dep no package.json                                                                  | Empacotar repo p/ LLM         | Manual externo                                                               | Remover se ninguém usa Repomix                                 | Muito baixo    | —                                                       | —           | Média     |
| B8  | B    | `.markdownlint.json`                                                                                  | Config sem consumidor | Sem script/CI markdownlint                         | `rg markdownlint` só menção em governação CodeRabbit                                                                            | Lint de Markdown              | Não executado                                                                | Remover ou adicionar script `docs:lint`                        | Muito baixo    | —                                                       | —           | Média     |

### C — Precisa de investigação adicional

| ID  | Cat. | Caminho                                                  | Tipo                   | Descrição                                                                                | Evidências                                                                                     | Por que não fecha                                           | Recomendação                                | Risco | Confiança |
| --- | ---- | -------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------- | ----- | --------- |
| C1  | C    | `/app/etiquetas`                                         | Feature sem nav        | Módulo completo + testes, fora do Sidebar                                                | Páginas/API existem; Sidebar não linka; PAGES.md documenta                                     | Pode ser intencional (URL só staff) ou esquecimento de menu | Confirmar intenção de produto               | Baixo | Média     |
| C2  | C    | `/app/config/integracoes/ia`                             | Página órfã no hub     | Existe, `requireRole(admin)`, `backHref=/app/config`, mas `config/page.tsx` não tem card | Hub só webhooks + api-keys                                                                     | Pode ser acesso só por URL conhecida                        | Ligar no hub **ou** documentar caminho      | Baixo | Alta      |
| C3  | C    | `Dockerfile` + `output: 'standalone'`                    | Infra alternativa      | Build Docker completo; sem compose; sem CI                                               | `rg Dockerfile` em workflows/README ≈ vazio; go-live menciona `/opt/asof-intranet` para backup | Pode ser DR/VPS futuro                                      | Manter até decisão de deploy único Vercel   | Médio | Média     |
| C4  | C    | `issue-triage-shadow.yml`                                | Automação externa      | Depende de runner `tio-abraao-triage` e path `/home/ubuntu/tio-abraao-releases/...`      | Workflow pinado a commit externo                                                               | Fora do repo; não dá para auditar se ainda opera            | Validar com ops se runner vivo              | Ops   | Média     |
| C5  | C    | `advisor-plans/README.md` (~36 KB ledger)                | Ledger histórico       | Planos concluídos removidos; README gigante                                              | `plans/README.md` diz archive fechado; advisor diz ledger                                      | Valor histórico vs ruído                                    | Compactar ledger ou mover para wiki/issue   | Baixo | Média     |
| C6  | C    | Env fallbacks `POSTGRES_PRISMA_URL` etc.                 | Compat provedor        | Ainda no Zod schema                                                                      | `env.ts` + `.env.example` comentados; prod exige DATABASE_URL explícita                        | Podem ainda ser injetados por integração Vercel antiga      | Manter até confirmar ausência em todos envs | Baixo | Média     |
| C7  | C    | `docs/email-controller/evolution-plan.md` item “watch()” | Doc parcialmente stale | Plano lista watch como “próxima fase”, mas cron `gmail-watch` já existe                  | `vercel.json` + `src/app/api/v1/cron/gmail-watch`                                              | Parte do plano pode já ter sido feita                       | Atualizar status do plano                   | Nulo  | Alta      |

### D — Deve permanecer (falsos positivos / legado intencional)

| ID  | Cat. | Item                                                                     | Por que permanece                               | Evidência                                                                                         |
| --- | ---- | ------------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| D1  | D    | Financeiro + Email-triage (código + crons)                               | V2 intencional; UI oculta                       | Layouts `redirect('/app')`; `PRODUCT.md` / ARCHITECTURE citam #429                                |
| D2  | D    | Schema `documents`                                                       | Reservado ADR 008/020; sem UI/storage           | Tabela + contract test; ADR diz fora do dia 1                                                     |
| D3  | D    | `test_runs` / `test_results`                                             | Compat histórica documentada                    | `docs/development/test-metrics.md`                                                                |
| D4  | D    | `scripts/storage-spike.ts` + `@aws-sdk/*`                                | Spike ADR 020 aberto                            | Critérios de encerramento não marcados                                                            |
| D5  | D    | `migrate:legacy` + dumps fora do git                                     | Operação one-shot LGPD                          | Default path `data/asof-prod-dump/...`; pasta não versionada                                      |
| D6  | D    | Scripts GHA (`smoke-residuals`, `clear-duplicate-identity-hashes`, etc.) | Operação produção                               | Workflows dedicados                                                                               |
| D7  | D    | `backup-neon-level1.sh`                                                  | Runbook go-live                                 | `docs/release-1-operational-go-live.md`                                                           |
| D8  | D    | Dual rate-limit (`lib/rate-limit` vs `integrations/rate-limit`)          | Ambos usados                                    | Login/ofícios vs `/api/v1/*`                                                                      |
| D9  | D    | WebMCP + `webmcp-types`                                                  | Feature progressive ADR 021                     | Registry no layout `/app`                                                                         |
| D10 | D    | `@google/genai`, `mailparser`, TipTap, dnd, pdf-lib                      | Uso direto                                      | Imports em ai/, email-triage, oficios, atividades                                                 |
| D11 | D    | `undici` direto                                                          | Webhook transport                               | `integrations/webhooks/transport.ts`                                                              |
| D12 | D    | Backend `src/lib/notifications` + `events.ts`                            | Ainda grava alertas (SLA, ofício, triage, LGPD) | `createNotificationFromEvent` em events/email-triage/privacidade — **não é morto** mesmo sem Bell |

### E — Documentação inconsistente

| ID  | Cat. | Documento                                          | Problema                                                                                                           | Evidência de código                                                  |
| --- | ---- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| E1  | E    | `ARCHITECTURE.md`                                  | Diz Next 16.2.6; descreve notificações via Server Actions/polling; lista error boundary de `secretaria/documentos` | Layout = Novu; sem documentos/; package 16.2.12                      |
| E2  | E    | `CLAUDE.md` / root `AGENTS.md` / `README.md`       | Stack 16.2.6                                                                                                       | package + security test 16.2.12                                      |
| E3  | E    | `DEPENDENCIES.md`                                  | Data 2026-07-18; Next 16.2.6; Vitest 4.1.8; diz “SDKs de tempo real removidos” **e** lista `@novu/react`           | Contraditório; lockfile 16.2.12 / vitest ^4.1.7                      |
| E4  | E    | `DATABASE.md`                                      | Notificações “(polling)”                                                                                           | Polling UI desmontada                                                |
| E5  | E    | `src/app/app/AGENTS.md`                            | Lista `secretaria/documentos/`                                                                                     | Diretório ausente                                                    |
| E6  | E    | `src/components/AGENTS.md` / `src/hooks/AGENTS.md` | Documentam NotificationBell / use-notifications como atuais                                                        | Sem consumidor no layout                                             |
| E7  | E    | ADR 018                                            | Ainda descreve fluxo até `NotificationBell`                                                                        | Layout não monta Bell                                                |
| E8  | E    | `CONTRIBUTING.md`                                  | Lista `EmptyState` como componente compartilhado                                                                   | Sem uso                                                              |
| E9  | E    | `.env.example` vs README                           | Faltam `ASOF_INTEGRATIONS_*` / `ASOF_INTEGRATION_*` no example (presentes no README)                               | `integrations/config.ts` lê essas vars                               |
| E10 | E    | `.env.example`                                     | Não documenta `STORAGE_SPIKE_*` / `R2_POC_*` / `GARAGE_POC_*`                                                      | Só no README do spike (ok se spike isolado; gap se alguém for rodar) |
| E11 | E    | `docs/docs` agent-memory                           | Refere dump local e colunas “faltando” possivelmente stale                                                         | Migrar schema pode já ter avançado; validar antes de confiar         |
| E12 | E    | `docs/AGENTS.md`                                   | Menciona `design/screenshots/`                                                                                     | Diretório não encontrado                                             |
| E13 | E    | CLAUDE “7 cron” vs contagem                        | Alinhado com vercel.json (7) — OK; outros textos podem divergir                                                    | Conferir ao editar                                                   |
| E14 | E    | `PAGES.md` vs Sidebar                              | Documenta etiquetas/financeiro/email-triage; nav real omite/oculta                                                 | Precisa seção “oculto V2 / URL direta”                               |

### F — Consolidação / refatoração

| ID  | Cat. | Tema               | Descrição                                                                    | Recomendação                                                                                           |
| --- | ---- | ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| F1  | F    | Notificações dual  | Persistência PG + Novu client sem ponte                                      | Escolher **uma** arquitetura: (1) Bell+actions, (2) Novu completo, (3) só persistência admin sem inbox |
| F2  | F    | Rate limits dual   | Dois módulos na mesma tabela `rate_limits`                                   | Extrair core compartilhado (opcional)                                                                  |
| F3  | F    | Docs raiz densos   | README, CLAUDE, AGENTS, ARCHITECTURE, CONTEXT, PRODUCT, PAGES, API, DATABASE | Índice canônico + “source of truth” por tema (já parcialmente em `environments.md`)                    |
| F4  | F    | Plan ledgers       | `plans/` + `advisor-plans/`                                                  | Manter um só índice histórico                                                                          |
| F5  | F    | UI form primitives | Componentes `ui/*` quase só em etiquetas                                     | Ou generalizar uso ou aceitar escopo estreito                                                          |
| F6  | F    | Config hub         | “Módulo em preparação” + cards parciais + IA fora                            | Alinhar hub com páginas reais                                                                          |

---

## 4. Clusters de legado

### Cluster N1 — Notificações (maior inconsistência arquitetural)

```
events/emitEvent → notifications (PG) → [NotificationBell/useNotifications] ✗ desmontado
                 ↘ Novu Inbox UI ✓ montada se env  ← sem publisher server-side ✗
```

- Código: `src/lib/events.ts`, `src/lib/notifications/*`, `NotificationBell*`, `NotificationInbox*`, `app/app/notifications/actions.ts`, layout.
- Docs: ADR 007/018, ARCHITECTURE, DATABASE, performance-audit.
- Dep: `@novu/react`.
- Histórico: PR #223 removeu Novu; #224 reverteu (`git log -S NotificationBell -- layout`).
- **Classificação agregada:** F1 + B1–B4 + E1/E4/E6/E7. **Não** classificar o backend de notifications como A.

### Cluster N2 — Documentos / Storage / Papra / Garage / R2

```
ADR 008 (fora dia 1) → schema documents (vazio de produto)
ADR 012 Papra+Garage (POC não executada; ADR 020 diz não reabrir)
ADR 020 spike R2 vs Garage → scripts/storage-spike + @aws-sdk (devDependency)
```

- Sem Docker Compose de Garage/MinIO no repo.
- **Não remover** schema/spike até fechar ADR 020 + decisão de produto.

### Cluster N3 — Auth/plataforma externa abandonada

- Auth atual: cookie HMAC + bcryptjs.
- Docs `src/AGENTS.md` ainda citam jose/argon2/neondatabase — resíduos documentais (A5).
- `guarded-migrate` ainda lista `supabase.co` em domínios de produção conhecidos (cinto de segurança; **D**, não lixo).

### Cluster N4 — Módulos V2 ocultos (#429)

- Financeiro + Email-triage: código, testes, e2e e crons vivos; UI `redirect`.
- **D1** — não tratar como morto.

### Cluster N5 — Test metrics aposentado

- Docs dizem coletor removido; tabelas/schema permanecem.
- **D3** schema; possível limpeza futura só com migration explícita (não “delete file”).

### Cluster N6 — Planos / advisor / HTML archive

- `plans/` fechado; `advisor-plans/` ledger; HTMLs em archive.
- Limpeza documental de baixo risco (B5, C5, F4).

### Cluster N7 — Deploy dual implícito (Vercel vs Docker standalone)

- Produção = Vercel.
- Dockerfile standalone + paths `/opt/asof-intranet` no go-live (backup).
- **C3** — não apagar sem decisão.

---

## 5. Dependências possivelmente removíveis

Análise por uso real (imports/config), não só depcheck.

| Pacote                                                                                                                        | Veredito                              | Evidência                                       | Classe  |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------- | ------- |
| `@novu/react`                                                                                                                 | Removível **só após** decisão produto | Só Inbox client; sem API server                 | B4 / F1 |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`                                                                         | Manter até fechar spike               | Só `scripts/storage-spike*`                     | D4      |
| `@google/genai`                                                                                                               | Manter                                | `src/lib/ai/gemini.ts`, email-triage analyzer   | D       |
| `webmcp-types`                                                                                                                | Manter                                | `src/types/webmcp.d.ts`, lib/webmcp             | D9      |
| `mailparser`                                                                                                                  | Manter                                | `email-triage/address.ts`                       | D       |
| `undici`                                                                                                                      | Manter                                | webhook transport                               | D11     |
| `nodemailer` (override)                                                                                                       | Manter                                | Transitivo de mailparser; override de segurança | D       |
| `@next/bundle-analyzer`                                                                                                       | Manter                                | `next.config.ts` + `ANALYZE`                    | D       |
| `@testing-library/*`, `jsdom`, playwright, vitest, drizzle-kit, eslint, prettier, husky, lint-staged, tsx, tailwind, coverage | Manter                                | Uso óbvio em testes/tooling                     | D       |
| TipTap set, pdf-lib, fontkit, dnd, rhf, zod, daisyui, lucide, bcryptjs, server-only, postgres, drizzle-orm, next, react       | Manter                                | Uso de produto                                  | D       |

**Nenhuma dependência de produção** foi classificada **A** com confiança alta, exceto o caso Novu **condicionado** a decisão de produto.

---

## 6. Infraestrutura e Docker

| Item                                   | Estado                                         | Classe                           |
| -------------------------------------- | ---------------------------------------------- | -------------------------------- |
| `Dockerfile` multi-stage + HEALTHCHECK | Presente; `next.config` `output: 'standalone'` | C3                               |
| `docker-compose*`                      | **Ausente**                                    | —                                |
| Redis / filas / MinIO / Garage runtime | **Ausentes** do código de produção             | D (docs ADR são histórico/spike) |
| Vercel crons                           | 7 paths alinhados a route handlers             | D                                |
| Neon + workflows migrate/cleanup       | Ativos                                         | D                                |
| Self-hosted triage runner              | Externo ao repo                                | C4                               |
| `.cursor/*` postgres provision         | Cloud agent                                    | D                                |

Inconsistência principal: documentação de go-live fala em layout `/opt/asof-intranet` para backup, enquanto o app em si é Vercel — Docker parece suporte operacional/DR, não o path de tráfego atual.

---

## 7. Variáveis de ambiente

### Usadas e documentadas (amostra canônica)

`DATABASE_URL`, `DATABASE_MIGRATION_URL`, `SESSION_SECRET`, `CRON_SECRET`, `ASOF_INTRANET_URL`, `ENCRYPTION_MASTER_KEY`, Mailjet, Gmail, Gemini, Assinafy, SKIP*AUTH/DEV*\*, etc. — alinhadas em `src/lib/env.ts` e `.env.example`.

### Usadas fora de `env.ts` (lidas via `process.env`)

| Var                                                                                                                                     | Onde                     | Doc                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------- |
| `NEXT_PUBLIC_NOVU_*`                                                                                                                    | NotificationInbox\*      | `.env.example` + README                              |
| `NEXT_PUBLIC_APP_URL`                                                                                                                   | `oficios/pdf.ts`         | `.env.example`                                       |
| `WEBMCP_ORIGIN_TRIAL_TOKEN`                                                                                                             | `next.config.ts`         | `.env.example`                                       |
| `ANALYZE`                                                                                                                               | bundle analyzer          | `.env.example`                                       |
| `ASOF_INTEGRATIONS_ENABLED`, `ASOF_INTEGRATION_API_KEY`, `ASOF_INTEGRATION_HMAC_SECRET`, `ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS` | `integrations/config.ts` | README **sim**; `.env.example` **não** (E9)          |
| `ALLOW_PRODUCTION_MIGRATIONS`, `ALLOW_STAGING_MIGRATIONS`, `DATABASE_MIGRATION_ENV`, `DATABASE_STAGING_HOST`                            | `guarded-migrate.ts`     | README/runbook; não no example (aceitável se só ops) |
| `STORAGE_SPIKE_*`, `R2_POC_*`, `GARAGE_POC_*`                                                                                           | storage-spike            | README do spike (E10)                                |
| `DATABASE_BACKUP_URL`                                                                                                                   | backup script            | runbook                                              |
| `NEXT_E2E`                                                                                                                              | next.config / e2e        | docs e2e                                             |

### Fallbacks legados no schema Zod

`DATABASE_POSTGRES_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `DATABASE_URL_UNPOOLED` — compat provedor; produção Vercel exige contrato explícito (C6 / D).

**Nenhum valor de secret foi lido ou reproduzido nesta auditoria.**

---

## 8. Documentação

### Corretos / úteis (manter)

- `CONTEXT.md` (vocabulário domínio)
- `docs/environments.md` + ADR 015 (matriz ambientes)
- ADRs 007–021 como histórico de decisão (mesmo quando parcialmente stale em detalhes de UI)
- `docs/runbook.md`, `TODO-PROD.md`, `PRODUCT.md` (explica V2 #429)
- `docs/development/test-metrics.md` (honesto sobre legado)
- `docs/adr/020-storage-r2-vs-garage-spike.md`

### Parcialmente desatualizados

- `ARCHITECTURE.md`, `DEPENDENCIES.md`, root `AGENTS.md`/`CLAUDE.md`/`README.md` (versão Next; notificações)
- `docs/email-controller/evolution-plan.md` (watch já parcialmente implementado)
- `DATABASE.md` (polling)
- AGENTS em `src/`, `components/`, `hooks/`, `app/app/`

### Contraditórios

- `DEPENDENCIES.md`: “SDKs de tempo real removidos” vs `@novu/react` listado e presente
- ADR 018 / ARCHITECTURE (Bell) vs layout (Novu)

### Redundantes / consolidáveis

- `plans/` vs `advisor-plans/`
- `docs/agents/padrao_oficio.md` vs `docs/design/padrao-oficio.md`
- Sobreposição CLAUDE ↔ AGENTS ↔ ARCHITECTURE (F3)

### Aparentemente obsoletos (conteúdo)

- HTMLs em `docs/**/archive/` (B5)
- Menções a `secretaria/documentos` e `design/screenshots/` inexistentes

---

## 9. Itens que parecem lixo, mas devem permanecer

1. **Financeiro / email-triage** — ocultos, não mortos (D1).
2. **Tabela `documents`** — placeholder de produto futuro (D2); **nunca** dropar dados/schema como “limpeza de código”.
3. **`test_runs`/`test_results`** — compat documentada (D3).
4. **Storage spike + AWS SDK** — ADR 020 aberto (D4).
5. **`migrate-legacy`** — ferramenta operacional com dump externo (D5).
6. **Scripts só em GHA** — não precisam estar no `package.json` (D6).
7. **Dois rate-limits** — consumidores distintos (D8).
8. **WebMCP** — feature real progressive enhancement (D9).
9. **Overrides npm** (`ws`, `nodemailer`, …) — mitigação CVE (D).
10. **Backend de notifications** — ainda escrito por eventos (D12), apesar da UI quebrada/incompleta.
11. **Fallbacks `POSTGRES_*`** — compat Vercel/Neon (C6/D).
12. **Dockerfile** — possível DR/backup path (C3), não “compose abandonado”.

---

## 10. Dúvidas realmente inevitáveis

Só o que **não** se resolve só com o repositório:

1. **Novu: completar ou remover?**  
   O código mostra integração incompleta, mas não diz se há conta Novu/produção já configurada com workflows externos fora deste repo. Sem acesso ao painel Vercel/Novu, não dá para saber se alguém depende do Inbox hoje.

2. **Etiquetas e página de IA sem entrada de menu — intencional?**  
   Tecnicamente funcionam por URL; ausência no Sidebar/hub pode ser UX consciente ou omissão. Precisa intenção de operador/produto.

3. **Dockerfile ainda é requisito operacional?**  
   Go-live menciona `/opt/asof-intranet` para backup; se esse host nunca existiu / foi abandonado, Docker vira residual (B). Se ainda é plano de DR, permanece (D).

4. **Spike R2/Garage: manter aberto?**  
   ADR 020 tem checkboxes abertos; fechar o ADR é decisão de produto/ops, não inferível só do código.

5. **Issue-triage shadow runner ainda existe?**  
   Depende de máquina self-hosted externa não versionada aqui.

---

## 11. Plano de limpeza proposto

Princípios: commits pequenos, reversíveis; nunca dropar tabelas/dados na mesma leva que docs; validar `npm run validate:quick` (e testes do módulo tocado).

### Etapa 0 — Só documentação inequívoca (risco ~0)

- **Escopo:** A4, A5, A6, E2, E5, E8, E12 (caminhos fantasma, versões Next, deps falsas, EmptyState no CONTRIBUTING).
- **Arquivos:** `CLAUDE.md`, `AGENTS.md`, `ARCHITECTURE.md`, `README.md`, `DEPENDENCIES.md`, `src/AGENTS.md`, `src/app/app/AGENTS.md`, `CONTRIBUTING.md`, `docs/AGENTS.md`.
- **Testes:** `npm run docs:check` (se aplicável) + revisão diff.
- **Aceite:** docs citam Next 16.2.12; sem `jose`/`argon2`/`neondatabase`/`secretaria/documentos` fantasma.
- **Rollback:** revert do commit docs.
- **Commit sugerido:** `docs: alinhar versões Next e remover referências fantasma`

### Etapa 1 — Órfãos sem comportamento de produto (risco baixo)

- **Escopo:** A1 EmptyState; A2 benches; A3 path do PDF manual.
- **Testes:** `npm run test` (ou subset) + typecheck.
- **Aceite:** sem imports quebrados; script manual escreve em path portátil se mantido.
- **Commit:** `chore: remover EmptyState e benches órfãos; corrigir path do PDF sample`

### Etapa 2 — Env example gaps (risco baixo)

- **Escopo:** E9 (e opcionalmente E10 como comentários do spike).
- **Arquivos:** `.env.example` (+ talvez README cross-links).
- **Aceite:** vars M2M documentadas no example sem secrets.
- **Commit:** `docs(env): documentar ASOF_INTEGRATIONS_* no .env.example`

### Etapa 3 — Decisão de notificações (risco médio; **bloqueada por §10.1**)

Só depois da dúvida Novu:

- **Opção 3a — Remover Novu, restaurar Bell:** reverter layout para `NotificationBell`; remover `@novu/react` e wrappers; atualizar ADR 018/ARCHITECTURE.
- **Opção 3b — Completar Novu:** publisher server-side a partir de `emitEvent`; aí sim considerar remoção do Bell/actions (B1–B3).
- **Opção 3c — Sem inbox no dia a dia:** remover Novu + Bell; manter só persistência + tela admin futura; documentar.

Em qualquer opção: atualizar E1/E4/E6/E7/F1 no mesmo PR ou PR docs logo em seguida.

- **Testes:** unit notifications + e2e smoke header; bundle sanity.
- **Rollback:** revert; repor env Novu se 3a/3c.

### Etapa 4 — Docs de arquitetura de notificações e V2 (risco baixo)

- **Escopo:** ARCHITECTURE, DATABASE, PAGES, AGENTS components/hooks, ADR 018 emenda, evolution-plan C7.
- **Aceite:** texto descreve layout real + módulos ocultos #429 + etiquetas/IA se C1/C2 decididos.

### Etapa 5 — Dependências pós-decisão

- Remover `@novu/react` somente se 3a ou 3c.
- Remover `@aws-sdk/*` + `storage:spike` **somente** após fechar ADR 020 (issue #423).
- **Testes:** `npm run build`, `npm audit` (sem `--force`).

### Etapa 6 — Clusters documentais / archive (risco baixo)

- B5 HTML archive; B6 consolidar padrão ofício; C5 compactar advisor ledger; F3 índice docs.
- Sem impacto runtime.

### Etapa 7 — Schema legado (risco alto; última)

- Avaliar migration para dropar `test_runs`/`test_results` **só** com aceite explícito.
- `documents`: **não dropar** até ADR de Documentos; no máximo marcar deprecated na docs.
- **Testes:** `npm run test:db` + migrate staging.

### Ordem de commits sugerida

1. docs versão/paths
2. EmptyState + benches + PDF path
3. `.env.example` M2M
4. (após decisão) notificações código
5. (após decisão) docs notificações
6. (após ADR 020) remover spike S3
7. archive/docs consolidation
8. (opcional, tarde) migration test_metrics

---

## Apêndice — Método

- Inventário de rotas (`find src/app`), `package.json`, `vercel.json`, workflows, scripts, schema.
- Buscas `rg` por deps suspeitas (Novu, GenAI, AWS, webmcp, mailparser, undici, supabase, redis, etc.).
- Confrontação layout vs ADRs vs ARCHITECTURE.
- `git log` / `-S` em NotificationBell e EmptyState.
- Leitura de ADRs 007, 008, 012, 018, 020, 021 e `PRODUCT.md`.
- Nenhuma execução de limpeza; nenhum secret impresso.

---

_Fim da auditoria. Aguardando instrução explícita para iniciar qualquer etapa de limpeza._
