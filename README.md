# ASOF Intranet

Sistema interno da [ASOF](https://asof.org.br) — Associação dos Oficiais de Chancelaria do Ministério das Relações Exteriores do Brasil. Gerencia associados, atividades administrativas e comunicações internas da diretoria.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · DaisyUI 5 · Drizzle ORM · SQLite/libSQL · JWT (jose)

---

## Pré-requisitos

- Node.js 20+
- npm (não pnpm, não yarn — o lockfile é `package-lock.json`)

---

## Início rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# edite .env.local conforme a seção abaixo

# 3. Criar e migrar o banco
npm run db:migrate

# 4. Popular com dados iniciais
npm run db:seed

# 5. Subir o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Variáveis de ambiente

### Obrigatórias em produção

| Variável | Descrição |
|---|---|
| `SESSION_SECRET` | Segredo JWT — mínimo 32 caracteres. Gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `DATABASE_URL` | URL do banco. SQLite local: `file:sqlite.db`. Turso Cloud: `libsql://<host>` |
| `DATABASE_AUTH_TOKEN` | Token de autenticação Turso (obrigatório quando `DATABASE_URL` usa `libsql://`) |

### Seed do admin inicial

| Variável | Padrão | Descrição |
|---|---|---|
| `INITIAL_ADMIN_EMAIL` | `gabriel@asof.org.br` | Email do primeiro admin |
| `INITIAL_ADMIN_PASSWORD` | — | Obrigatória. Deve ter pelo menos 12 caracteres e combinar maiúsculas, minúsculas, números e símbolos |

### Bypass de autenticação (apenas desenvolvimento)

| Variável | Valor | Descrição |
|---|---|---|
| `SKIP_AUTH` | `true` | Desativa JWT e usa o usuário de dev abaixo |
| `DEV_USER_ID` | `1` | ID do usuário simulado |
| `DEV_USER_NAME` | `ASOF Dev User` | Nome exibido na sidebar |
| `DEV_USER_EMAIL` | `dev@asof.local` | — |
| `DEV_USER_ROLE` | `admin` | `admin` \| `diretoria` \| `secretaria` |
| `DEV_USER_MUST_CHANGE_PASSWORD` | `false` | Simula fluxo de troca de senha |

> `SKIP_AUTH=true` é **ignorado em `NODE_ENV=production`** — o proxy rejeita a flag mesmo que esteja definida.

---

## Banco de dados

O projeto usa SQLite local por padrão (`sqlite.db` na raiz). Para produção, use [Turso](https://turso.tech) (libSQL compatível).

```bash
npm run db:generate   # gera migrações a partir do schema
npm run db:migrate    # aplica migrações pendentes
npm run db:seed       # insere admin inicial + associados de exemplo
npm run db:studio     # abre Drizzle Studio no browser
```

As migrações ficam em `drizzle/`. O schema está em `src/lib/db/schema/`.

---

## Comandos

```bash
npm run dev           # servidor de desenvolvimento (Webpack)
npm run dev:turbo     # servidor de desenvolvimento (Turbopack — diagnóstico)
npm run build         # build de produção (Webpack)
npm run build:turbo   # build de produção (Turbopack — diagnóstico)
npm run lint          # ESLint
npm run typecheck     # TypeScript sem emitir arquivos
npm run format:check  # valida formatação
npm run test          # Vitest (testes unitários/integração)
npm run audit         # npm audit
```

> `npm run dev` usa Webpack por padrão. O projeto reproduziu um problema de resolução do Tailwind no Turbopack em máquinas com 8 GB RAM — Turbopack está disponível mas é tratado como modo de diagnóstico explícito.

---

## Estrutura

```
src/
  app/
    app/          # área autenticada (/app/*)
    login/        # página e actions de autenticação
    layout.tsx    # layout raiz (fontes, tema)
  components/     # componentes compartilhados (Sidebar, NavLink…)
  lib/
    auth/         # session JWT, requireAuth, config
    db/           # cliente Drizzle + schema

proxy.ts          # proxy de autenticação (Next.js 16 — substitui middleware.ts)
drizzle/          # migrações SQL geradas
scripts/          # seed-admin.ts, seed-associados.ts, check-db.ts
```

Detalhes de arquitetura, fluxo de dados e decisões técnicas: [`ARCHITECTURE.md`](./ARCHITECTURE.md).
Design system, tokens de cor e tipografia: [`DESIGN.md`](./DESIGN.md).
Contexto institucional e vocabulário do domínio: [`AGENTS.md`](./AGENTS.md).
