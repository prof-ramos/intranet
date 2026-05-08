# ASOF Intranet

Intranet administrativa da ASOF, construída com Next.js App Router, TypeScript, DaisyUI, Drizzle ORM e SQLite/libSQL.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run dev` uses Webpack by default because this project previously reproduced a Next 16/Turbopack/Tailwind resolution issue on the local machine. Turbopack remains available only when explicitly requested:

```bash
npm run dev:turbo
npm run build:turbo
```

## Auth For Local Development

`.env.local` controls the development auth bypass:

```bash
SKIP_AUTH=true
DEV_USER_ID=1
DEV_USER_NAME="ASOF Dev User"
DEV_USER_EMAIL=dev@asof.local
DEV_USER_ROLE=admin
DEV_USER_MUST_CHANGE_PASSWORD=false
```

Valid roles are `admin`, `diretoria`, and `secretaria`.

## Common Commands

```bash
npm run lint
npm run test
npm run build
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the current project structure, data flow, known debts, and scaling notes.

## Diagnostics

Use the controlled wrapper when validating dev-server runtime behavior:

```bash
DURATION_SECONDS=60 PORT=3010 LOG_FILE=next-dev-webpack-60s.log scripts/run-dev-60s.sh
```

It starts `npm run dev`, samples process state, curls the app, and shuts down the process tree.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
