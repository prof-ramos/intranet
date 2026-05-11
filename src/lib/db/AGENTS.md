# src/lib/db — Acesso ao Banco de Dados (Drizzle + PostgreSQL)

Instância Drizzle ORM e definições de schema para o PostgreSQL self-hosted (desenvolvimento) e Supabase (staging/produção).

## Arquivos

- `index.ts` — cria e exporta a instância `db` usando `DATABASE_URL` ou `DATABASE_POSTGRES_URL`.
- `schema/` — definições de tabelas e enums (Drizzle schema). Ver `src/lib/db/schema/AGENTS.md`.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Runtime (pooler Supabase em prod; direto em dev local) |
| `DATABASE_POSTGRES_URL` | Alternativa a `DATABASE_URL` |
| `DATABASE_MIGRATION_URL` | URL direta (non-pooling) para `drizzle-kit migrate` |
| `DATABASE_POSTGRES_URL_NON_POOLING` | Alternativa a `DATABASE_MIGRATION_URL` |

## Regras

- Nunca importar `db` em Client Components ou em `src/lib/auth/` diretamente; passar dados como props ou via Server Actions.
- Para dev local, usar `postgres://$USER@localhost:5432/asof_intranet` (role macOS do usuário, não `postgres`).
- Migrations ficam em `drizzle/postgres/`; gerar com `npm run db:generate` e aplicar com `npm run db:migrate`.
- O arquivo `drizzle.config.ts` na raiz controla dialect e output path — não alterar sem testar `npm run test:db`.
- Nunca usar `db.execute(sql\`DROP TABLE...\`)` em código de aplicação; apenas em scripts de migração versionados.
