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

---

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Project Notes

## Tooling

- Use `npm` for this project; it has `package-lock.json` and no `pnpm-lock.yaml` or `yarn.lock`.
- For Python work in this repository, use `uv` by default: `uv run`, `uv add`, and `uv sync`.
- Use Context7 automatically for any query that references an external library, framework, API, SDK, CLI, cloud service, or tool. Do not rely on training knowledge for library/tool documentation.
- Context7 triggers include code generation with any package, setup/installation steps, configuration files, API method signatures, migration/version-specific syntax, and debugging that depends on external library behavior. Never wait for the user to explicitly say "use Context7".

## Commands

```bash
npm install
npm run dev
npm run dev:turbo
npm run build
npm run build:turbo
npm run lint
npm run test
npm run test:db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

- `npm run dev` runs `next dev --webpack`, which is the safe default for this project.
- `npm run dev:turbo` and `npm run build:turbo` are available for explicit Turbopack checks only.
- `scripts/run-dev-60s.sh` is the controlled dev-server diagnostic wrapper. It starts `npm run dev`, samples process state, curls the local app, writes `next-dev-60s.log`, and kills the process tree on exit.

## Architecture

- App Router source lives under `src/app`.
- The authenticated app area is `src/app/app`; login is under `src/app/login`.
- Shared UI components live in `src/components`.
- Auth helpers live in `src/lib/auth`.
- Database access lives in `src/lib/db`, with Drizzle schema files in `src/lib/db/schema`.
- Current Drizzle migrations are in `drizzle/postgres`.
- The `@/*` import alias maps to `src/*`.
- `src/lib/logger.ts` — structured logger with PII redaction. Use `createLogger('module-name')` instead of `console.*`.
- `src/lib/sanitize-pii.ts` — shared PII sanitizer for audit logs and webhook outbox.

## Database Conventions

- **Enums**: Use PostgreSQL enums for all status/type fields. Never use `text` for a bounded set of values.
- **Indexes**: Create partial indexes for queries with conditional `WHERE`. Use trigram GIN (`gin_trgm_ops`) for `LIKE '%term%'`. Use composite indexes matching `(filter, order)` patterns. Prefix custom indexes with `idx_`.
- **Connection pool**: `max: 10`, `max_lifetime: 1800`, `statement_timeout: 30000`, `application_name: 'asof-intranet'` in `src/lib/db/index.ts`.
- **Transactions**: Multi-table operations MUST use `db.transaction()`. Pass the `tx` executor to repository functions that accept one.
- **RLS**: Hardened in migrations 0023 + 0044. All policies use `TO authenticated` (not `TO PUBLIC`) and `FORCE ROW LEVEL SECURITY` is applied on all 19 application tables. Migration 0044 aligned `notifications` (the last `TO PUBLIC` outlier) to `TO authenticated` with `get_current_admin_id()`. Auth is enforced server-side via `requireAuth()` and `requireRole()`. If a direct database client is ever exposed to the browser, RLS policies must be narrowed to per-user or per-role predicates.
- **Update safety**: `updateAssociateById` and similar functions must use typed interfaces, not `Record<string, unknown>`, to prevent unintended column overwrites.
- **Migrations**: Name SQL files with zero-padded index + description (e.g., `0009_quality_improvements.sql`). Update `meta/_journal.json` with the correct timestamp.
- **Testing**: `npm run test:db` validates tables, columns, enums, indexes, extensions, and migration alignment against the live database.

## Database

- `drizzle.config.ts` targets PostgreSQL and writes migrations to `drizzle/postgres`.
- Runtime DB access requires `DATABASE_URL` or `DATABASE_POSTGRES_URL`.
- Drizzle migrations require a direct/non-pooling PostgreSQL URL via `DATABASE_MIGRATION_URL` or `DATABASE_POSTGRES_URL_NON_POOLING`.
- Local development uses PostgreSQL from Homebrew, currently `postgresql@16` on `localhost:5432`.
- Homebrew PostgreSQL uses the macOS user role on this machine (`$USER`, currently `gabrielramos`); do not use `postgres://postgres@localhost:5432/...` unless that role has been explicitly created.
- For local development, use the same direct URL for runtime and migrations: `DATABASE_URL=postgres://$USER@localhost:5432/asof_intranet` and `DATABASE_MIGRATION_URL=postgres://$USER@localhost:5432/asof_intranet`.
- Neon (intranet-db) remains the remote/staging/production Postgres target; use pooler URLs only for runtime and direct/non-pooling URLs for migrations.
- Seed scripts are `scripts/seed-admin.ts` only; `scripts/seed-associados.ts` was removed.

## Development Auth

- Local bypass is controlled by `.env.local` with `SKIP_AUTH=true`.
- When auth is skipped, the development user is read from `DEV_USER_ID`, `DEV_USER_NAME`, `DEV_USER_EMAIL`, `DEV_USER_ROLE`, and `DEV_USER_MUST_CHANGE_PASSWORD`.
- Valid roles are `admin`, `diretoria`, and `secretaria`.

## Testing And Validation

- Vitest runs Node-environment tests matching `src/**/*.test.{ts,tsx}`.
- `npm run test:db` runs the PostgreSQL schema contract tests against `.env.local`; it validates tables, columns, enums, indexes, `pg_trgm`, migration SQL files, `meta/_journal.json`, and `drizzle.__drizzle_migrations`.
- E2E tests must be run with `npm run test:e2e` unless explicitly diagnosing a different server. Playwright is configured for `http://localhost:3001`, and `e2e/global-setup.ts` creates/migrates/seeds `asof_test` before starting its own Next.js dev server on `127.0.0.1:3001`.
- The E2E server sets `NEXT_E2E=1`; `next.config.ts` then uses `distDir: ".next-e2e"` so Next.js has a separate dev lock/cache from the regular `.next/dev` server on `3000`.
- Do not point E2E tests at an existing `npm run dev` server on `http://localhost:3000` unless that server's database has been intentionally seeded for E2E. The normal dev server uses `.env.local` (`asof_intranet` locally), so E2E logins can fail with `/login?error=1`; repeated failures can persist in `login_attempts` and become `/login?error=rate-limit`.
- ESLint uses `eslint-config-next` core web vitals plus TypeScript config.
- After dependency or Next/Tailwind changes, validate with at least `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` when feasible.

