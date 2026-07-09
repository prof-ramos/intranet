# Relatório Técnico de Auditoria do Projeto

| Campo                 | Valor                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Projeto**           | ASOF Intranet                                                                                         |
| **Repositório**       | `intranet` (ASOF)                                                                                     |
| **Commit analisado**  | `90f636e` (`main`)                                                                                    |
| **Data da auditoria** | 2026-07-09                                                                                            |
| **Tipo**              | Auditoria estrutural ponta a ponta (arquitetura, funcionalidades, DB, segurança, qualidade, operação) |
| **Modo**              | Somente leitura — nenhuma alteração de código/dados de produção                                       |

---

## 1. Sumário Executivo

### Finalidade identificada

A **Intranet ASOF** é o sistema interno da Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro. Resolve o problema operacional de manter, em um único ambiente autenticado:

- o **Cadastro de Oficiais de Chancelaria** (associados e não associados à ASOF);
- o **vínculo associativo** e a **contribuição** (mensalidades);
- o **trabalho administrativo** (atividades/kanban, ofícios, etiquetas, e-mails institucionais com IA);
- o **jurídico** (consultas com SLA e notas);
- a **triagem de e-mails** (Gmail/IA);
- a **governança** (auditoria, usuários internos, integrações M2M, privacidade LGPD).

### Público-alvo

Usuários internos com roles `admin`, `diretoria` e `secretaria` — não há portal do associado no dia 1.

### Maturidade geral

**Alta para um sistema de associação de porte médio em pré-go-live / go-live recente.**

Evidências de maturidade:

- Stack moderna e coerente (Next.js 16.2.6 App Router, React 19, Drizzle, Neon Postgres).
- Domínio modelado com enums em português e glossário formal (`CONTEXT.md`, `Agents.md`).
- ~19 ADRs, matriz de ambientes (`docs/environments.md` / ADR 015), runbook, `TODO-PROD.md` majoritariamente verde.
- Suite ampla: unitários (1500+), contract DB, integration DML, E2E Playwright (10 specs), smoke prod serial (10 testes, ADR 009).
- Padrões de segurança conscientes: cookie de sessão `httpOnly`, rate limits, criptografia PII (ciphertext + blind index), crons com `CRON_SECRET`, integrações com anti-replay.
- Gates de validação documentados (`lint` → `typecheck` → `test` → `test:db` → `build`).

### Principais riscos

| #   | Risco                                                                                                                              | Severidade               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | Arquivo local `.env.local.prod.bak` com credenciais de ambiente sensível (risco de vazamento operacional se copiado/compartilhado) | **P0 operacional local** |
| 2   | Deploy Vercel ≠ migration Neon (app sobe com schema atrasado; já gerou falhas de smoke/classe `leave_date`)                        | **P0 operacional**       |
| 3   | Neon Free Tier: PITR limitado a **6h** (não atende expectativa típica de 24h de rollback)                                          | **P1**                   |
| 4   | Rate-limit de password-reset **fail-open** em erro de DB                                                                           | **P1 segurança**         |
| 5   | Dualidade PII plaintext legado + ciphertext (superfície e custo de conformidade)                                                   | **P1 LGPD**              |
| 6   | Schema de `documents` / `legal_processes` / `legal_opinions` sem UI completa de produto                                            | **P2 produto**           |
| 7   | `npm audit`: 9 vulns (0 critical, 2 high transitivas)                                                                              | **P2**                   |
| 8   | CSP com `'unsafe-inline'` e `'unsafe-eval'`; ausência de HSTS explícito no `next.config.ts`                                        | **P2**                   |

### Principais gargalos

1. **Operação de schema em produção** depende de disciplina humana (migrate manual + smoke).
2. **Camada de aplicação mista**: Server Actions finas + services em `src/lib/*`, mas algumas páginas ainda concentram query/UI.
3. **Módulos de schema à frente da UI** (documentos, processos jurídicos) geram expectativa falsa se lidos só pelo schema.
4. **Staging como ambiente de ensaio** está previsto na matriz, mas não é caminho diário obrigatório.

### Recomendação geral para a equipe

