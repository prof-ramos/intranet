# Politica do primeiro go-live de producao

Status: accepted

Para o primeiro go-live, producao usa o Supabase `uftzjmmfkoqhjjwsiynk` (`db-intranet`), staging/preview deve apontar para um Supabase separado, e migrations/deploy de producao sao manuais depois de checklist, backup/snapshot e smoke test. A decisao evita que previews, merges em `main` ou automacoes imaturas alterem banco de producao enquanto ainda ha risco operacional em RLS, drift de schema, Vercel project settings e dados LGPD.

## Considered Options

- Usar o mesmo Supabase para preview e producao: rejeitado por risco de contaminar dados reais e confundir migrations.
- Automatizar deploy/migrations em `main`: rejeitado para o primeiro ciclo porque o projeto ainda precisa de validacao manual de banco, Vercel e rollback.
- Bloquear go-live por RLS restritiva por papel/sessao: rejeitado para o primeiro ciclo desde que RLS esteja habilitado/forcado no remoto correto e nenhuma tabela sensivel seja exposta diretamente via Data API/browser.

## Consequences

O escopo bloqueante do dia 1 fica em login, dashboard, associados, juridico e oficios. Financeiro so bloqueia se houver dependencia operacional imediata. Integracoes/webhooks e notificacoes realtime nao sao obrigatorios no dia 1; a aplicacao deve operar sem depender de cron, destinos externos, auth M2M ou Supabase Realtime.