## Gotchas

- This project is on Next.js `16.2.6`; check `node_modules/next/dist/docs/` before changing Next APIs, routing conventions, config, or build behavior.
- Do not downgrade Next.js below the pinned 16.2.6 line; keep RSC security fixes current when updating framework versions.
- `next.config.ts` pins `turbopack.root` to this directory for explicit Turbopack checks. This was added because a prior real-project dev test resolved Tailwind from the parent project directory instead of this app directory.
- The machine previously showed heavy memory pressure from `next dev` PostCSS/Tailwind workers on an 8 GB MacBook Air. Prefer controlled dev-server tests with `scripts/run-dev-60s.sh` when diagnosing freezes.

## Worktrees e Isolamento

- Antes de iniciar qualquer nova frente, rode `git status --short --branch` e identifique se ha arquivos modificados, staged ou untracked que pertencem a outra task.
- Nao misture frentes no mesmo PR. Se a task atual terminou, faca commit/PR antes de iniciar a proxima. Se precisar pausar uma frente, use `git stash push -u -m "<nome-da-frente>"` ou crie um worktree/branch dedicado.
- Evite `git add .` quando houver mais de uma frente aberta. Prefira `git add <arquivos-da-task>` e confira com `git diff --cached --name-status` antes de commitar.
- Worktrees aninhados tambem contam: se `.claude/worktrees/*` ou `.worktrees/*` aparecer como dirty no repo principal, entre no worktree correspondente e faca commit/stash la dentro. Nao resolva isso apagando ou revertendo alteracoes sem confirmar a origem.
- Antes de abrir PR, o `git status --short --branch` deve estar limpo ou conter apenas arquivos explicitamente fora do escopo e preservados em stash/branch separado.
- Use git worktrees para isolar cada feature em `.worktrees/<branch-name>`. Cada worktree é um checkout independente com seu próprio `node_modules` e `.next`.
- Cada agente deve modificar apenas arquivos dentro da área que lhe foi atribuída (ex: `src/app/api` vs `src/components`). Quanto menos sobreposição de arquivos, menor a chance de conflito.
- Faça rebase em `origin/main` frequentemente durante o desenvolvimento. Conflitos pequenos e frequentes são mais fáceis de resolver que um conflito gigante no final.
- PRs devem ser pequenos e focados em uma única responsabilidade.
- Quando duas features tocam a mesma área, o segundo agente faz rebase em cima do resultado do merge da primeira.
- Ao remover o worktree quando a feature for mergeada: `git worktree remove .worktrees/<branch>`.

## Padrão Git Worktree + Subagentes Paralelos

Este projeto usa um padrão padronizado de **git worktrees** combinado com **subagentes paralelos** no Maestri para acelerar o desenvolvimento de features sem conflitos.

### Estrutura de Worktrees

