# Runbook Operacional

Este runbook cobre operacao, migrations, smoke e rollback da intranet ASOF.
A matriz oficial de ambientes e bancos fica em [`environments.md`](./environments.md)
e prevalece se outro documento divergir.

Para a janela operacional da Release 1.0, use tambem o roteiro detalhado em
[`docs/release-1-operational-go-live.md`](./release-1-operational-go-live.md).
Ele cobre smoke manual em producao, backup Nivel 1 com `pg_dump`, restore de
teste, validacao de crons e revisao minima de integracoes/API keys sem secrets.

Higiene de secrets: [`operations/secrets-hygiene.md`](./operations/secrets-hygiene.md).  
Plano de sunset de PII plaintext: [`operations/pii-plaintext-sunset.md`](./operations/pii-plaintext-sunset.md).
Registro operacional pós-merge: [`operations/post-merge-smoke-observation.md`](./operations/post-merge-smoke-observation.md).

## 0. Checklist Único De Release (Deploy → Migrate → Smoke)

Use esta seção como **procedimento canônico** após merge em `main` que altere
código e/ou schema. Não inverter a ordem quando houver migration SQL nova.

### Antes do merge

- [ ] `npm run pr:check` (ou `validate:full`) verde localmente
- [ ] Se houver mudança em `src/lib/db/schema` ou `drizzle/postgres/`:
  - [ ] migration SQL versionada e journal atualizado
  - [ ] `src/lib/db/schema.integration.test.ts` atualizado (colunas/enums/índices)
- [ ] PR revisado; CI do PR verde (lint, typecheck, unit+coverage, build, DB contract, E2E)

### Ordem obrigatória em produção

1. **Anotar baseline**
   - [ ] Deployment Vercel atual “last known good” (ID + URL) — ADR 010
   - [ ] Timestamp UTC / LSN ou branch backup Neon se a janela for destrutiva
2. **Deploy da app**
   - [ ] Merge/`push` em `main` → aguardar Vercel production `READY`
   - [ ] Confirmar domínio `intranet.asof.com.br` no deployment novo
3. **Migrate (somente se houver SQL novo no commit)**
   - [ ] Backup Nível 1 ou branch Neon copy-on-write (seção 11)
   - [ ] `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate` com
         `DATABASE_MIGRATION_URL` **direct** (nunca pooler 6543)
   - [ ] Confirmar hashes em `drizzle.__drizzle_migrations`
   - [ ] Se a migration for `CONCURRENTLY` / `ALTER TYPE ... ADD VALUE` fora de
         transação: seguir procedimento manual do próprio SQL + journal
4. **Smoke**
   - [ ] CI job `Smoke Test — Production` em `main` **ou**
         `npm run smoke:prod` em janela controlada com `SMOKE_ADMIN_*`
   - [ ] Modo padrao read-only: 6 testes passam e 4 mutantes ficam skipped
   - [ ] Dispatch mutante autorizado: 10/10 testes; se falhar por coluna/enum
         ausente → voltar ao passo 3
5. **Limpeza pós-smoke**
   - [ ] Somente apos dispatch mutante, executar o SQL run-scoped
         `SMOKE_<run-id>_*` impresso pelo spec
   - [ ] Preservar `audit_logs`; zerar as contagens desse run
6. **Encerramento**
   - [ ] Anotar no canal de incidente (ADR 011) se houve incidente ou rollback
   - [ ] Se migrate não era necessária, pular passo 3 explicitamente no registro

### Smoke pós-merge — owner, evidência e alerta

- A rotina canônica é o `push` em `main`: o job `Smoke Test — Production` só
  começa depois de `build` e E2E verdes, valida o SHA completo no health
  autenticado e executa com `SMOKE_ALLOW_MUTATIONS=false`.
- O smoke pode ficar **skipped em PRs** por desenho e não deve ser adicionado
  como check obrigatório da proteção de `main`. Em `main`, um skip causado por
  falha ou cancelamento de `build`/E2E é incidente upstream; não é aprovação do
  smoke.
