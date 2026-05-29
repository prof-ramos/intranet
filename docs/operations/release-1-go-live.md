# Release 1.0 Go-Live Operacional

Este roteiro prepara a estreia controlada da intranet ASOF. Ele nao executa
migrations, nao cria dados reais e nao substitui a validacao manual da janela.
Qualquer valor real de secret, URL completa de banco, token, cookie ou senha deve
ficar fora do Git e fora dos logs.

## Escopo

- Ambiente alvo: producao Vercel + Neon/PostgreSQL canonico da intranet.
- Autenticacao: server-side propria, com admin inicial e troca obrigatoria de
  senha.
- Rollback primario: Neon PITR + branch de restauracao, conforme ADR 010.
- Backup Nivel 1: `pg_dump` compactado e validado como cinto-e-suspensorio alem
  do PITR.
- Integracoes/API keys: manter `ASOF_INTEGRATIONS_ENABLED=false` no go-live,
  salvo decisao operacional separada.

Fora do escopo: Papra/DMS, Supabase Auth/Storage/Realtime, webhooks reais novos,
endpoints inbound publicos novos e features de produto fora do roteiro.

## Estrutura Esperada Na VPS

Use a VPS apenas como operador de backup/rotina, nao como banco canonico da
intranet.

```text
/opt/intranet-backup/
  asof-intranet-YYYYMMDDTHHMMSSZ.sql.gz
  asof-intranet-YYYYMMDDTHHMMSSZ.sql.gz.sha256
```

Ambiente externo ao Git, por exemplo em um arquivo protegido por permissao de
sistema ou no gerenciador de secrets da VPS:

```bash
export DATABASE_BACKUP_URL='<url-direta-de-backup-fora-do-git>'
export BACKUP_DIR=/opt/intranet-backup
export RETENTION_DAYS=14
```

Nao salve esse arquivo no repositorio. Nao cole o valor de
`DATABASE_BACKUP_URL` em issues, chats, logs ou evidencias.

## Backup Nivel 1 Neon/PostgreSQL

O mecanismo primario de rollback continua sendo Neon PITR. O backup Nivel 1 e
uma copia operacional adicional, gerada com `pg_dump` e validada localmente.

### Execucao Manual

```bash
DATABASE_BACKUP_URL='<definir-fora-do-git>' \
BACKUP_DIR=/opt/intranet-backup \
RETENTION_DAYS=14 \
bash scripts/backup-neon.sh
```

O script deve registrar somente metadados seguros: nome do arquivo, tamanho,
resultado de `gzip -t`, checksum SHA256 criado e retencao aplicada. Ele nao deve
imprimir a URL, usuario, senha, host completo com credencial, token ou secret.

### Cron

Exemplo operacional diario, ajustado pelo owner da VPS:

```cron
15 2 * * * cd /caminho/para/intranet && /usr/bin/env bash scripts/backup-neon.sh >> /var/log/asof-intranet-backup.log 2>&1
```

O cron deve carregar `DATABASE_BACKUP_URL`, `BACKUP_DIR` e `RETENTION_DAYS` a
partir de ambiente externo ao Git. Se o loader de ambiente imprimir variaveis,
nao use esse loader.

### Validacao De Integridade

Para cada arquivo produzido:

```bash
gzip -t /opt/intranet-backup/asof-intranet-YYYYMMDDTHHMMSSZ.sql.gz
cd /opt/intranet-backup
shasum -a 256 -c asof-intranet-YYYYMMDDTHHMMSSZ.sql.gz.sha256
```

Evidencia minima segura:

- data UTC da execucao;
- nome do arquivo;
- tamanho em bytes;
- resultado de `gzip -t`;
- resultado do SHA256 como `OK`;
- `RETENTION_DAYS` aplicado;
- nenhuma secret impressa.

## Restore Manual Em Banco De Teste

Nunca restaure sobre producao. O banco restaurado contem dados sensiveis e deve
ter acesso restrito, logs sanitizados e descarte planejado apos a validacao.

1. Criar um banco de teste/restore descartavel, separado do Neon de producao.
2. Definir uma URL de restore fora do Git, por exemplo `RESTORE_DATABASE_URL`.
3. Validar checksum e gzip antes de restaurar.
4. Restaurar com ferramenta PostgreSQL em banco vazio.
5. Validar tabelas principais e contagens basicas.
6. Registrar data, arquivo usado, resultado e decisao final.

Comandos de referencia, a serem executados somente com URLs externas ao Git:

```bash
gzip -t /opt/intranet-backup/asof-intranet-YYYYMMDDTHHMMSSZ.sql.gz
cd /opt/intranet-backup
shasum -a 256 -c asof-intranet-YYYYMMDDTHHMMSSZ.sql.gz.sha256
gunzip -c /opt/intranet-backup/asof-intranet-YYYYMMDDTHHMMSSZ.sql.gz | psql "$RESTORE_DATABASE_URL"
psql "$RESTORE_DATABASE_URL" -c "select 'admins' as table_name, count(*) from admins union all select 'associates', count(*) from associates union all select 'activities', count(*) from activities union all select 'monthly_payments', count(*) from monthly_payments union all select 'oficios', count(*) from oficios union all select 'audit_logs', count(*) from audit_logs union all select 'notifications', count(*) from notifications;"
```

Nao cole a saida se ela contiver PII. Para evidencia, registre somente os nomes
das tabelas, contagens agregadas, arquivo usado, data UTC e `OK`/`FALHOU`.