1. Tratar o sistema como **pronto para operação controlada**, não como MVP incompleto.
2. Priorizar **higiene de secrets locais**, **runbook de deploy+migrate** e **hardening de auth edge cases**.
3. Não abrir frentes grandes (DMS/documentos, portal do associado, RLS) sem decisão de produto — ADRs 008/012/001 já delimitam isso.
4. Usar este relatório como backlog técnico priorizado; issues de planning recentes (#248/#255/#257/#258/#264) já foram absorvidas pela software factory (`90f636e`).

---

## 2. Escopo da Análise

### O que foi analisado

| Área                               | Fontes                                                                                                                                                                                   |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentação de domínio e operação | `README.md`, `Claude.md`, `Agents.md`, `CONTEXT.md`, `TODO-PROD.md`, `docs/environments.md`, `docs/runbook.md`, `docs/adr/*` (001–019), `docs/AUDITORIA-2026-06-08.md`, `docs/factory/*` |
| Configuração                       | `package.json`, `next.config.ts`, `vercel.json`, `drizzle.config.ts`, `vitest*.config.ts`, `playwright.config.ts`, `.env.example`, `.gitignore`, `.github/workflows/ci.yml`              |
| App Router / UI                    | `src/app/**` (34 `page.tsx`, 14 `route.ts`), layouts, Server Actions                                                                                                                     |
| Domínio e infra                    | `src/lib/**` (auth, crypto, associates, finance, juridico, oficios, assinafy, integrations, events, cron, etc.)                                                                          |
| Schema e migrations                | `src/lib/db/schema/*` (26 módulos TS), `drizzle/postgres/` (31 SQLs, 0000–0030)                                                                                                          |
| Testes                             | unit, integration, e2e, smoke-prod                                                                                                                                                       |
| Scripts                            | `scripts/*` (seed, migrate guarded, backup, safety)                                                                                                                                      |
| Segurança                          | headers, auth, rate-limit, PII, secrets locais (apenas metadados de arquivos, **sem leitura de valores**), `npm audit`                                                                   |

### Comandos executados (somente leitura / inspeção)

- `git log` / `git rev-parse` — HEAD e histórico recente
- `find` / `ls` / `rg` — mapa de rotas, schemas, TODOs, FKs, roles
- `npm audit --json` — inventário de vulnerabilidades
- Inspeção estrutural de arquivos-chave (`password-reset.ts`, `associates.ts`, `next.config.ts`, CI, TODO-PROD)

### Limitações (o que **não** pôde ser verificado nesta rodada)

| Item                                      | Motivo                                                                                 |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| Conteúdo de secrets em `.env*`            | Proibido expor; apenas existência/permissões de arquivos                               |
| Conexão direta ao Neon produção           | Evitada deliberadamente (sem DML/consulta destrutiva)                                  |
| Coverage percentual exato atual           | Thresholds lidos no config; `npm run test:coverage` não reexecutado nesta consolidação |
| Pen-test dinâmico / DAST                  | Fora de escopo estático                                                                |
| Smoke live em `intranet.asof.com.br`      | Não reexecutado nesta auditoria (evidência histórica: 10/10 em janelas documentadas)   |
| Estado exato de branches Neon e PITR live | Documentado em ADRs; confirmação live não feita                                        |
| UI de todos os fluxos no browser          | Inferida por código + E2E/smoke, não dogfood manual completo                           |

### Differenciação metodológica

- **Fato**: observado em arquivo, config ou comando.
- **Inferência**: conclusão razoável a partir de evidências (marcada quando aplicável).
- **Hipótese**: possível, sem prova conclusiva.

---

## 3. Visão Geral do Projeto

### Finalidade do sistema

Centralizar a gestão administrativa da ASOF sobre o universo de Oficiais de Chancelaria (~763 associados no domínio institucional), cobrindo cadastro, vínculo ASOF, financeiro associativo, jurídico, comunicação formal (ofícios) e operação da diretoria/secretaria.

### Stack identificada

| Camada           | Tecnologia                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| Linguagem        | TypeScript                                                                                            |
| Framework web    | Next.js **16.2.6** (App Router), React 19                                                             |
| UI               | Tailwind CSS 4, DaisyUI 5, componentes próprios                                                       |
| ORM              | Drizzle ORM + `postgres` driver                                                                       |
| Banco            | PostgreSQL (Neon sa-east-1, projeto `intranet-db`)                                                    |
| Auth             | Server-side própria: `admins.password_hash` (bcrypt), cookie `httpOnly` assinado com `SESSION_SECRET` |
| Validação        | Zod + `react-hook-form`                                                                               |
| PDF              | `pdf-lib`, `@pdf-lib/fontkit`                                                                         |
| Editor rich text | TipTap                                                                                                |
| E-mail           | Mailjet (templates + reset de senha)                                                                  |
| IA               | `@google/genai` (Gemini) — e-mails institucionais e triage                                            |
| Assinatura       | Assinafy (webhook + status em ofícios) — ADR 013                                                      |
| Deploy           | Vercel (`intranet.asof.com.br`), `output: 'standalone'`                                               |
| Jobs             | 7 Vercel Crons em `vercel.json`                                                                       |
| Testes           | Vitest (unit + integration), Playwright (E2E + smoke prod)                                            |
| Lint/format      | ESLint, Prettier, husky/lint-staged                                                                   |
| Logs             | Logger estruturado com redaction PII (`src/lib/logger.ts`)                                            |

### Arquitetura geral (fatos)

```
Browser (staff)
    │
    ▼
Next.js App Router
  ├─ proxy.ts          → guard cookie de sessão (/app/*, /change-password)
  ├─ Server Components → páginas autenticadas
  ├─ Server Actions    → mutações (muitas via factories defineFormAction / defineServerAction)
  └─ Route Handlers    → API cron, webhooks, downloads, health, events
    │
    ▼
src/lib/* services     → regras de domínio
    │
    ▼
Drizzle + Postgres
  ├─ DATABASE_URL (pooled) runtime
  └─ DATABASE_MIGRATION_URL (direct) migrations
```

### Módulos principais

1. Auth e sessão
2. Cadastro de Oficiais (`/app/associados`)
3. Atividades / kanban
4. Jurídico / consultas
5. Financeiro / mensalidades
6. Secretaria / ofícios + Assinafy
7. Geração de e-mail com IA
8. Etiquetas (PDF)
9. Email triage
10. Configuração (usuários, lotações, auditoria, integrações)
11. Notificações in-app
12. Privacidade LGPD
13. Integrações M2M / domain events / webhooks
14. Crons operacionais

### Dependências relevantes (runtime)

`next`, `react`, `drizzle-orm`, `postgres`, `bcryptjs`, `zod`, `@google/genai`, `pdf-lib`, `mailparser`, `@tiptap/*`, `daisyui`, `server-only`, etc. (`package.json`).

---

## 4. Mapa da Estrutura do Projeto

```
intranet/
├── src/
│   ├── app/                 # App Router
│   │   ├── app/             # Área autenticada (sidebar layout)
│   │   ├── api/             # Crons, health, events, webhooks, downloads
│   │   ├── login|forgot-password|reset-password|change-password/
│   │   └── page.tsx         # landing / redirect
│   ├── components/          # Sidebar, search, notifications, error boundary
│   ├── hooks/
│   ├── lib/                 # Domínio, auth, crypto, db, integrations
│   │   └── db/schema/       # Fonte canônica de schema
│   ├── proxy.ts             # Route guard (Next 16)
│   └── test/
├── drizzle/postgres/        # Migrations SQL 0000–0030
├── e2e/                     # Playwright + smoke-prod
├── scripts/                 # seed, migrate guarded, backup, import
├── docs/                    # ADRs, environments, runbook, factory, compliance
├── .github/workflows/       # ci.yml, migrate-staging.yml
├── vercel.json              # crons
├── TODO-PROD.md             # checklist go-live
├── CONTEXT.md / Claude.md / Agents.md
└── package.json
```

### Função das pastas-chave

| Pasta/Arquivo            | Função                                                        |
| ------------------------ | ------------------------------------------------------------- |
| `src/app/app/*`          | Produto autenticado                                           |
| `src/lib/*/service.ts`   | Regras de negócio por domínio                                 |
| `src/lib/db/schema`      | Modelagem Drizzle (enums + tabelas + índices)                 |
| `src/lib/crypto`         | HKDF, encrypt/decrypt PII, blind index                        |
| `src/lib/server-actions` | Factories de actions (auth, rate-limit, validação)            |
| `src/lib/integrations`   | API keys, rate limit, verify request, nonces                  |
| `drizzle/postgres`       | Histórico migratório aplicado em produção de forma controlada |
| `docs/adr`               | Decisões arquiteturais vinculantes                            |
| `docs/environments.md`   | Matriz oficial de ambientes/dados (vence conflitos)           |
| `e2e/smoke-prod.spec.ts` | Gate pós-deploy em produção (ADR 009)                         |

---

## 5. Mapeamento de Funcionalidades

| Módulo              | Funcionalidade                          | Status                               | Evidência                                             | Pendência                                  | Prioridade |
| ------------------- | --------------------------------------- | ------------------------------------ | ----------------------------------------------------- | ------------------------------------------ | ---------- |
| Auth                | Login + rate limit + cookie sessão      | Completa                             | `src/lib/auth/service.ts`, `src/app/login`, E2E login | —                                          | —          |
| Auth                | Troca de senha obrigatória              | Completa                             | `change-password`, seed `must_change_password`        | —                                          | —          |
| Auth                | Forgot/reset password (e-mail)          | Completa (com ressalva fail-open RL) | `password-reset.ts`, páginas forgot/reset             | Fail-open no catch do rate-limit           | P1         |
| Cadastro            | Listar/buscar oficiais                  | Completa                             | `/app/associados`, search params, trigram index       | —                                          | —          |
| Cadastro            | Criar/editar oficial + PII encrypt      | Completa                             | `associates/service.ts`, forms, smoke                 | Dual plaintext legado                      | P1         |
| Cadastro            | Dependentes e convênios                 | Completa                             | `DependentManager.tsx`, actions, schemas              | —                                          | —          |
| Cadastro            | Relatório CSV                           | Completa                             | `relatorio/`, `lib/reports`                           | —                                          | —          |
| Atividades          | Kanban CRUD + tags                      | Completa                             | `/app/atividades`, service, domain events ADR 018     | —                                          | —          |
| Jurídico            | Consultas + notas + SLA cron            | Completa                             | `/app/juridico/consultas`, cron sla-warnings          | —                                          | —          |
| Jurídico            | Processos judiciais                     | Parcial / schema-only                | `legal-processes.ts` sem pages CRUD                   | UI/service de produto ausente              | P2         |
| Jurídico            | Pareceres                               | Parcial / schema-only                | `legal-opinions.ts`                                   | UI ausente                                 | P3         |
| Financeiro          | Mensalidades, init mês, overdue cron    | Completa                             | `/app/financeiro/mensalidades`, finance service, cron | —                                          | —          |
| Secretaria          | Ofícios PDF + status + Assinafy         | Completa                             | oficios service, webhook, download route              | Operação depende de credenciais Assinafy   | P2 ops     |
| Secretaria          | E-mail institucional com Gemini         | Completa                             | `/secretaria/emails/gerar`                            | Chave Gemini em config                     | P3         |
| Etiquetas           | Geração PDF destinatários               | Completa                             | `/etiquetas`, service                                 | —                                          | —          |
| Email triage        | Inbox, detalhe, validação, process cron | Completa                             | `/email-triage`, Gmail watch cron                     | Depende config Gmail                       | P2 ops     |
| Config              | Usuários internos                       | Completa                             | `/config/usuarios` admin-only                         | —                                          | —          |
| Config              | Lotações                                | Completa                             | `/config/lotacoes`                                    | —                                          | —          |
| Config              | Auditoria                               | Completa                             | `/config/auditoria`                                   | —                                          | —          |
| Config              | API keys / webhooks / IA key            | Completa                             | `/config/integracoes/*`                               | Inbound events não implementado            | P3         |
| Notificações        | Bell + polling + mark read              | Completa                             | NotificationBell/Inbox, service                       | Sem realtime (deliberado)                  | —          |
| Privacidade         | Página política + export manual         | Completa (processo)                  | ADR 019 Option B, `/privacidade`                      | Export automático ausente (decisão)        | —          |
| Documentos / DMS    | Storage + UI                            | Ausente (deliberado)                 | ADR 008/012, tabela `documents` residual              | Não reabrir Papra                          | Futuro     |
| Integrações         | Health, events dispatch, webhooks       | Completa (outbound)                  | API v1, crons                                         | Ingestão inbound: explicit not implemented | P3         |
| Dashboard / Search  | KPIs + busca global                     | Completa                             | `/app`, `/app/search`, GlobalSearch                   | —                                          | —          |
| LGPD retention      | Cron retenção                           | Completa                             | `/api/v1/cron/lgpd-retention`                         | Revisão humana ADR 006                     | —          |
| Observabilidade     | APM/tracing prod                        | Parcial                              | logs estruturados; sem APM formal no repo             | Definir stack                              | P2         |
| Portal do associado | Self-service                            | Ausente                              | Não há rotas públicas de associado                    | Produto futuro                             | Futuro     |

---

## 6. Funcionalidades Completas

Com base em páginas, services, migrations, E2E e smoke:

1. **Autenticação staff** — login, sessão, roles, must-change-password, reset por e-mail.
2. **Cadastro de Oficiais** — CRUD, filtros de vínculo/situação, PII encrypt/blind index, dependentes, convênios, relatório.
3. **Atividades** — board, criação, atualização, eventos de domínio (outbox ADR 018).
4. **Jurídico — consultas** — listagem, criação, detalhe, notas, mudança de status, SLA warnings.
5. **Financeiro — mensalidades** — listagem, update status/método, cancelamento, inicialização de mês, cron overdue.
6. **Ofícios** — numeração, PDF, edição, cancelamento, envio Assinafy, webhook, download.
7. **Etiquetas PDF**.
8. **E-mail IA** (Gemini) com rate limit.
9. **Email triage** com cron de processamento e Gmail watch.
10. **Config** usuários, lotações, auditoria, integrações.
11. **Notificações** persistidas.
12. **Privacidade** informativa + processo manual de export (ADR 019).
13. **Crons** (7): events dispatch, SLA jurídico, LGPD retention, email-triage, overdue payments, gmail-watch, cleanup nonces.
14. **CI** validate + coverage thresholds + build + DB contract + integration + E2E + smoke-prod em main.
15. **Software factory / planning hygiene** — issues de planejamento recentes fechadas em `90f636e`.

---

## 7. Funcionalidades Incompletas ou Quebradas

| Item                      | Classificação                               | Evidência                                                                                 | Notas                                              |
| ------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `legal_processes`         | Schema sem UI de produto                    | `src/lib/db/schema/legal-processes.ts`; zero `page.tsx` de processos                      | Não inventar como “quebrado”; está **não exposto** |
| `legal_opinions` / tags   | Schema sem UI                               | `legal-opinions.ts`                                                                       | Idem                                               |
| `documents`               | Schema residual, feature fora do dia 1      | ADR 008; schema indexado; sem módulo de upload em `src/app`                               | Deliberado                                         |
| Inbound domain events     | Explicitamente não implementado             | `src/app/api/v1/events/route.ts` mensagem de “Inbound event ingestion is not implemented” | Outbound OK                                        |
| Dual PII columns          | Incompleto do ponto de vista de pureza LGPD | `associates` tem `cpf` e `cpfCiphertext` etc.; F-008 evita novos writes plaintext         | Migração legada residual                           |
| `marital_status = outros` | Dívida de domínio                           | TODO em `associates.ts` para ~285 records legados                                         | Normalização pendente                              |
| Password-reset rate-limit | Comportamento degradado em falha            | `catch` define `allowed = true`                                                           | Fail-open documentado no código                    |
| Realtime notifications    | Fora de escopo go-live                      | TODO-PROD: alerta persistido basta                                                        | Não é bug                                          |
| Staging diário            | Parcialmente operacionalizado               | Matriz prevê; uso não é o default                                                         | Risco de “testar em prod”                          |

**Não foram encontrados** (nesta auditoria) módulos marcados com `not implemented` massivos em paths críticos de cadastro/financeiro/login, nem smoke quebrado no código atual (falhas recentes #302/#303 já corrigidas no histórico da sessão).

---

## 8. Funcionalidades Ausentes ou Não Pensadas

| Feature                                                       | Classe              | Justificativa                                                                          | Impacto                | Prioridade  | Sugestão                                                       |
| ------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------- | ---------------------- | ----------- | -------------------------------------------------------------- |
| Portal do associado (consulta de vínculo/mensalidade)         | Futuro              | Sistema é intranet staff; ~763 oficiais não têm self-service                           | Médio-longo            | P3 / Futuro | Só após estabilizar operação interna                           |
| Módulo de documentos/storage privado                          | Futuro (ADR 008)    | Necessário para contratos/atas no longo prazo; Papra descartado                        | Alto quando necessário | Futuro      | Decisão de produto nova; não retomar Papra automaticamente     |
| UI de processos jurídicos                                     | Recomendável        | Schema já existe; jurídico real da associação envolve processos                        | Médio                  | P2          | MVP list+detail+status ligado a associate                      |
| 2FA / MFA staff                                               | Recomendável        | Contas com PII sensível de centenas de servidores                                      | Alto segurança         | P2          | TOTP ou WebAuthn após go-live estável                          |
| HSTS + CSP sem unsafe-eval                                    | Essencial hardening | Headers atuais incompletos vs. baseline moderno                                        | Médio                  | P1–P2       | Config Vercel/next headers                                     |
| APM / error tracking (Sentry ou similar)                      | Recomendável        | Só logs; incidentes em prod dependem de canal humano (ADR 011)                         | Médio                  | P2          | Integrar + redaction PII                                       |
| Backup automatizado periódico + teste de restore              | Essencial ops       | Free tier 6h PITR fraco; script `backup-neon-level1.sh` existe mas higiene operacional | Alto                   | P1          | Cron externo + restore drill documentado                       |
| Idempotência operacional “deploy+migrate checklist”           | Essencial           | Falhas históricas de schema drift                                                      | Alto                   | P0          | Checklist único no runbook + CI gate opcional de version table |
| Soft-delete / desligamento de associados com trilha           | Recomendável        | LGPD e histórico associativo                                                           | Médio                  | P2          | Revisar campos `leave_date`/`retirement_date` vs. UX           |
| RBAC fino por campo (ex.: notes internas só admin já parcial) | Parcial ok          | Já há checagens pontuais (`canEditInternalNotes`)                                      | Baixo                  | P3          | Matriz role×ação formal se o time crescer                      |
| Ingestão inbound de eventos                                   | Futuro              | API documenta ausência                                                                 | Baixo hoje             | P3          | Só se automações externas precisarem                           |
| Export LGPD automatizado                                      | Desnecessário agora | ADR 019 Option B: manual 15d SLA                                                       | —                      | —           | Manter até volume de pedidos                                   |

---

## 9. Análise Arquitetural

### Pontos fortes

- **App Router + Server Actions** alinhado ao Next 16; `proxy.ts` como guard de borda.
- **Separação progressiva** `page` → `actions` → `service` → `schema` em domínios maduros (associates, finance, oficios, juridico).
- **Factories de server actions** reduzem boilerplate de auth/rate-limit/validação.
- **ADRs e matriz de ambientes** reduzem ambiguidade operacional (raro em projetos de associação).
- **PII como concern transversal** (`crypto/pii`, `sanitizePii`, logger).
- **Outbox/domain events** (ADR 018) para desacoplar side-effects de atividades.
- **Integrações com dual auth** (env flag + API keys table) e nonces (ADR 014).
- **Contract tests de schema** evitam drift silencioso.

### Pontos fracos

- **Schema à frente da UI** (documents, legal_processes, opinions) sem feature flags documentadas na UI.
- **Páginas grandes** em associados (detail/edit) misturam apresentação e composição de dados — legível, mas caras de manter.
- **Acoplamento a Neon/Vercel** bem documentado, porém **processo de migrate manual** é single point of failure humano.
- **Legado de dual columns PII** aumenta complexidade de leitura/escrita e de testes.
- **Error boundaries** historicamente duplicados (auditoria 2026-06-08); padrão ainda merece consistência.
- **Notificações sem canal push** limita urgência operacional (aceitável no dia 1).

### Separação de responsabilidades

| Camada                                      | Estado                                        |
| ------------------------------------------- | --------------------------------------------- |
| Apresentação (RSC/client components)        | Boa                                           |
| Application (actions)                       | Boa com factories; holdouts auth intencionais |
| Domain services                             | Presente nos módulos críticos                 |
| Infra (db, email, assinafy, gmail)          | Isolada em `src/lib`                          |
| Cross-cutting (env zod, logger, rate-limit) | Forte                                         |

### Riscos de escalabilidade

- Pool `max: 10` e `statement_timeout: 30000` adequados ao porte atual; não há sharding/read-replica — **não necessário** para ~centenas de oficiais e poucos usuários staff.
- Crons diários bastam; se volume de webhooks Assinafy crescer, monitorar `webhook_deliveries`.
- Busca trigram + blind index: caminho correto; evitar full-table decrypt.

### Recomendações arquiteturais

1. Manter **services como fronteira de domínio**; novas features não devem colocar SQL em `page.tsx`.
2. Marcar schemas “sem produto” com comentário ADR ou módulo `src/lib/*/README` “not in day-1”.
3. Formalizar **pipeline deploy → migrate → smoke** como um único runbook checklist.
4. Ratchet de coverage (70→75 functions) já iniciado — continuar.
5. Não introduzir RLS no dia 1 (ADR 001) sem reavaliar custo/benefício.

---

## 10. Análise do Banco de Dados

### Entidades / tabelas identificadas (pgTable)

| Grupo           | Tabelas                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Identidade      | `admins`, `login_attempts`, `password_reset_tokens`, `password_reset_attempts`, `rate_limits`                          |
| Cadastro        | `associates`, `dependents`, `health_agreements`, `assignments`                                                         |
| Trabalho        | `activities`                                                                                                           |
| Jurídico        | `lawyers`, `legal_consultations`, `legal_notes`, `legal_processes`, `legal_opinions`, `legal_opinion_tags`             |
| Financeiro      | `monthly_payments`                                                                                                     |
| Secretaria      | `oficios`                                                                                                              |
| Docs (residual) | `documents`                                                                                                            |
| Comms           | `notifications`, `email_triagens` (+ enums triage)                                                                     |
| Integrações     | `domain_events`, `webhook_subscriptions`, `webhook_deliveries`, `integration_api_keys`, `integration_signature_nonces` |
| Sistema         | `app_settings`, `audit_logs`, `test_runs`, `test_results`                                                              |

**~26–31 estruturas** entre tabelas e enums distribuídos em 26 arquivos de schema e 31 migrations SQL.

### Relações (resumo textual)

```
admins ─┬─< activities (assignee, created_by)
        ├─< oficios (created_by, updated_by)
        ├─< legal_consultations / notes / processes
        ├─< notifications
        ├─< audit_logs
        └─< integration_api_keys / webhook_subscriptions

associates ─┬─< dependents (cascade)
            ├─< health_agreements (cascade)
            ├─< monthly_payments
            ├─< activities (optional)
            └─< legal_processes (optional)

domain_events ─< webhook_deliveries >─ webhook_subscriptions
```

### Migrations

- Baseline: `0000_green_glorian.sql`
- Incrementais até `0030_add_associate_leave_date.sql`
- Incluem: Assinafy, domain events, oficiais domain statuses, retirement/leave dates, índices de paginação e trigram de nome.

### Inconsistências e riscos

| Item                                     | Tipo                    | Evidência / impacto                        |
| ---------------------------------------- | ----------------------- | ------------------------------------------ |
| PII dual (plaintext + ciphertext + hash) | Modelo transitório      | Superfície LGPD; F-008 mitiga writes novos |
| `documents` sem storage backend          | Schema órfão de produto | Confusão; baixo risco se não usado         |
| `legal_processes` sem UI                 | Schema órfão de produto | Dados só via SQL/seed                      |
| Deploy sem migrate                       | Operacional             | Smoke/create falha com coluna ausente      |
| Neon Free PITR 6h                        | Operacional             | Rollback incompleto se incidente >6h       |
| Enum `marital_status.outros`             | Qualidade de dados      | Catch-all legado                           |
| RLS ausente                              | Aceito ADR 001          | Barreira = app + credentials + LGPD        |

### Índices — avaliação

Boas práticas já presentes:

- GIN trigram para busca por nome
- Índices parciais (webhooks ativos)
- Compostos para filtros/paginação (0029)
- Unique em hashes/API keys quando aplicável

Recomendações adicionais (hipótese até medir `EXPLAIN`):

- Revisar hot paths de listagem de mensalidades por competência.
- Garantir índices em FKs mais usadas se o planner reclamar em prod.

### Seeds

- `db:seed` — admin + advogados mínimos
- `db:seed:dev` — massa sintética; bloqueio de hosts remotos
- E2E `seed-e2e` / global-setup com `asof_test`

### Policies

- Sem RLS de PostgreSQL no gate do dia 1 (documentado).
- Autorização no app via `requireAuth` / `requireRole`.

### Melhorias propostas

1. Plano de **eliminação progressiva de plaintext PII** (backfill + drop columns em janela controlada).
2. Documentar tabelas “reservadas” vs. “em uso”.
3. Teste de restore mensal (dump + branch Neon).
4. Ao alterar schema: sempre atualizar `schema.integration.test.ts` (contrato do projeto).

---

## 11. Análise de Segurança

### Riscos encontrados

| ID   | Risco                                                                                       | Severidade                   | Evidência                                                  | Recomendação                                                                          |
| ---- | ------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| S-01 | Arquivo local `.env.local.prod.bak` (permissões `600`) com potencial de secrets de produção | **P0 local**                 | `ls -la .env*` — **não versionado** (`.gitignore` `.env*`) | Remover do disco ou vault; nunca copiar para chat/PR; rotacionar se vazou             |
| S-02 | Password-reset rate-limit fail-open em erro de DB                                           | **P1**                       | `password-reset.ts` L87–96: `allowed = true` no catch      | Fail-closed ou circuit-breaker com floor de tempo + alerta                            |
| S-03 | CSP com `'unsafe-inline'` e `'unsafe-eval'`                                                 | **P2**                       | `next.config.ts` securityHeaders                           | Endurecer progressivamente (nonces)                                                   |
| S-04 | Sem `Strict-Transport-Security` no config Next                                              | **P2**                       | Headers listados sem HSTS                                  | Habilitar HSTS na Vercel / next headers                                               |
| S-05 | Dual PII plaintext residual                                                                 | **P1 LGPD**                  | schema associates                                          | Backfill + parar leitura plaintext quando ciphertext existe (já preferido em mapping) |
| S-06 | `npm audit`: 2 high, 2 moderate, 5 low (0 critical)                                         | **P2**                       | `npm audit` 2026-07-09                                     | Monitorar; upgrades controlados                                                       |
| S-07 | Integrações/webhooks superfície M2M                                                         | **P2 residual**              | nonces + rate limit existem                                | Revisar periodicamente Assinafy signature verify                                      |
| S-08 | Smoke admin em produção                                                                     | **Aceito ADR 009**           | conta `smoke-admin@asof.local`                             | Manter senha só em GitHub Secrets; limpar `SMOKE_*` pós-run                           |
| S-09 | `SKIP_AUTH` em dev                                                                          | **OK se production-blocked** | Documentado: ignorado em `NODE_ENV=production`             | Nunca setar em Vercel prod                                                            |
| S-10 | Relatório CSV com PII                                                                       | **Aceito produto**           | download rate-limited                                      | Manter audit log de export                                                            |

### Secrets / envs (mascarados)

- **Não** foram impressos valores de secrets nesta auditoria.
- Arquivos locais detectados: `.env.example` (template), `.env.local`, `.env.local.prod.bak`.
- Produção: secrets gerenciados na Vercel (`SESSION_SECRET`, `ENCRYPTION_MASTER_KEY`, `CRON_SECRET`, `DATABASE_*`, Mailjet, etc.) conforme TODO-PROD.
- Risco: **backup local de env de prod** — tratar como material confidencial.

### Autenticação / autorização

- Cookie assinado `httpOnly`; `requireAuth` / `requireRole` em páginas sensíveis.
- Roles: `admin`, `diretoria`, `secretaria` com checagens por rota (ex.: usuários só admin; auditoria admin+diretoria; criar oficial admin+secretaria).
- Login rate limit e login_attempts presentes.
- Reset com token hasheado, expiry 1h, floor de timing.

### Validação de entrada

- Zod em schemas de validação e forms.
- Factories de actions com rateLimit configurável.

### Exposição de rotas

| Superfície                    | Proteção                      |
| ----------------------------- | ----------------------------- |
| `/app/*`                      | proxy + requireAuth           |
| `/api/v1/cron/*`              | `CRON_SECRET`                 |
| `/api/webhooks/assinafy`      | assinatura Assinafy           |
| `/api/v1/events`              | integration auth + rate limit |
| `/api/v1/health`              | rate limit                    |
| Downloads de relatório/ofício | auth + rate limit             |

### SQL injection / XSS

- Drizzle parametrizado mitiga SQLi.
- React escapa por padrão; CSP presente (ainda permissivo em scripts).

### Recomendações de segurança (ordem)

1. Eliminar/rotacionar material de `.env.local.prod.bak` se não for estritamente necessário.
2. Fail-closed no rate-limit de reset (ou fail-open com alerta + limite secundário por IP).
3. HSTS + reduzir `unsafe-eval` quando build permitir.
4. Continuar zero plaintext em logs (`sanitizePii`).
5. Revisar `npm audit` high em ciclo mensal.

---

## 12. Análise de Código e Boas Práticas

### Boas práticas observadas

- TypeScript estrito com flags baratas recentes (factory #310).
- Enums de domínio em português alinhados ao negócio.
- Logger com redaction.
- `server-only` em módulos sensíveis.
- Testes colocalizados `*.test.ts`.
- Seeds com guards de host remoto.
- Migrate guarded (`ALLOW_PRODUCTION_MIGRATIONS`).
- Documentação densa e navegável para agentes humanos.
- Correções recentes de PII empty→null (evita colisão de blind index) — qualidade de engenharia reativa boa.

### Más práticas / dívida

| Item                                     | Evidência                               | Ação                          |
| ---------------------------------------- | --------------------------------------- | ----------------------------- |
| TODO de normalização marital             | `associates.ts`                         | Job de dados                  |
| Schemas sem produto                      | documents, legal_processes              | Documentar ou implementar     |
| Páginas monolíticas de associado         | forms longos                            | Extrair seções                |
| Scripts órfãos (auditoria jun/2026)      | lista em `docs/AUDITORIA-2026-06-08.md` | Archive/documentar no runbook |
| CSP frouxo                               | next.config                             | Hardening                     |
| Duplicação histórica de error boundaries | auditoria anterior                      | Manter component único        |

### Código morto / placeholders

- Placeholders de UI (inputs) são normais — **não** contam como feature incompleta.
- Mensagem explícita de inbound events não implementado — feature flag textual honesta.
- Módulo documents schema-only.

### Pontos de refatoração prioritários

1. Fail-open password-reset.
2. Extração de seções dos forms de associado.
3. Plano de sunset plaintext PII.
4. Inventário de scripts em `scripts/` com README de quais são canônicos.

---

## 13. Análise de Testes

### Existentes

| Camada          | Local                                                   | Observação                                                               |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ |
| Unit            | `src/**/*.test.{ts,tsx}`, `scripts/**/*.test.ts`        | ~179 arquivos de teste; suite 1500+ asserts/cases no histórico TODO-PROD |
| Coverage gate   | `vitest.config.ts`                                      | lines 70, functions 70, branches 65; CI `test:coverage`                  |
| Integration DML | `*.integration.test.*` + `vitest.integration.config.ts` | Postgres real; CI job database-contract                                  |
| Schema contract | `npm run test:db`                                       | tables/columns/enums/indexes/migrations                                  |
| E2E             | 10 specs em `e2e/tests/*`                               | porta 3001, `asof_test`                                                  |
| Smoke prod      | `e2e/smoke-prod.spec.ts`                                | 10 testes serial; main + dispatch                                        |

Specs E2E: login, dashboard, associados, atividades, juridico, financeiro, assinafy, roles, secretaria, usuarios.

### Lacunas

| Lacuna                                           | Criticidade                                    |
| ------------------------------------------------ | ---------------------------------------------- |
| E2E de email-triage ponta a ponta com Gmail real | Baixa (mock/cron)                              |
| Testes de UI de processos jurídicos              | N/A até existir feature                        |
| Chaos/ falha de rate-limit fail-open             | P1 — adicionar teste unitário do caminho catch |
| Restore drill automatizado                       | P1 ops                                         |
| Mutation testing / property tests em PII mapping | P2                                             |
| Coverage real medido nesta sessão                | Não reexecutado — confiar no CI main           |

### Estratégia mínima de smoke (já existe — manter)

1. Login sessão
2. Dashboard KPIs
3. Associados list/detail
4. Criar atividade `SMOKE_*`
5. Criar consulta jurídica `SMOKE_*`
6. Financeiro carrega
7. Ofícios
8. Auditoria
9. Notificações
10. Reset password path

Pós-smoke: SQL de limpeza impresso; preservar `audit_log`.

### Sugestões

- **Unit:** casos de blank PII, fail-closed rate-limit, transições de status financeiro.
- **Integration:** create associate com CPF vazio não colide; migrate journal integrity.
- **E2E:** fluxo de dependentes/convênios; etiquetas PDF download.
- **Smoke:** já suficiente; não expandir sem custo de limpeza.

---

## 14. Análise Operacional e DevOps

### Ambiente local

```bash
npm install
cp .env.example .env.local   # SESSION_SECRET, DATABASE_URL, etc.
# Postgres local asof_intranet
npm run db:migrate
npm run db:seed:dev
npm run dev
```

Gates: `validate:quick`, `validate:full`, `pr:check`.

### Deploy

- Push `main` → Vercel produção.
- **Migrations NÃO automáticas no deploy** — `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate` manual.
- Preview sem DATABASE de produção (TODO-PROD).

### CI/CD (`.github/workflows/ci.yml`)

Jobs: validate (lint/typecheck/test/coverage) → build → database-contract (+ integration) → e2e → smoke-prod (main/dispatch).

### Logs e observabilidade

- Logger estruturado com PII redaction.
- Sem APM dedicado no repositório.
- Owners de incidente em ADR 011 (contatos fora do repo).

### Backups

- ADR 010: Neon PITR + branch restore.
- Free tier: **6h** history_retention — **gap vs. expectativa 24h**.
- Script `scripts/backup-neon-level1.sh` existe; deve constar explicitamente no runbook de rotina.

### Riscos operacionais

1. Schema drift deploy vs migrate.
2. PITR curto no Free.
3. Processos órfãos E2E na porta 3001 (documentado em Claude.md).
4. Vercel CLI prompts interativos em automação (memória operacional).
5. Smoke residual `SMOKE_*` se limpeza não for executada.
6. Code signing Next em Node embutido de alguns agents no macOS.

---

## 15. Plano de Ação Priorizado

| Prioridade | Tarefa                                                           | Justificativa                     | Arquivos/Módulos                            | Esforço       | Risco se não fizer                       | Dependências                  |
| ---------- | ---------------------------------------------------------------- | --------------------------------- | ------------------------------------------- | ------------- | ---------------------------------------- | ----------------------------- |
| **P0**     | Remover ou vaultar `.env.local.prod.bak`; rotacionar se exposto  | Secrets locais de prod            | `~/.` workspace env files                   | Baixo         | Vazamento de DB/sessão                   | Acesso ao vault/Vercel        |
| **P0**     | Checklist único deploy→migrate→smoke no runbook                  | Evita downtime por coluna ausente | `docs/runbook.md`, `TODO-PROD.md`           | Baixo         | Regressões em prod                       | Disciplina de release         |
| **P1**     | Fail-closed (ou alerta forte) no rate-limit de password-reset    | Abuso de reset se DB falha        | `src/lib/auth/password-reset.ts` + testes   | Baixo–médio   | Spam/DoS de e-mail / enumeração auxiliar | Mailjet quotas                |
| **P1**     | Backup periódico + restore drill documentado                     | PITR 6h insuficiente              | `scripts/backup-neon-level1.sh`, runbook    | Médio         | Perda de dados >6h                       | Neon plan ou dumps            |
| **P1**     | Plano de sunset plaintext PII                                    | LGPD e superfície                 | associates mapping, backfill scripts        | Alto          | Não conformidade / exposição             | ENCRYPTION_MASTER_KEY estável |
| **P1**     | HSTS + revisão CSP                                               | Hardening browser                 | `next.config.ts`, Vercel                    | Baixo–médio   | XSS impact amplificado                   | Compat build Next             |
| **P2**     | Avaliar upgrade Neon (retenção ≥24h) no go-live real             | ADR 010 expectativa               | Conta Neon                                  | Médio (custo) | Rollback frágil                          | Orçamento                     |
| **P2**     | APM/error tracking com redaction                                 | MTTR                              | nova integração                             | Médio         | Incidentes cegos                         | DPO/LGPD ok                   |
| **P2**     | UI mínima de processos jurídicos **ou** marcar schema deprecated | Clareza de produto                | `legal-processes`, `src/app/app/juridico`   | Alto se UI    | Expectativa falsa                        | Decisão diretoria             |
| **P2**     | `npm audit` high remediation                                     | Supply chain                      | package-lock                                | Baixo–médio   | CVE explorável                           | Breaking upgrades             |
| **P2**     | Normalizar `marital_status=outros`                               | Qualidade cadastral               | dados + enum                                | Médio         | Relatórios distorcidos                   | Dados reais                   |
| **P3**     | Extrair forms de associado em seções                             | Manutenibilidade                  | `CriarAssociadoForm`, `EditarAssociadoForm` | Médio         | Dívida de DX                             | —                             |
| **P3**     | Ratchet coverage → 75% functions                                 | Qualidade                         | vitest thresholds                           | Contínuo      | Regressões sutis                         | Tempo de teste                |
| **P3**     | Inbound events só sob demanda                                    | Evitar YAGNI                      | `api/v1/events`                             | Alto          | —                                        | Integração externa            |
| **Futuro** | Módulo documentos (não-Papra)                                    | Operação documental               | novo design                                 | Alto          | Processo manual                          | ADR produto                   |
| **Futuro** | Portal do associado                                              | Self-service                      | novo app surface                            | Alto          | Pressão de atendimento                   | Produto                       |

---

## 16. Roadmap Técnico Sugerido

### Fase 1 — Correções Críticas

- Higiene de secrets locais (S-01).
- Runbook deploy+migrate+smoke como procedimento único e treinado.
- Password-reset rate-limit fail-closed + testes.
- Confirmar limpeza residual SMOKE após cada janela.

### Fase 2 — Consolidação Funcional

- Fechar gaps de UX reais reportados pela secretaria/diretoria (não inventar módulos).
- Decidir: implementar MVP de processos jurídicos **ou** documentar “não no roadmap”.
- Normalização cadastral legada (estado civil `outros`, campos AC sentinel).

### Fase 3 — Refatoração Arquitetural

- Sunset plaintext PII (design + migration).
- Quebra de forms gigantes; consistência error boundary.
- Limpeza de scripts órfãos / archive.

### Fase 4 — Testes e Qualidade

- Testes do caminho de falha de rate-limit.
- Manter coverage ratchet.
- Expandir E2E só em fluxos de alto valor (dependentes, etiquetas, ofício→Assinafy em staging).

### Fase 5 — Operação, Observabilidade e Documentação

- Backup schedule + restore drill.
- Avaliar plano Neon com retenção adequada.
- APM + alertas de cron failure.
- Atualizar `TODO-PROD` como operação contínua (não só go-live).

### Fase 6 — Evoluções Futuras

- Storage/documentos (nova decisão).
- MFA staff.
- Portal do associado.
- Inbound integrations.
- (Opcional) RLS se multi-tenant ou requisitos regulatórios mudarem.

---

## 17. Recomendações para a Equipe

### Desenvolvedores

- Ler `CONTEXT.md` + ADR do módulo antes de modelar status.
- Nunca escrever PII plaintext; usar `encryptPii` / mapping central.
- Ao mudar schema: migration + `schema.integration.test.ts` + seed se necessário.
- Preferir `service.ts` a SQL em `page.tsx`.
- Rodar `pr:check` antes de abrir PR.

### Revisores

- Checar: auth role, rate-limit, audit log em mutações sensíveis, ausência de PII em logs, migrate path.
- Rejeitar “schema sem produto” sem ADR/comentário.
- Verificar se smoke/E2E cobre o fluxo crítico da mudança.

### Testadores

- Usar seed sintético local; dados reais só com autorização LGPD.
- Smoke prod só em janela; sempre executar SQL de limpeza.
- Não apontar Playwright para porta 3000.

### Responsável por banco de dados

- Produção: migrate só com `ALLOW_PRODUCTION_MIGRATIONS=true` e backup prévio.
- Nunca `CREATE INDEX CONCURRENTLY` dentro do migrate transacional sem runbook.
- Monitorar tamanho e PITR; planejar upgrade de tier.

### Responsável por deploy

- Ordem: merge main → Vercel deploy ready → migrate se houver SQL → smoke → limpeza SMOKE.
- Confirmar env production (`CRON_SECRET`, `ASOF_INTRANET_URL`, encryption keys).
- Manter “last known good” deployment ID (padrão ADR 010).

### Gestão do projeto

- Tratar o sistema como operacional; priorizar risco e conformidade, não features cosméticas.
- Não reabrir Papra/DMS sem decisão formal.
- Export LGPD permanece manual (ADR 019) até volume justificar automação.
- Orçar retenção de backup realista (≥24h) antes de uso intensivo pela diretoria.

---

## 18. Checklist de Execução

### Imediato (P0/P1)

- [ ] Inventariar e eliminar `.env.local.prod.bak` ou mover para cofre; rotacionar secrets se houver risco de exposição
- [ ] Publicar/atualizar checklist único: **Deploy Vercel → Migrate Neon → Smoke → Limpeza SMOKE**
- [ ] Alterar password-reset para fail-closed (ou fail-open com alerta + limite IP) + testes unitários
- [ ] Agendar backup dump/branch semanal e um restore drill documentado
- [ ] Habilitar HSTS no domínio `intranet.asof.com.br`
- [ ] Revisar CSP (`unsafe-eval`) em issue de hardening

### Curto prazo (P2)

- [ ] Avaliar plano Neon com `history_retention` ≥ 24h
- [ ] Integrar APM/error tracking com redaction PII
- [ ] Decidir destino de `legal_processes` / `legal_opinions` (MVP UI ou “schema reserved”)
- [ ] Plano escrito de remoção de colunas plaintext PII
- [ ] Tratar `npm audit` high em ciclo controlado
- [ ] Job de normalização `marital_status=outros`

### Médio prazo (P3 / qualidade)

- [ ] Refatorar forms de associado em seções/componentes
- [ ] Ratchet coverage functions 70 → 75
- [ ] Catalogar scripts canônicos vs archive em `scripts/AGENTS.md` ou README
- [ ] Revisar consistência de error boundaries

### Futuro (produto)

- [ ] MFA para staff
- [ ] Módulo de documentos (nova decisão de stack)
- [ ] Portal do associado (se demandado)
- [ ] Inbound domain events (se automações externas)

### Operação contínua

- [ ] Smoke em todo push main (já no CI) e limpeza residual
- [ ] Manter `docs/environments.md` como fonte da verdade
- [ ] Revisar ADRs ao mudar decisão (não “silenciar” divergência em README)
- [ ] Canal de incidente ADR 011 testado periodicamente

---

## 19. Conclusão

### Estado atual

A **ASOF Intranet** é um sistema **maduro para operação controlada**: domínio bem modelado, stack moderna, segurança consciente de PII, testes em múltiplas camadas, documentação e ADRs acima da média. O commit `90f636e` fecha um ciclo de factory que removeu issues de planejamento abertas e reforçou coverage/CI.

Não se trata de um protótipo incompleto: as jornadas centrais (login, cadastro, atividades, jurídico consultas, financeiro, ofícios, config, smoke) estão implementadas e instrumentadas.

### Riscos principais

1. **Operação de release** (migrate vs deploy).
2. **Secrets e backups** (arquivo local de env; PITR 6h).
3. **Edge cases de auth** (fail-open no reset).
4. **Dívida LGPD de plaintext legado**.
5. **Expectativa de features** presentes só no schema (documentos/processos).

### Próximos passos recomendados (ordem ideal)

1. Higiene de secrets locais + rotação se necessário.
2. Ritual de release deploy→migrate→smoke.
3. Hardening password-reset rate-limit.
4. Backup/restore drill e decisão de tier Neon.
5. Plano PII sunset + hardening headers; só então frentes de produto novas.

### Ordem ideal de execução

**P0 ops/secrets → P1 auth/backup/PII → P2 observabilidade/produto jurídico → P3 DX/coverage → Futuro portal/documentos/MFA.**

---

## Apêndice A — Escopo quantificado

| Métrica                                    | Valor aproximado                       |
| ------------------------------------------ | -------------------------------------- |
| Páginas (`page.tsx`)                       | 34                                     |
| Route handlers (`route.ts`)                | 14                                     |
| Módulos de schema TS                       | 26                                     |
| Migrations SQL                             | 31 (0000–0030)                         |
| Crons Vercel                               | 7                                      |
| Specs E2E                                  | 10                                     |
| Smoke prod tests                           | 10                                     |
| Arquivos de teste (unit/integration paths) | ~179                                   |
| ADRs                                       | 19 (001–019)                           |
| Roles                                      | 3 (`admin`, `diretoria`, `secretaria`) |
| Commit auditado                            | `90f636e`                              |

## Apêndice B — O que deliberadamente **não** é problema

- Ausência de DMS/Papra (ADR 008/012; decisão 2026-07-08).
- Export LGPD manual (ADR 019).
- Sem RLS (ADR 001).
- Sem realtime de notificações (TODO-PROD).
- Staging não ser o default diário (dev local sintético é o padrão).

## Apêndice C — Fontes de evidência principais

- `TODO-PROD.md`, `docs/environments.md`, `docs/adr/*`
- `src/lib/db/schema/*`, `drizzle/postgres/*`
- `src/app/**`, `src/lib/**/service.ts`
- `next.config.ts`, `vercel.json`, `.github/workflows/ci.yml`
- `src/lib/auth/password-reset.ts`, `src/lib/associates/pii-mapping.ts`
- `vitest.config.ts`, `e2e/smoke-prod.spec.ts`
- `docs/AUDITORIA-2026-06-08.md` (dívida histórica de limpeza)
- `npm audit` (2026-07-09)

---

_Fim do relatório. Gerado em modo somente leitura em 2026-07-09 para orientação da equipe ASOF Intranet._
