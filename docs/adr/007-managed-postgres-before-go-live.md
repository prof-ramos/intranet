# ADR 007: PostgreSQL Gerenciado Antes do Go-Live

Status: accepted

Antes da primeira estreia em producao, a intranet ASOF adotara um PostgreSQL gerenciado novo como banco canonico. O banco inicial deve ser limpo e receber o baseline Drizzle do repo; bancos investigados anteriormente nao serao usados como fonte canonica de dados ou schema por causa de drift, historico parcial e ausencia de producao real.

## Decisao

- Usar PostgreSQL gerenciado novo, preferencialmente Neon Postgres via Vercel Marketplace.
- Mapear explicitamente envs de runtime e migration: `DATABASE_URL` para conexao pooled/runtime e `DATABASE_MIGRATION_URL` para conexao direta/unpooled.
- Criar uma linha de migrations/baseline limpa para PostgreSQL gerenciado, derivada do schema Drizzle canonico atual, sem depender de roles, policies, publications ou artefatos de plataforma externa.
- Usar autenticacao server-side propria baseada em `admins.password_hash`, cookie httpOnly assinado e `SESSION_SECRET`.
- Tornar o seed inicial de administrador Postgres-only: `INITIAL_ADMIN_EMAIL` + `INITIAL_ADMIN_PASSWORD` gravam ou atualizam `admins.password_hash`, role `admin`, `is_active=true` e `must_change_password=true`, sem sincronizar usuario em provedor externo.
- Tratar Notificacao como alerta persistido; entrega em tempo real deixa de ser gate de go-live.
- Manter Documentos/Storage fora desta migracao principal. Se Documentos for obrigatorio depois, escolher storage de objetos privado como frente separada.
- Remover RLS do caminho critico do go-live em PostgreSQL gerenciado; a fronteira de seguranca do dia 1 e app server + usuario PostgreSQL runtime restrito + auditoria/mascaramento/criptografia LGPD.
  - O usuário runtime deve ter permissões restritas: grants mínimos apenas de SELECT/INSERT/UPDATE/DELETE nos schemas/tabelas da aplicação.
  - Proibido uso de permissões DDL (CREATE/ALTER/DROP), SUPERUSER, REPLICATION ou BYPASSRLS.
  - Negado o acesso a pg_catalog e schemas sensíveis, com `search_path` restrito aos schemas do app, exigindo Least Privilege via roles.
  - Para as migrações, deve existir uma role separada de migração que recebe permissões temporárias de DDL e owner do schema e não deve ser usada no runtime.
  - Rotação/revogação dessas credenciais devem ser acompanhadas de controles mandatórios de log, auditoria e mascaramento.

## Consequencias

- O go-live passa a depender de um banco PostgreSQL limpo, controlado por migrations do repo, em vez de reconciliar bancos divergentes.
- A validacao de banco antes do go-live deve provar que o baseline limpo aplica em um PostgreSQL vazio. A compatibilidade com migrations historicas nao e criterio bloqueante para a estreia.
- Previews/staging devem usar branches ou bancos separados, nunca o banco de producao.
- Segredos expostos durante a investigacao devem ser tratados como comprometidos e rotacionados de acordo com as regras estabelecidas em `TODO-PROD.md` (veja a seção referente a entropia de segredos); o novo caminho nao deve reutiliza-los.
- RLS pode voltar depois como hardening com contexto de sessao (`SET LOCAL app.user_id`, `SET LOCAL app.role`), mas nao deve bloquear a estreia.
