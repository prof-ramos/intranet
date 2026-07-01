# Runbook Operacional

Este runbook cobre operacao, migrations, smoke e rollback da intranet ASOF.
A matriz oficial de ambientes e bancos fica em [`environments.md`](./environments.md)
e prevalece se outro documento divergir.

Para a janela operacional da Release 1.0, use tambem o roteiro detalhado em
[`docs/release-1-operational-go-live.md`](./release-1-operational-go-live.md).
Ele cobre smoke manual em producao, backup Nivel 1 com `pg_dump`, restore de
teste, validacao de crons e revisao minima de integracoes/API keys sem secrets.

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

## 5. Smoke Manual

Para a Release 1.0, use o roteiro detalhado em
[`docs/release-1-operational-go-live.md`](./release-1-operational-go-live.md).
Ele cobre backup pre-janela, smoke manual em producao, validacao dos crons com
`CRON_SECRET`, limpeza `SMOKE_*`, restore de teste e revisao minima de
integracoes/API keys.

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

## 8. Incidentes LGPD

- Nao registrar CPF, SIAPE, endereco, senha temporaria, token, cookie ou segredo em logs.
- Usar `src/lib/logger.ts` e `src/lib/sanitize-pii.ts`.
- Em suspeita de vazamento, preservar evidencias, rotacionar segredos afetados e registrar incidente.

## 9. Limpeza de integration_signature_nonces

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

## 10. Eventos presos no outbox (`domain_events`)

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