- Execução local é somente exceção controlada, com `SMOKE_EXPECTED_COMMIT_SHA`,
  `SMOKE_ALLOW_MUTATIONS=false` e evidência equivalente do run. Nunca copiar
  secrets para o repositório ou para logs.
- Considerar alerta quando o smoke falhar, quando ficar inesperadamente skipped
  após os pré-requisitos verdes, ou quando o health expuser SHA diferente do
  deployment esperado. O owner técnico primário e o substituto da [ADR
  011](./adr/011-incident-owners-day-one.md) devem ser avisados pelo canal
  único de incidente; o owner monitora também as 48h seguintes.
- Registrar no incidente: URL do run, SHA do commit, deployment/URL Vercel,
  modo de mutação, cenário que falhou, causa provável e ação (forward-fix ou
  rollback conforme ADR 010). Não incluir credenciais, PII ou payloads
  sensíveis.

### Observação pós-merge (24–48 h)

Depois do smoke read-only, mantenha a janela de observação documentada no
[registro operacional](./operations/post-merge-smoke-observation.md). Ela deve
conter o SHA completo, deployment, run/job do CI, horário UTC, owners e
limitações de acesso. O job de produção pode permanecer `skipped` em PRs draft
ou em PRs onde o smoke foi intencionalmente excluído; isso não transforma o
smoke em gate obrigatório de PR. O gate obrigatório é o smoke read-only após o
merge em `main`, sempre com `SMOKE_ALLOW_MUTATIONS=false` salvo dispatch
mutante autorizado em janela separada.

### Anti-padrões (não fazer)

- Deploy e assumir que o schema Neon acompanhou sozinho
- Rodar migrate sem backup quando a mudança é destrutiva ou de alto risco
- Smoke durante migrate incompleta
- Deixar dados `SMOKE_*` em produção após a janela
- Guardar `.env` de produção no root do repositório (mesmo gitignored)

## 1. Preparacao Do Banco

1. Confirmar o ambiente alvo em [`environments.md`](./environments.md).
2. Criar ou obter duas URLs:
   - `DATABASE_URL`: runtime pooled, usuario restrito.
   - `DATABASE_MIGRATION_URL`: conexao direta/unpooled, usuario de migration.
   - No setup atual do projeto, ambas sao URLs do Neon `intranet-db`:
     `DATABASE_URL` via pooler `ep-empty-cake-ac26vl6w-pooler.sa-east-1.aws.neon.tech`
     e `DATABASE_MIGRATION_URL` via host direto `ep-empty-cake-ac26vl6w.sa-east-1.aws.neon.tech`.
3. Confirmar que o banco esta vazio, descartavel ou explicitamente o ambiente
   oficial de producao.
4. Fazer snapshot/backup inicial do provider antes de qualquer migration de producao.

### Branch de desenvolvimento realista restrito

O branch `vercel-dev` contem PII real e nao e o caminho padrao de
desenvolvimento. Use apenas quando a matriz permitir. Para recriar um branch de
dev realista a partir de producao (use Console Neon ou API):

```bash
# Via Neon API (requer NEON_API_KEY e org ID)
curl -X POST "https://console.neon.tech/api/v2/projects/long-leaf-97822199/branches" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Neon-Org-Id: org-red-mode-09715915" \
  -d '{"branch": {"name": "vercel-dev", "parent_id": "br-bold-bar-acge6h1w"}}'
```

**Aviso:** isso destroi o branch anterior e cria um novo com dados de producao.
Nunca aplique migrations direto na branch Neon `main` por esse caminho.

## 2. Envs Obrigatorias

