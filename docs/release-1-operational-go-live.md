# Release 1.0 Operational Go-Live Runbook

Status: draft operacional. Este documento prepara a janela de go-live; itens que dependem de execucao manual externa so ficam concluidos quando a evidencia da janela for preenchida fora do Git, sem secrets.

## Escopo

- Ambiente alvo: producao Vercel da intranet ASOF.
- Banco canonico: Neon Postgres do projeto `intranet-db`.
- Autenticacao: server-side propria, cookie `httpOnly` assinado e admin com `must_change_password`.
- Fora do escopo: Papra/DMS, Supabase Auth, Supabase Storage, Supabase Realtime, features novas e endpoints inbound publicos novos.
- Premissa de integracoes: manter `ASOF_INTEGRATIONS_ENABLED=false` no primeiro go-live, salvo decisao operacional separada registrada antes da janela.

## Estrutura Esperada Na VPS

O backup Nivel 1 pode rodar em uma VPS operacional sem depender do codigo da aplicacao em producao. Estrutura recomendada:

```text
/opt/asof-intranet/
  current/                 # checkout ou pacote operacional somente leitura
  scripts/backup-neon-level1.sh
/opt/intranet-backup/      # dumps .sql.gz e .sha256, permissao 700
/etc/asof-intranet/
  backup.env               # env externo ao Git, permissao 600
/var/log/asof-intranet/
  backup-neon-level1.log   # logs sem valores de secrets
```

`/etc/asof-intranet/backup.env` deve conter nomes de variaveis, nunca entrar no Git e nunca ser impresso:

```bash
DATABASE_BACKUP_URL=postgres://...
BACKUP_DIR=/opt/intranet-backup
RETENTION_DAYS=14
```

Use uma URL direta dedicada a backup quando possivel. Nao use `DATABASE_URL` pooled da aplicacao para backup. Nao copie valores reais para issue, PR, chat, shell history compartilhado ou arquivo versionado.

## Backup Nivel 1 Neon/PostgreSQL

Script: `scripts/backup-neon-level1.sh`.

Garantias do script:

- usa `pg_dump --no-owner --no-privileges --format=plain`;
- comprime para `asof-intranet-<timestamp UTC>.sql.gz`;
- valida o arquivo com `gzip -t`;
- grava checksum SHA256 em arquivo `.sha256`;
- nao imprime `DATABASE_BACKUP_URL`;
- aplica retencao por `RETENTION_DAYS`;
- remove apenas arquivos `asof-intranet-*.sql.gz` e `asof-intranet-*.sql.gz.sha256` dentro de `BACKUP_DIR`;
- recusa `BACKUP_DIR=/`.

Execucao manual:

```bash
set -a
. /etc/asof-intranet/backup.env
set +a
/opt/asof-intranet/current/scripts/backup-neon-level1.sh
```

Validacao segura sem banco real:

```bash
DATABASE_BACKUP_URL=postgres://placeholder.invalid/db DRY_RUN=true BACKUP_DIR=/tmp/asof-intranet-backup-dry-run RETENTION_DAYS=14 scripts/backup-neon-level1.sh
```

Cron sugerido na VPS:

```cron
17 2 * * * . /etc/asof-intranet/backup.env; /opt/asof-intranet/current/scripts/backup-neon-level1.sh >> /var/log/asof-intranet/backup-neon-level1.log 2>&1
```

Evidencia minima de cada backup:

- data/hora UTC da execucao;
- nome do arquivo `.sql.gz`;
- resultado de `gzip -t`;
- checksum SHA256;
- tamanho do arquivo;
- retencao aplicada conforme `RETENTION_DAYS`;
- ausencia de secrets nos logs.

## Restore Manual Em Banco De Teste

Nunca restaure sobre producao. O banco restaurado contem dados sensiveis e deve ter o mesmo tratamento LGPD de producao: acesso minimo, sem exports, sem logs de PII e descarte ao final da validacao.

Procedimento:

1. Criar um banco ou branch Neon de teste, separado de producao.
2. Definir uma URL direta de restore em variavel local fora do Git, por exemplo `RESTORE_DATABASE_URL`.
3. Validar o artefato antes de restaurar:

