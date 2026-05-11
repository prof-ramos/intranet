# src/lib — Bibliotecas e Utilitários Compartilhados

Todo código de negócio, acesso a dados, autenticação e validação que não é específico de uma rota vive aqui. Importado via alias `@/lib/*`.

## Sub-módulos

| Diretório | Responsabilidade |
|---|---|
| `auth/` | Sessão, autenticação, autorização, rate-limit de login, validação de senha |
| `db/` | Instância Drizzle, schema, migrações |
| `validation/` | Schemas Zod compartilhados entre Server Actions |
| `activities/` | Queries e lógica de negócio do módulo de Atividades |
| `associates/` | Queries e lógica de negócio do módulo de Associados |
| `juridico/` | Queries e lógica de negócio do módulo Jurídico |
| `dashboard/` | Queries agregadas para o dashboard |
| `reports/` | Geração de relatórios (CSV, etc.) |
| `lgpd/` | Utilitários de anonimização e conformidade LGPD |
| `supabase/` | Cliente Supabase (usado para staging/produção) |
| `ui/` | Helpers de UI (formatação de datas, moeda, etc.) |

## Convenções

- Toda lógica de negócio deve ter testes em `*.test.ts` no mesmo diretório.
- Não importar de `src/app/` a partir de `src/lib/`; o fluxo de dependência é unidirecional: `app → lib`.
- Não usar `next/headers`, `next/navigation` ou APIs de servidor Next.js dentro de `src/lib/`; essas dependências pertencem às Server Actions em `src/app/`.