## Smoke Manual Em Producao

Executar em janela aprovada, antes de liberar Secretaria/Diretoria. O executor
usa o admin inicial. Dados temporarios devem usar prefixo `SMOKE_` e devem ser
removidos antes da liberacao final, preservando auditoria.

### Pre-Janela

1. Confirmar owners e canal unico de incidente.
2. Confirmar `history_retention` Neon suficiente para janela + 24h.
3. Anotar timestamp UTC e, quando possivel, LSN imediatamente antes do smoke.
4. Gerar snapshot/backup Neon pre-janela:
   - confirmar PITR/branch de restore disponivel no Neon;
   - opcionalmente executar backup Nivel 1 com `scripts/backup-neon.sh`.
5. Confirmar versao Vercel "ultima conhecida boa".
6. Confirmar `ASOF_INTEGRATIONS_ENABLED=false`.
7. Confirmar que nenhum webhook real novo ou endpoint inbound publico novo sera
   ativado durante a janela.

### Roteiro De Smoke

1. Login admin: entrar em producao com o admin inicial.
2. Troca obrigatoria de senha: confirmar redirect e conclusao do fluxo quando
   aplicavel. Se a troca ja foi feita antes do timestamp de rollback, registrar
   essa premissa.
3. Dashboard: validar carregamento, cards e links principais sem erro 5xx.
4. Associados: criar ou editar registro marcado `SMOKE_`, abrir perfil, testar
   filtros e confirmar que exportacao permitida gera auditoria.
5. Atividades: criar card `SMOKE_`, mover status, atribuir responsavel e validar
   persistencia ao recarregar.
6. Juridico: criar consulta/processo/nota `SMOKE_` conforme UI disponivel,
   validar SLA/historico e persistencia.
7. Secretaria/Oficios: criar oficio `SMOKE_`, editar conteudo, validar numero,
   download/visualizacao quando disponivel e auditoria.
8. Financeiro: criar mensalidade `SMOKE_` vinculada ao associado de smoke,
   alterar status e metodo, validar filtros e persistencia.
9. Auditoria: confirmar registros para login, criacoes, edicoes e exportacao,
   sem PII indevida em mensagens.
10. Notificacoes persistidas: gerar evento que crie notificacao, recarregar a UI
    e confirmar que a notificacao continua gravada.
11. Crons com `CRON_SECRET`: chamar rotas configuradas com bearer valido por
    canal seguro e confirmar 2xx/efeito esperado:
    - `/api/v1/events/dispatch`
    - `/api/v1/juridico/sla-warnings`
12. Crons sem `CRON_SECRET`: confirmar rejeicao sem bearer ou com bearer
    invalido, sem imprimir o valor real do secret.

### Limpeza `SMOKE_*`

Remover apenas dados temporarios criados no smoke. A limpeza deve ser feita por
owner tecnico com SQL revisado antes da execucao. Auditoria do smoke nao deve ser
apagada.

Antes de liberar usuarios finais, registrar:

- quais entidades `SMOKE_*` foram criadas;
- como foram removidas;
- contagens agregadas pos-limpeza;
- confirmacao de auditoria preservada.

## Criterios De Sucesso

- PITR/snapshot pre-janela anotado com timestamp UTC e LSN quando disponivel.
- Backup Nivel 1, se executado na janela, passou em `gzip -t` e SHA256.
- Login, senha, dashboard e modulos centrais carregaram sem falha critica.
- Escritas/leitura em associados, atividades, juridico, oficios e financeiro
  persistiram corretamente.
- Auditoria e notificacoes persistidas foram confirmadas.
- Crons aceitaram somente chamadas com `CRON_SECRET` valido.
- Dados `SMOKE_*` foram removidos, com auditoria preservada.
- Nenhum secret foi impresso em evidencia.

## Criterios De Falha E Rollback

Acionar decisao de rollback se qualquer item critico ficar sem mitigacao por 30
minutos:

- falha em login, sessao, `requireAuth()` ou `requireRole()`;
- falha de escrita/leitura em associados, mensalidades, oficios, juridico ou
  atividades;
- falha de auditoria ou notificacoes persistidas;
- falha de cron com `CRON_SECRET`;
- corrupcao de dados, mistura de PII, unicidade violada ou status inconsistente.

Rollback operacional:

1. Criar branch Neon a partir do timestamp/LSN pre-janela.
2. Repontar envs Vercel de producao para o branch restaurado, sem imprimir
   valores.
3. Redeploy da versao anterior conhecida boa quando o defeito for de codigo.
4. Congelar branch Neon original para forense; nao apagar.
5. Reabrir janela somente depois de novo checklist completo.

## Revisao Minima De Seguranca Das Integracoes

- Risco conhecido: `ASOF_INTEGRATION_HMAC_SECRET` e
  `ASOF_INTEGRATION_API_KEY` sao compatibilidade legada com escopo amplo.
- Caminho preferido: API keys persistidas em `integration_api_keys`, com signing
  secret por chave, exibido uma unica vez na criacao/rotacao.
- Para o go-live, manter `ASOF_INTEGRATIONS_ENABLED=false` em producao.
- Nao ativar webhooks reais, subscriptions externas ou endpoints inbound
  publicos novos na janela.
- Se uma secret real for encontrada, registrar somente caminho afetado, tipo de
  risco e acao recomendada; nunca copiar, mascarar ou resumir o valor.