```bash
gzip -t /opt/intranet-backup/asof-intranet-YYYYMMDDTHHMMSSZ.sql.gz
cd /opt/intranet-backup
shasum -a 256 -c asof-intranet-YYYYMMDDTHHMMSSZ.sql.gz.sha256
```

4. Restaurar somente no banco de teste:

```bash
gunzip -c /opt/intranet-backup/asof-intranet-YYYYMMDDTHHMMSSZ.sql.gz | psql "$RESTORE_DATABASE_URL"
```

5. Validar tabelas principais e contagens basicas no banco de teste:

```sql
select current_date as validation_date;
select count(*) as admins from admins;
select count(*) as associates from associates;
select count(*) as activities from activities;
select count(*) as legal_consultations from legal_consultations;
select count(*) as oficios from oficios;
select count(*) as monthly_payments from monthly_payments;
select count(*) as audit_logs from audit_logs;
select count(*) as notifications from notifications;
select count(*) as domain_events from domain_events;
```

Registrar evidencia do restore:

- banco de teste usado;
- arquivo `.sql.gz` usado;
- checksum validado;
- data da validacao;
- contagens por tabela;
- resultado final: aprovado, aprovado com ressalvas ou reprovado;
- data de descarte do banco restaurado.

## Smoke Manual Em Producao

Preencher a evidencia da janela em documento privado ou issue operacional sem secrets. Dados criados no smoke devem usar prefixo `SMOKE_`.

### Pre-Janela

- Confirmar janela aprovada com data, hora UTC, duracao estimada e owner de decisao.
- Confirmar `history_retention` Neon cobrindo janela + 24h.
- Anotar timestamp UTC e, se disponivel, LSN imediatamente antes do smoke.
- Executar snapshot/backup Neon pre-janela:
  - PITR/restore branch conforme ADR 010;
  - backup Nivel 1 via `scripts/backup-neon-level1.sh` quando a URL dedicada estiver disponivel.
- Confirmar ultima versao Vercel conhecida boa para rollback.
- Confirmar que `ASOF_INTEGRATIONS_ENABLED=false` em producao.
- Confirmar que nenhum webhook real sera ativado durante o smoke.

### Passos De Smoke

1. Login admin: entrar em `https://intranet.asof.com.br/login` com o admin operacional.
2. Troca obrigatoria de senha: se `must_change_password=true`, concluir `/change-password` e confirmar redirecionamento para `/app`.
3. Dashboard: abrir `/app` e validar cards, links e ausencia de erro server-side.
4. Associados: criar ou editar registro `SMOKE_ASSOCIADO_<timestamp>`, validar lista, filtros, perfil e exportacao permitida apenas para role autorizada.
5. Atividades: criar atividade `SMOKE_ATIVIDADE_<timestamp>`, mover status no kanban, atribuir responsavel e concluir.
6. Juridico: criar consulta `SMOKE_JURIDICO_<timestamp>`, validar status, prazo/SLA e historico basico.
7. Secretaria/Oficios: criar oficio `SMOKE_OFICIO_<timestamp>`, validar edicao, geracao/download de PDF e cancelamento quando aplicavel.
8. Financeiro: criar ou atualizar mensalidade vinculada ao associado smoke, validar status, metodo de pagamento e auditoria.
9. Auditoria: abrir `/app/config/auditoria` e confirmar entradas dos passos anteriores sem plaintext de senha, token, CPF, SIAPE ou segredo.
10. Notificacoes persistidas: gerar acao que crie notificacao, recarregar a pagina e confirmar persistencia no inbox/lista.
11. Crons com `CRON_SECRET`: validar as duas rotas de `vercel.json` com bearer real somente no terminal operacional, sem imprimir o valor:

```bash
curl --fail --silent --show-error \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://intranet.asof.com.br/api/v1/events/dispatch?limit=1"

curl --fail --silent --show-error \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "https://intranet.asof.com.br/api/v1/juridico/sla-warnings?limit=1"
```

Tambem validar um request sem bearer e registrar apenas o status esperado `401`, sem payload sensivel.

Nao incluir `CRON_SECRET` em shell history, screenshots ou evidencias. Quando possivel, executar em shell operacional com variavel ja carregada de arquivo externo ao Git e registrar apenas rota, status HTTP, `requestId`, horario UTC e resultado resumido.

