<!-- BEGIN:nextjs-agent-rules -->
# Contexto Institucional

A ASOF (Associação Nacional dos Oficiais de Chancelaria do Serviço Exterior Brasileiro) é uma associação civil sem fins lucrativos fundada em 1991, com ~763 associados. Representa a carreira de Oficial de Chancelaria do Ministério das Relações Exteriores (Itamaraty/MRE) — servidores de nível superior responsáveis pela gestão administrativa da política externa brasileira.

## Vocabulário do domínio → campos do banco

| Termo | Significado | Campo DB |
|---|---|---|
| **Lotação** | Posto ou órgão onde o servidor está em exercício (ex: "Embaixada em Paris", "SERE") | `assignment` |
| **Posto** | Representação diplomática no exterior (embaixada, consulado) ou a SERE em Brasília | `assignment` |
| **Padrão / Classe** | Nível na carreira: Classe A → B → C → Especial, cada uma com 5 padrões | `classPattern` |
| **Situação associativa** | Status do associado na ASOF: `ativo`, `inativo` | `associationStatus` |
| **Situação funcional** | Status no serviço público: `ativo`, `aposentado`, `cedido`, `em_licenca` | `functionalStatus` |
| **SIAPE** | Número de matrícula do servidor federal | `siape` |
| **Contribuição** | Status de pagamento da anuidade ASOF: `em_dia`, `inadimplente`, `pendente_migracao` | `contributionStatus` |

## Roles do sistema

| Role DB | Quem é |
|---|---|
| `admin` | Coordenador administrativo da ASOF (equipe interna) |
| `diretoria` | Membros da Diretoria Executiva (presidente, VP, diretores) |
| `secretaria` | Auxiliar administrativo / secretaria |

## Contexto geográfico

Associados servem na SERE (Brasília) ou em ~220 postos no exterior. Cerca de 63% estão no exterior. O campo `locationCountry` / `locationCity` indica onde o servidor está lotado. Remoções ocorrem a cada 2–5 anos.

## Dados sensíveis

CPF, SIAPE, email, endereço e dados funcionais são informações protegidas pela LGPD. Não expor em logs, respostas de API públicas ou mensagens de erro.

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

## Database

- `drizzle.config.ts` targets PostgreSQL and writes migrations to `drizzle/postgres`.
- Runtime DB access requires `DATABASE_URL` or `DATABASE_POSTGRES_URL`.
- Drizzle migrations require a direct/non-pooling PostgreSQL URL via `DATABASE_MIGRATION_URL` or `DATABASE_POSTGRES_URL_NON_POOLING`.
- Seed scripts are `scripts/seed-associados.ts` and `scripts/seed-admin.ts`, both run by `npm run db:seed`.

## Development Auth

- Local bypass is controlled by `.env.local` with `SKIP_AUTH=true`.
- When auth is skipped, the development user is read from `DEV_USER_ID`, `DEV_USER_NAME`, `DEV_USER_EMAIL`, `DEV_USER_ROLE`, and `DEV_USER_MUST_CHANGE_PASSWORD`.
- Valid roles are `admin`, `diretoria`, and `secretaria`.

## Testing And Validation

- Vitest runs Node-environment tests matching `src/**/*.test.{ts,tsx}`.
- ESLint uses `eslint-config-next` core web vitals plus TypeScript config.
- After dependency or Next/Tailwind changes, validate with at least `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build` when feasible.

## Gotchas

- This project is on Next.js `16.2.6`; check `node_modules/next/dist/docs/` before changing Next APIs, routing conventions, config, or build behavior.
- Do not downgrade Next.js below the pinned 16.2.6 line; keep RSC security fixes current when updating framework versions.
- `next.config.ts` pins `turbopack.root` to this directory for explicit Turbopack checks. This was added because a prior real-project dev test resolved Tailwind from the parent project directory instead of this app directory.
- The machine previously showed heavy memory pressure from `next dev` PostCSS/Tailwind workers on an 8 GB MacBook Air. Prefer controlled dev-server tests with `scripts/run-dev-60s.sh` when diagnosing freezes.
