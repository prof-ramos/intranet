# TODO-PROD

Checklist canonica de go-live da intranet ASOF.

Atualizado em 2026-05-26 apos decisao de resetar a camada de banco/autenticacao para PostgreSQL gerenciado limpo, com baseline Drizzle novo e auth propria.

## Decisao Atual

- Banco de producao: PostgreSQL gerenciado novo, inicialmente limpo.
- Fonte canonica de schema: `src/lib/db/schema` + baseline em `drizzle/postgres/0000_green_glorian.sql`.
- Auth: server-side propria, `admins.password_hash`, cookie `httpOnly` assinado por `SESSION_SECRET`, `requireAuth()` e `requireRole()`.
- Seed inicial: `INITIAL_ADMIN_EMAIL` + `INITIAL_ADMIN_PASSWORD`, sempre com `must_change_password=true`.
- Notificacao: alerta persistido. Entrega em tempo real nao bloqueia o go-live.
- Documentos/storage: fora do caminho critico ate escolha separada de storage de objetos privado.
- RLS: fora do gate do dia 1; a barreira de seguranca e app server + credenciais PostgreSQL restritas + LGPD.

## Bloqueantes

- [ ] Provisionar PostgreSQL gerenciado novo.
- [ ] Configurar `DATABASE_URL`, `DATABASE_MIGRATION_URL`, `SESSION_SECRET`, `ENCRYPTION_MASTER_KEY`, `CRON_SECRET`, `TRUSTED_PROXY_COUNT=1` e `ASOF_INTEGRATIONS_ENABLED=false` no ambiente alvo.
- [ ] Confirmar rotação e configuração de segredos robustos no ambiente alvo: recriar `SESSION_SECRET`, `ENCRYPTION_MASTER_KEY` e demais chaves exigindo entropia segura (ex: no mínimo 32 bytes (64 hexadecimal characters)) e adicionar verificação no CI contra vazamento/valores default.
- [ ] Aplicar baseline em banco vazio:
  - `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate`
  - [ ] Remover `ALLOW_PRODUCTION_MIGRATIONS` do ambiente de produção após validação do baseline. (Limpar a flag imediatamente após confirmação do sucesso).
- [ ] Rodar seed inicial:
  - `npm run db:seed`
- [ ] Validar login do admin inicial e troca obrigatoria de senha.
- [ ] Rodar gates locais:
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npm run test:db`
  - `npm run build`
- [ ] Fazer smoke manual em staging/final:
  - login, dashboard, associados, atividades, juridico, oficios, financeiro, auditoria, reset de senha e notificacoes persistidas.
- [ ] Validar crons com `CRON_SECRET` antes de ativar operacao.
- [ ] Confirmar que previews/staging nao apontam para banco de producao.

## Recomendado Antes Do Go-Live

- [ ] Definir provider de storage se módulo Documentos for necessário no dia 1.
- [ ] Rodar `npm audit`.
- [ ] Rodar E2E local/staging quando o banco final estiver disponivel.
- [ ] Registrar plano de rollback: restaurar snapshot do banco novo ou fazer forward-fix; nao usar projetos antigos como rollback.
- [ ] Registrar owners de incidentes para app, banco, Vercel, Mailjet, DNS e LGPD.

## Evidencia Desta Frente

- Removidos helpers/scripts operacionais de Auth externa, entrega em tempo real externa e storage externo.
- Criado baseline unico `drizzle/postgres/0000_green_glorian.sql`.
- `npm run typecheck` passou apos a troca para auth propria.

Este arquivo substitui as pendencias antigas de smoke de tempo real e reconciliacao de projetos de banco. Elas nao sao mais caminho de go-live.
