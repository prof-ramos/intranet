# ADR 004: Politica Do Primeiro Go-Live De Producao

Status: accepted

## Decisao

O primeiro go-live usa um PostgreSQL gerenciado novo e limpo, migrado a partir do baseline Drizzle do repo. Deploy e migrations de producao continuam manuais e exigem checklist, snapshot/backup, janela aprovada e rollback documentado.

Previews e staging devem usar bancos separados. Nenhum preview deve apontar para o banco de producao.

## Opcoes Rejeitadas

- Reconciliar bancos antigos investigados: rejeitado por drift e ausencia de producao real.
- Automatizar migrations em merge para `main`: rejeitado para a estreia.
- Manter entrega em tempo real como gate: rejeitado; notificacao persistida basta para o dia 1.
- Exigir RLS como gate: rejeitado; a barreira do dia 1 e app server + usuario PostgreSQL restrito.

## Consequencias

- `npm run db:migrate` passa por `scripts/guarded-migrate.ts`.
- `ALLOW_PRODUCTION_MIGRATIONS=true` so deve ser usado depois de snapshot/backup, janela operacional e rollback documentado.
- O smoke de go-live mede login, dados e fluxos da aplicacao, nao recursos de plataforma removidos do caminho critico.