- `DATABASE_URL`
- `DATABASE_MIGRATION_URL`
- `SESSION_SECRET`
- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`
- `ENCRYPTION_MASTER_KEY`
- `CRON_SECRET`
- `TRUSTED_PROXY_COUNT=1`
- `SKIP_AUTH` ausente ou `false` em producao
- `ASOF_INTEGRATIONS_ENABLED=false`, salvo decisao operacional separada

Em producao, variaveis de banco injetadas pela Vercel Storage Integration podem
existir, mas nao sao o contrato operacional. Use sempre `DATABASE_URL` para
runtime e `DATABASE_MIGRATION_URL` para migrations.
Em preview, nao compartilhar envs gerais de banco com producao. Em staging, usar
somente secrets proprios do ambiente `staging`.

Nunca reutilize segredos expostos em chat, logs ou arquivos temporarios.

## 3. Migration, Seed E Importação De Associados

```bash
ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate
npm run db:seed
```

O seed cria ou atualiza o admin inicial em `admins`, grava `password_hash`, define `role=admin`, `is_active=true` e `must_change_password=true`.

### 3.1 Associados

No ambiente Neon já populado para o go-live, o banco contém **1662 Oficiais de Chancelaria** importados do sistema legado, sendo **440 associados** à ASOF. Em um PostgreSQL novo ou restaurado sem dump operacional, importe primeiro o arquivo legado controlado antes de assumir esses números:

```bash
npx tsx scripts/import-asof-associados-json.ts <arquivo-legado.json> --apply
node --env-file=.env.local scripts/seed-assignments-from-import.ts --apply
```

## 4. Validacao Tecnica

```bash
npm run typecheck
npm run lint
npm run test
npm run test:db
npm run build
```

Para uma prova isolada de banco limpo, aponte `DATABASE_URL` e
`DATABASE_MIGRATION_URL` para um banco descartavel (ex: `asof_intranet_test` ou
clone temporario), rode `npm run db:migrate`, `npm run db:seed` e depois
`npm run test:db`.

Ao final da validação, descarte o banco temporário explicitamente (ex: `dropdb asof_intranet_test_temp` ou o nome usado) para evitar acumular clones descartáveis.

No desenvolvimento diario, use `asof_intranet` local com seed sintetico. Clones
com PII real sao excecao restrita descrita em [`environments.md`](./environments.md).

## 5. Smoke De Producao

Para a Release 1.0, use o roteiro detalhado em
[`docs/release-1-operational-go-live.md`](./release-1-operational-go-live.md).
Ele cobre backup pre-janela, smoke manual em producao, validacao dos crons com
`CRON_SECRET`, limpeza `SMOKE_*`, restore de teste e revisao minima de
integracoes/API keys.

O smoke automatizado oficial roda pelo spec `e2e/smoke-prod.spec.ts` contra
`https://intranet.asof.com.br`. A conta dedicada e
`smoke-admin@asof.local`, mantida em `admins` com `role=admin`,
`is_active=true` e `must_change_password=false`; a senha deve existir somente no
secret `SMOKE_ADMIN_PASSWORD` do GitHub Actions ou no shell da janela
controlada.

Execucao local em janela controlada:

```bash
SMOKE_BASE_URL=https://intranet.asof.com.br \
SMOKE_ADMIN_EMAIL=smoke-admin@asof.local \
SMOKE_ADMIN_PASSWORD='...' \
SMOKE_EXPECTED_COMMIT_SHA=<sha-completo> \
SMOKE_ALLOW_MUTATIONS=false \
npm run smoke:prod
```

Execucao via GitHub Actions: o workflow `CI` aceita `workflow_dispatch` apos a
versao do workflow estar em `main`. O job `Smoke Test — Production` valida o
SHA completo do deployment e roda somente leitura em `push` para `main` ou no
dispatch padrao. Mutações exigem marcar explicitamente
`production_mutations=true`; nesse caso o CI define um `SMOKE_RUN_ID` por run e
tentativa. O job continua pulado em PRs.

Depois de qualquer smoke mutante, execute manualmente a limpeza
`SMOKE_<run-id>_*` impressa pelo spec e confirme que as contagens desse run
ficaram zeradas. A transacao captura primeiro os IDs tecnicos das entidades,
deriva `domain_events` por `(entity_type, entity_id)`, apaga os respectivos
`webhook_deliveries` por causa do FK restritivo e preserva `audit_logs`. O spec
nunca recebe credencial de banco. Execute a transacao completa impressa; nao a
substitua por deletes parciais reconstruidos do runbook.