### Limpeza `SMOKE_*`

Limpar dados criados no smoke antes da liberacao para usuarios finais, preservando auditoria. Executar SQL direto apenas por operador autorizado e somente depois de revisar os IDs afetados.

Padrao recomendado:

```sql
begin;
-- Primeiro listar os IDs candidatos por prefixo SMOKE_*.
-- Depois remover apenas entidades criadas na janela.
-- Nao apagar audit_logs.
rollback;
```

Trocar `rollback` por `commit` somente apos revisar as linhas candidatas. Registrar contagem removida por tabela, sem PII.

### Criterios De Sucesso

- Todos os modulos do smoke abriram e gravaram/leiram dados sem erro critico.
- Login, troca de senha, `requireAuth()` e `requireRole()` funcionaram.
- `audit_logs` recebeu eventos esperados sem secrets ou PII indevida.
- Notificacoes persistiram apos reload.
- Rotas cron retornaram sucesso com bearer e `401` sem bearer.
- Dados `SMOKE_*` foram removidos; auditoria permaneceu.
- Backup pre-janela e ponto de rollback foram registrados.

### Criterios De Falha E Rollback

Acionar rollback conforme ADR 010 se uma falha critica nao for mitigada em ate 30 minutos:

- login/admin/authz indisponivel;
- falha de escrita ou leitura em associados, atividades, juridico, oficios ou financeiro;
- `audit_logs` ou notificacoes persistidas falhando;
- cron com `CRON_SECRET` falhando;
- corrupcao ou mistura de dados detectada.

Rollback:

1. Congelar liberacao para usuarios finais.
2. Criar branch Neon a partir do timestamp/LSN pre-janela.
3. Repontar `DATABASE_URL` e `DATABASE_MIGRATION_URL` da Vercel para o branch restaurado, sem expor valores.
4. Redeploy da ultima versao conhecida boa quando o problema envolver codigo.
5. Preservar o branch original para forense.
6. Registrar causa, impacto, acao e proxima janela.

## Revisao Minima De Seguranca De Integracoes/API Keys

Estado para go-live:

- `ASOF_INTEGRATIONS_ENABLED=false` em producao.
- Rotas `/api/v1/events` e `/api/v1/health` permanecem sem ativar novo endpoint inbound publico.
- Webhooks sao outbound-only e nao devem ter destinos reais ativados na janela.
- Crons de `vercel.json` usam `CRON_SECRET` bearer nas rotas `/api/v1/events/dispatch` e `/api/v1/juridico/sla-warnings`.

Riscos registrados:

- A chave legada `ASOF_INTEGRATION_API_KEY`, quando configurada com `ASOF_INTEGRATION_HMAC_SECRET`, tem acesso irrestrito e deve permanecer sem uso em producao nova.
- Linhas antigas de `integration_api_keys` sem `signing_secret_ciphertext` podem cair no fallback de HMAC compartilhado; preferir rotacionar/criar chaves novas com segredo por chave antes de qualquer ativacao futura.
- Segredos de API key e HMAC sao exibidos uma unica vez na UI; nao registrar em logs, prints, tickets ou docs.
- Qualquer ativacao futura de integrações exige decisao separada, escopos minimos, teste de assinatura, rate-limit e revisao de logs sem PII.

Texto recomendado para a decisao de go-live:

> Para a Release 1.0, integrações permanecem desativadas com `ASOF_INTEGRATIONS_ENABLED=false`. Nenhum webhook real, cliente externo de API ou endpoint inbound publico novo sera ativado. O codigo de integrações fica apenas como fundacao outbound-only dormente; qualquer ativacao futura exige revisao de seguranca separada, credenciais por chave com escopo minimo, evidencia de teste e plano de rollback.

## Registro De Evidencias

Para fechar a Release 1.0 operacionalmente, anexar ou registrar fora do Git:

- janela aprovada;
- timestamp/LSN pre-janela;
- evidencia do backup/snapshot;
- resultado do smoke por passo;
- status das chamadas cron com e sem bearer;
- lista de dados `SMOKE_*` removidos por tabela;
- resultado do restore de teste;
- decisao final: liberar, pausar ou rollback.
