<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Notes

## Tooling

- Use `npm` for this project; it has `package-lock.json` and no `pnpm-lock.yaml` or `yarn.lock`.
- For Python work in this repository, use `uv` by default: `uv run`, `uv add`, and `uv sync`.
- Use Context7 for current library, framework, SDK, API, CLI, or cloud-service documentation before writing setup/configuration/code that depends on docs.

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
- Drizzle migrations are in `drizzle`; the local SQLite file is `sqlite.db`.
- The `@/*` import alias maps to `src/*`.

## Database

- `drizzle.config.ts` targets SQLite and writes migrations to `drizzle`.
- Runtime DB access uses `DATABASE_URL` when set, otherwise `file:sqlite.db`.
- Seed scripts are `scripts/seed-associados.ts` and `scripts/seed-admin.ts`, both run by `npm run db:seed`.

## Development Auth

- Local bypass is controlled by `.env.local` with `SKIP_AUTH=true`.
- When auth is skipped, the development user is read from `DEV_USER_ID`, `DEV_USER_NAME`, `DEV_USER_EMAIL`, `DEV_USER_ROLE`, and `DEV_USER_MUST_CHANGE_PASSWORD`.
- Valid roles are `admin`, `diretoria`, and `secretaria`.

## Testing And Validation

- Vitest runs Node-environment tests matching `src/**/*.test.{ts,tsx}`.
- ESLint uses `eslint-config-next` core web vitals plus TypeScript config.
- After dependency or Next/Tailwind changes, validate with at least `npm run lint`, `npm run test`, and `npm run build` when feasible.

## Gotchas

- This project is on Next.js `16.2.6`; check `node_modules/next/dist/docs/` before changing Next APIs, routing conventions, config, or build behavior.
- `next.config.ts` pins `turbopack.root` to this directory for explicit Turbopack checks. This was added because a prior real-project dev test resolved Tailwind from `/Users/gabrielramos/projetos/ASOF` instead of this app directory.
- The machine previously showed heavy memory pressure from `next dev` PostCSS/Tailwind workers on an 8 GB MacBook Air. Prefer controlled dev-server tests with `scripts/run-dev-60s.sh` when diagnosing freezes.