Se o smoke falhar na criacao de atividade com erro de enum
`domain_event_type: "activity.created"`, a producao esta sem a migration manual
`0028_activity_domain_events.sql`. Aplicar essa migration via
`DATABASE_MIGRATION_URL` direto do Neon `main`, registrar o hash em
`drizzle.__drizzle_migrations`, e repetir o smoke.

Validar no ambiente alvo:

- login do admin inicial;
- troca obrigatoria de senha;
- dashboard;
- associados: lista, perfil, filtros e exportacao permitida;
- atividades;
- juridico;
- oficios;
- financeiro;
- auditoria;
- reset de senha de outro usuario com senha temporaria;
- notificacoes persistidas;
- rotas cron com e sem `CRON_SECRET`.

## 6. Documentos E Storage

Documentos fisicos nao bloqueiam o go-live enquanto nao houver provider de storage de objetos escolhido. O modulo deve permanecer desativado/limitado se upload/download real for obrigatorio e o storage ainda nao estiver configurado.

## 7. Rollback

1. Se a migration falhar antes do deploy, restaurar snapshot do banco novo ou descartar o banco e recriar.
2. Se o deploy falhar com banco migrado, preferir rollback de app para SHA anterior compativel ou forward-fix documentado.
3. Nao usar bancos investigados anteriormente como rollback operacional.
4. Preferir restore via branch Neon / PITR (ADR 010) quando o incidente for de dados; ver seção 8.

## 8. Backup Periódico E Restore Drill

O Neon Free Tier limita Instant Restore / Time Travel a **6 horas**. Não confiar
somente em PITR para incidentes descobertos depois. Complementar com backup
Nível 1 (`pg_dump`) e drills periódicos.

### 8.1 Backup Nível 1 (semanal, mínimo)

Script: `scripts/backup-neon-level1.sh`

```bash
# URL direta (non-pooling), idealmente role de leitura/backup dedicada — nunca logar a URL
export DATABASE_BACKUP_URL='postgres://…'   # direct host, sem printar
export BACKUP_DIR="${BACKUP_DIR:-$HOME/asof-intranet-backups}"
export RETENTION_DAYS=14

# Dry-run (não grava dump)
DRY_RUN=true ./scripts/backup-neon-level1.sh

# Backup real: gera .sql.gz + .sha256, valida gzip, aplica retenção
umask 077
./scripts/backup-neon-level1.sh
```

Regras:

- Agendar **no mínimo 1× por semana** (cron do operador ou máquina segura).
- Antes de migrate de produção de risco: **sempre** um backup ad hoc ou branch Neon.
- `BACKUP_DIR` com permissão `700`; arquivos `600`.
- Não commitar dumps; não colar connection strings em chat/issue.
- No Free Tier, branch Neon copy-on-write pré-janela continua obrigatório para
  mudanças destrutivas (ADR 010 / 016).

### 8.2 Restore drill (mensal, mínimo)

Objetivo: provar que o time restaura e sobe app legível em &lt; meta acordada
(sugestão: 60 min para drill controlado).

1. **Preparar alvo descartável**
   - Branch Neon novo a partir de backup/PITR **ou** Postgres local vazio
   - Nunca restaurar dump em cima de `main` de produção no drill
2. **Restaurar**
   ```bash
   # Exemplo local (ajuste DB name)
   createdb asof_restore_drill
   gunzip -c "$BACKUP_DIR/asof-intranet-….sql.gz" | psql "postgres://…/asof_restore_drill"
   ```
3. **Validar**
   - [ ] `SELECT count(*) FROM associates;` (ordem de grandeza esperada)
   - [ ] `SELECT count(*) FROM drizzle.__drizzle_migrations;`
   - [ ] App local apontando `DATABASE_URL`/`DATABASE_MIGRATION_URL` do drill:
         `npm run test:db` (ou smoke mínimo de login em dev)
   - [ ] Decrypt de 1 registro PII de teste **somente** se a chave do dump for a
         mesma e o ambiente for autorizado (LGPD)
4. **Encerrar**
   - [ ] Destruir branch/DB de drill
   - [ ] Registrar data, duração e dono no canal operacional (sem secrets)

### 8.3 Critérios de sucesso do drill