```
<repo-root>/
├── .git/
├── .worktrees/
│   ├── feature-auth-refactor/      ← worktree 1 (agente A)
│   ├── feature-new-dashboard/      ← worktree 2 (agente B)
│   └── fix-login-race/             ← worktree 3 (agente C)
├── src/
└── ...
```

**Comandos:**

```bash
# Criar worktree para uma feature
git worktree add -b feature/nome .worktrees/feature-nome

# Entrar no worktree
cd .worktrees/feature-nome

# Remover worktree após merge
git worktree remove .worktrees/feature-nome
```

### Padrão de Subagentes Paralelos

Quando uma feature é grande o suficiente, o Maestro decompõe em tarefas independentes e delega a **subagentes em worktrees separados**:

```
Maestro (terminal principal)
├── Agente A — worktree: feature-auth-refactor
│   └── Responsabilidade: refatorar middleware de auth
├── Agente B — worktree: feature-new-dashboard
│   └── Responsabilidade: criar componentes do dashboard
└── Agente C — worktree: fix-login-race
    └── Responsabilidade: corrigir race condition no login
```

**Regras de Coordenação:**

1. **Isolamento obrigatório**: Cada subagente trabalha APENAS em seu worktree. Nenhum agente toca arquivos de outro.
2. **Rebase frequente**: Subagentes fazem `git rebase origin/main` a cada 30 min ou antes de qualquer push.
3. **Sem push direto para main**: Todos os worktrees usam branches nomeadas (`feature/*`, `fix/*`).
4. **Sincronização via notes**: Subagentes escrevem status em notes do Maestri (`maestri note write`) em vez de commits de merge.
5. **Testes locais independentes**: Cada worktree roda seu próprio `npm run test` e `npm run build` antes de reportar conclusão.

### Fluxo de Orquestração

**Passo 1 — Decomposição (Maestro)**

- Analisa a feature e divide em tarefas com fronteiras claras (nenhuma tarefa deve editar os mesmos arquivos que outra).
- Cria um plano de dependências: o que pode ser paralelo vs. o que precisa ser sequencial.

**Passo 2 — Alocação (Maestro)**

- Cria worktrees: `git worktree add -b feature/<nome> .worktrees/<nome>`
- Recruta subagentes no Maestri (um por worktree).
- Conecta notes de contexto a cada subagente.

**Passo 3 — Execução Paralela (Subagentes)**

- Cada subagente implementa sua tarefa no próprio worktree.
- Reporta progresso via `maestri note write` a cada checkpoint.
- Sinaliza conclusão ao Maestro.

**Passo 4 — Integração (Maestro)**

- Revisa cada branch individualmente (code review via `maestri ask`).
- Resolve conflitos de merge se necessário.
- Faz squash/merge para `main` na ordem correta (respeitando dependências).
- Remove worktrees após merge bem-sucedido.

### Exemplo Prático

**Cenário:** Implementar novo módulo de "Eventos e Notificações"

```
Maestro
├── Agente A — worktree: feature/eventos-db
│   └── Schema Drizzle + migration PostgreSQL
├── Agente B — worktree: feature/eventos-api
│   └── Server Actions + repository + queries
├── Agente C — worktree: feature/eventos-ui
│   └── Páginas React + componentes + formulários
└── Agente D — worktree: feature/eventos-tests
    └── Testes unitários + E2E + schema contract
```

**Dependências:**

- A → B (API depende do schema)
- B → C (UI depende da API)
- D pode rodar em paralelo, mas precisa do schema de A

**Orquestração:**

1. Maestro lança A primeiro.
2. Quando A termina, Maestro faz merge do schema e lança B e D em paralelo.
3. Quando B termina, Maestro lança C.
4. Maestro integra tudo e faz merge final.

### Anti-padrões a Evitar

- **NÃO** compartilhar um único worktree entre múltiplos agentes.
- **NÃO** permitir subagentes fazerem merge direto para `main`.
- **NÃO** deixar worktrees abandonados por mais de 48h sem rebase.
- **NÃO** dividir tarefas que editam o mesmo arquivo (ex: dois agentes modificando `src/lib/db/schema.ts`).
- **NÃO** abrir PR a partir de um worktree com mudanças de outra frente no working tree.
- **NÃO** usar `git add .` como atalho antes de revisar `git status --short` e `git diff --cached --name-status`.

### Comandos Úteis

```bash
# Listar worktrees ativos
git worktree list

# Forçar remoção de worktree sujo
git worktree remove --force .worktrees/<nome>

# Prune worktrees inválidos
git worktree prune

# Verificar branch de cada worktree
git worktree list --porcelain

# Preservar uma frente inacabada antes de trocar de task
git stash push -u -m "nome-da-frente"

# Conferir exatamente o que entrara no commit
git diff --cached --name-status
```
