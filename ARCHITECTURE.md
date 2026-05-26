# Arquitetura

Atualizado em 2026-05-26 para refletir o reset da camada de banco/autenticacao.

## Visao Geral

A intranet ASOF e uma aplicacao Next.js 16 App Router, server-side, com Drizzle ORM e PostgreSQL gerenciado. O repo atual e a fonte canonica de dominio, schema e UI.

## Modulos De Dominio

- `src/app/app/associados` e `src/lib/associates`: associados, lotacao/posto, situacao funcional, situacao associativa e contribuicao.
- `src/app/app/atividades` e `src/lib/activities`: board administrativo, responsaveis, prioridades e prazos.
- `src/app/app/financeiro` e `src/lib/finance`: mensalidades e status de pagamento.
- `src/app/app/juridico` e `src/lib/juridico`: consultas, processos, notas e SLA.
- `src/app/app/secretaria/oficios` e `src/lib/oficios`: oficios, rich text e PDF.
- `src/app/app/notifications` e `src/lib/notifications`: alertas persistidos.
- `src/app/app/config`: usuarios, lotacoes, auditoria, API keys e webhooks outbound.

## Banco

- Schema Drizzle: `src/lib/db/schema`.
- Baseline limpo: `drizzle/postgres/0000_green_glorian.sql`.
- Runtime: `DATABASE_URL`.
- Migrations: `DATABASE_MIGRATION_URL`.
- Guardrail: `scripts/guarded-migrate.ts`.

O baseline nao depende de roles, policies, publications ou recursos de plataforma externa. RLS pode voltar depois como hardening, mas nao bloqueia a estreia.

## Autenticacao

- Login valida `admins.email` + `admins.password_hash` com `bcryptjs`.
- Sessao usa cookie `httpOnly` assinado por `SESSION_SECRET`.
- `requireAuth()` revalida o admin no banco.
- `requireRole()` controla autorizacao por `admin`, `diretoria` e `secretaria`.
- `SKIP_AUTH=true` existe apenas para desenvolvimento e e ignorado em producao.

## Notificacoes

Notificacoes sao registros persistidos. O cliente carrega via Server Actions e atualiza periodicamente. Entrega em tempo real nao faz parte do caminho critico do go-live.

## Documentos E Storage

Metadados de documentos permanecem no PostgreSQL. Arquivos fisicos devem usar storage de objetos privado quando o modulo for ativado operacionalmente. O provedor ainda nao e parte do baseline.

## LGPD

- Dados sensiveis passam por mascaramento, criptografia e indices cegos onde aplicavel.
- Logs devem usar `src/lib/logger.ts` e `src/lib/sanitize-pii.ts`.
- Senhas temporarias, cookies, tokens e segredos nunca devem ser persistidos em logs ou auditoria.

## Deploy

1. Provisionar PostgreSQL gerenciado novo.
2. Configurar envs obrigatorias.
3. Aplicar baseline com snapshot/backup e janela aprovada.
4. Rodar seed inicial.
5. Validar gates e smoke manual.

Detalhes operacionais ficam em `docs/runbook.md`; pendencias ficam em `TODO-PROD.md`.