| Critério                             | Meta                                    |
| ------------------------------------ | --------------------------------------- |
| Dump abre / `gzip -t` ok             | Sempre                                  |
| Restore aplica sem erro fatal        | Sempre                                  |
| Schema contract ou contagens básicas | Passa                                   |
| Tempo total do drill                 | &lt; 60 min (ajustar se volume crescer) |
| Artefato de evidência                | Data + resultado no canal privado       |

Se o drill falhar: abrir incidente operacional, não esperar o próximo incidente real.

## 9. Incidentes LGPD

- Nao registrar CPF, SIAPE, endereco, senha temporaria, token, cookie ou segredo em logs.
- Usar `src/lib/logger.ts` e `src/lib/sanitize-pii.ts`.
- Em suspeita de vazamento, preservar evidencias, rotacionar segredos afetados e registrar incidente.

## 10. Limpeza de integration_signature_nonces

A tabela `integration_signature_nonces` armazena nonces de replay attack para integrações M2M (veja ADR 014). Cada nonce expira após a janela de tolerância de timestamp (`ASOF_INTEGRATION_TIMESTAMP_TOLERANCE_SECONDS`), mas não há cron de limpeza automática ainda.

**Monitorar crescimento:**

```sql
SELECT count(*) FROM integration_signature_nonces WHERE expires_at < now();
```

**Limpeza manual (segura — remove apenas expirados):**

```sql
DELETE FROM integration_signature_nonces WHERE expires_at < now();
```

Executar via `psql "$DATABASE_MIGRATION_URL"` ou pelo Drizzle Studio (`npm run db:studio`). Recomendado verificar periodicamente em produção; em dev realista restrito, siga a política de reset/descarte definida em `docs/environments.md`.

## 11. Eventos presos no outbox (`domain_events`)

O outbox de webhooks (`domain_events`) acumula eventos emitidos por serviços internos (associados, jurídico, ofícios, mensalidades e, a partir do ADR 018, atividades do Kanban). Cada evento é inserido com `delivery_status = 'pending'` e dispatch inline fire-and-forget após commit; o cron `/api/v1/events/dispatch` (Vercel Cron, `0 3 * * *`) é a rede que recupera eventos não entregues na via inline, com retry exponencial (máx. 5). Eventos expiram após 90 dias (`expires_at`).

**Sintoma:** um consumer de webhook não recebe notificações de uma mudança que ocorreu no Kanban (ex.: tarefa atribuída não chegou ao sistema de automação/push).

**Investigação — eventos presos em `pending`:**

```sql
SELECT event_type, delivery_status, count(*), max(created_at) AS latest
FROM domain_events
WHERE delivery_status = 'pending' AND expires_at > now()
GROUP BY event_type, delivery_status
ORDER BY latest DESC;
```

Filtre por `event_type` em `activity.*` para isolar eventos de Kanban. Eventos `failed` (retry excedido) aparecem com `attempts >= 5`.

**Ações:**

- Verificar se a subscription correspondente existe e está ativa (`webhook_subscriptions` com o `event_type` em `subscribed_events` e `is_active = true`).
- Verificar `webhook_deliveries` para o `event_id` — lá ficam status HTTP, corpo da resposta e próximo `next_attempt_at`.
- Disparar manualmente um evento específico via `POST /api/v1/events` (sessão `admin` ou assinatura M2M), passando o `eventId`. Cada dispatch grava auditoria em `audit_logs` com `entityType = domain_event`.
- Para reprocessar o backlog inteiro de `pending`, aguardar o cron diário ou acionar `POST /api/v1/events/dispatch` com bearer `CRON_SECRET`.

**Notas:**

- A via inline (fire-and-forget dentro do request) swallowed falhas de dispatch e só loga (`logger.error('inline dispatch failed ...')`) — a mutação do Kanban nunca falha por causa do webhook. O evento permanece `pending` e é recuperado pelo cron.
- Não existe ingestão inbound por essa rota; eventos só são persistidos por serviços internos em `db.transaction` (atomicidade all-or-nothing com a mutação).
- Ver ADR 018 para o conjunto de eventos `activity.*` e o racional de atomicidade.
