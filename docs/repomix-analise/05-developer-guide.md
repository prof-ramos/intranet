# Guia do Desenvolvedor

> Base: `repomix-output.xml` gerado em 2026-05-08.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- DaisyUI 5
- Drizzle ORM
- SQLite/libSQL
- JWT com `jose`
- Vitest

## Setup local

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

O projeto usa `npm` por padrão porque há `package-lock.json`. Não usar `pnpm` ou `yarn` neste repo sem trocar deliberadamente o lockfile.

## Variáveis de ambiente

Principais variáveis:

- `DATABASE_URL`: URL do banco. Padrão runtime: `file:sqlite.db`.
- `DATABASE_AUTH_TOKEN`: token opcional para libSQL remoto.
- `SESSION_SECRET`: obrigatório fora do bypass; mínimo 32 caracteres.
- `SKIP_AUTH`: habilita bypass local quando `true`.
- `DEV_USER_ID`, `DEV_USER_NAME`, `DEV_USER_EMAIL`, `DEV_USER_ROLE`, `DEV_USER_MUST_CHANGE_PASSWORD`: usuário local quando `SKIP_AUTH=true`.
- `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`: seed do admin inicial.

## Estrutura do projeto

- `src/app`: rotas App Router.
- `src/app/app`: área autenticada da intranet.
- `src/app/login`: tela e action de login.
- `src/components`: componentes compartilhados de navegação e UI.
- `src/lib/auth`: sessão, configuração de auth, roles e guards.
- `src/lib/db`: cliente Drizzle/libSQL.
- `src/lib/db/schema`: schemas Drizzle.
- `drizzle`: migrações geradas.
- `scripts`: seed, checagem de banco e diagnóstico de dev server.
- `docs`: documentação funcional e técnica.

## Fluxo de desenvolvimento

1. Criar ou atualizar schema em `src/lib/db/schema`.
2. Gerar migração com `npm run db:generate`.
3. Aplicar com `npm run db:migrate`.
4. Implementar páginas/actions.
5. Rodar `npm run lint`.
6. Rodar `npm run test`.
7. Rodar `npm run build` quando a mudança tocar Next, Tailwind, auth, banco ou rotas.

## Autenticação local

Para desenvolvimento, `.env.local` pode usar:

```env
SKIP_AUTH=true
DEV_USER_ROLE=admin
```

O `proxy.ts` permite bypass somente fora de produção. Em produção, sessão real é obrigatória.

## Banco de dados

O runtime usa `src/lib/db/index.ts` com `@libsql/client` e Drizzle. O config de migração usa SQLite e remove o prefixo `file:` para `drizzle-kit`.

Cuidados:

- Não commitar `sqlite.db`.
- Não expor CPF, SIAPE, telefone, email, endereço ou notas em logs.
- Preferir seleção explícita de colunas em telas e exportações.

## Testes

Vitest está configurado com:

- `environment: 'node'`
- `include: ['src/**/*.test.{ts,tsx}']`
- alias `@` para `src`.

Testes existentes:

- Smoke test.
- Testes de configuração de auth.

Lacunas recomendadas:

- Testes de validação de login.
- Testes de sessão JWT/cookie.
- Testes de guard de role quando implementado.
- Testes de parsing de `searchParams`.
- Testes de queries de dashboard com banco temporário.

## Troubleshooting

### `npm run dev` pesado ou travando

Usar:

```bash
scripts/run-dev-60s.sh
```

Esse wrapper evita deixar processos pendurados e grava diagnóstico em `next-dev-60s.log`.

### Erro de `SESSION_SECRET`

Definir uma string com pelo menos 32 caracteres:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Rotas autenticadas redirecionando para login

Verificar:

- `SKIP_AUTH=true` em `.env.local` para desenvolvimento.
- `SESSION_SECRET` definido quando bypass estiver desligado.
- Admin ativo no banco.

### Problemas com Tailwind/Turbopack

O projeto usa `next dev --webpack` por padrão. `dev:turbo` e `build:turbo` devem ser tratados como checks explícitos, não caminho normal.
