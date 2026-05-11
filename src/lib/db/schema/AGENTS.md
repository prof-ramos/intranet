# src/lib/db/schema — Drizzle Schema (PostgreSQL)

Definições de todas as tabelas e enums do banco. Cada arquivo exporta o objeto da tabela e os tipos `infer`idos.

## Tabelas

| Arquivo | Tabela | Descrição |
|---|---|---|
| `admins.ts` | `admins` | Usuários do sistema (admin, diretoria, secretaria) |
| `associates.ts` | `associates` | Cadastro de associados ASOF (~763 registros) |
| `activities.ts` | `activities` | Atividades do Kanban |
| `audit.ts` | `audit_logs` | Log imutável de auditoria |
| `login-attempts.ts` | `login_attempts` | Rate-limit de tentativas de login |
| `rate-limits.ts` | `rate_limits` | Rate-limit genérico para outras ações |
| `legal-consultations.ts` | `legal_consultations` | Consultas jurídicas |
| `legal-processes.ts` | `legal_processes` | Processos jurídicos |
| `legal-opinions.ts` | `legal_opinions` | Pareceres vinculados a consultas |
| `legal-notes.ts` | `legal_notes` | Anotações internas do módulo jurídico |
| `index.ts` | — | Re-exporta todos os schemas |

## Enums

| Enum | Valores |
|---|---|
| `adminRole` | `admin`, `diretoria`, `secretaria` |
| `auditEntityType` | `associate`, `admin`, `activity`, `legal_consultation`, `legal_process` |

## Regras críticas

- Toda alteração de schema **deve** gerar uma migration: `npm run db:generate`.
- Nunca editar arquivos em `drizzle/postgres/` manualmente; deixar o Drizzle Kit gerar.
- Não adicionar colunas `NOT NULL` sem `DEFAULT` em tabelas existentes com dados — causará falha na migration.
- O campo `passwordHash` em `admins` nunca deve aparecer em queries de listagem (`select`); usar `.omit({ passwordHash: true })` ou select explícito de campos necessários.
- `audit_logs` é append-only: nunca fazer `UPDATE` ou `DELETE` nessa tabela.
