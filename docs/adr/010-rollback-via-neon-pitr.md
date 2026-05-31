# ADR 010: Rollback Do Dia 1 Via Neon PITR + Branch De Restauracao

Status: accepted
Data: 2026-05-26

## Contexto

O ADR 007 fixou que o rollback do primeiro go-live se faz por snapshot do banco novo ou forward-fix, sem reusar projetos antigos. O ADR 009 exige snapshot Neon imediatamente antes da janela de smoke. Faltava definir mecanismo concreto, gatilho objetivo de acionamento e o destino da auditoria/admin inicial caso o rollback seja executado.

## Decisao

**Mecanismo primario**: Neon Point-in-Time Recovery (PITR) + branch de restauracao.

**Pre-janela (checklist):**

1. Confirmar que o projeto Neon `intranet-db` (`ep-empty-cake-ac26vl6w`) esta em um tier cujo `history_retention` cobre a janela de smoke (minimo: 6h - plano Free aceitavel).
2. Anotar o timestamp UTC e, quando possivel, o LSN Neon imediatamente antes do primeiro passo do smoke. Registrar em `TODO-PROD.md` ou no runbook da janela.
3. Validar que o admin inicial ja existe e ja trocou a senha **antes** desse timestamp, de modo que o ponto de retorno preserve um admin operavel sem necessidade de re-seed.

**Gatilho de rollback durante a janela:**

Disparar rollback se qualquer um dos abaixo ocorrer **sem mitigacao em ate 30 minutos**:

- Falha em login do admin ou em `requireAuth()`/`requireRole()` em rotas criticas.
- Falha em escrita ou leitura nos fluxos criticos do smoke: associados, mensalidades, oficios, juridico, atividades.
- Falha de registro em `audit_log` ou em notificacoes persistidas.
- Falha de execucao do cron com `CRON_SECRET`.
- Corrupcao de dados detectada (ex.: violacao de unicidade, mistura de PII, status inconsistente).

Falhas cosmeticas ou de fluxos nao criticos seguem para forward-fix, nao para rollback.

**Execucao do rollback:**

1. Criar branch Neon a partir do timestamp/LSN pre-janela: `neon branches create --parent main --timestamp <ts>` (via Neon CLI ou console).
2. Repontar `DATABASE_URL` (pooled) e `DATABASE_MIGRATION_URL` (direct) no Vercel producao para as URLs do branch restaurado, via Vercel API.
3. Redeploy producao para a versao anterior conhecida boa (ou manter a versao atual se o defeito foi de dados, nao de codigo).
4. Congelar o branch `main` Neon original para forense; nao apagar.
5. Reabrir janela apenas apos novo checklist completo.

**Auditoria e admin:** PITR e fiel ao momento; o registro de auditoria e o admin inicial (com senha trocada) sobrevivem no branch restaurado. O smoke posterior ao timestamp e perdido por construcao, o que e desejavel.

## Opcoes Rejeitadas

- **`pg_dump`/`pg_restore` manual como mecanismo primario**: lento (minutos a dezenas de minutos), exige role com permissoes que o ADR 007 restringe no runtime, e arrisca apagar admin/auditoria caso o dump seja anterior a esses passos. Aceitavel apenas como cinto-e-suspensorio opcional, sob demanda, **alem** do PITR.
- **Forward-fix only sem rollback de dados**: rejeitado. Aceitavel apenas porque o banco esta vazio, mas remove a rede de seguranca que justifica fazer smoke em producao (ADR 009) e nao cobre corrupcao de dados durante a janela.

## Consequencias

- O item de rollback em `TODO-PROD.md` deixa de ser "a registrar" e passa a referenciar este ADR.
- A janela de smoke (ADR 009) ganha um pre-checklist explicito de timestamp/LSN.
- Owners de incidente (item proximo do checklist) precisam incluir owner de banco com acesso ao console Neon e ao Vercel para repontar envs.
- Pos-estreia, vale avaliar automatizar a anotacao do timestamp e o repointer de envs.
