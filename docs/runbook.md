# Runbook Operacional

Este runbook cobre a estreia da intranet ASOF com PostgreSQL gerenciado limpo, baseline Drizzle novo e autenticacao server-side propria.

Para a janela operacional da Release 1.0, use tambem o roteiro detalhado em
[`docs/release-1-operational-go-live.md`](./release-1-operational-go-live.md).
Ele cobre smoke manual em producao, backup Nivel 1 com `pg_dump`, restore de
teste, validacao de crons e revisao minima de integracoes/API keys sem secrets.

## 1. Preparacao Do Banco

1. Provisionar um PostgreSQL gerenciado novo.
2. Criar ou obter duas URLs:
   - `DATABASE_URL`: runtime pooled, usuario restrito.
   - `DATABASE_MIGRATION_URL`: conexao direta/unpooled, usuario de migration.
   - No setup atual do projeto, ambas sao URLs do Neon `intranet-db`:
     `DATABASE_URL` via pooler `ep-empty-cake-ac26vl6w-pooler.sa-east-1.aws.neon.tech`
     e `DATABASE_MIGRATION_URL` via host direto `ep-empty-cake-ac26vl6w.sa-east-1.aws.neon.tech`.
   - Para desenvolvimento, use o branch `vercel-dev` (endpoint `ep-tiny-king-acczg9ev`):
     `DATABASE_URL` via pooler `ep-tiny-king-acczg9ev-pooler.sa-east-1.aws.neon.tech`
     e `DATABASE_MIGRATION_URL`/`DATABASE_URL_UNPOOLED` via host direto `ep-tiny-king-acczg9ev.sa-east-1.aws.neon.tech`.
3. Confirmar que o banco esta vazio ou explicitamente descartavel.
4. Fazer snapshot/backup inicial do provider antes de qualquer migration de producao.

### Reset do branch de desenvolvimento

Para resetar o branch `vercel-dev` para o estado de producao (use Console Neon ou API):

```bash
# Via Neon API (requer NEON_API_KEY e org ID)
curl -X POST "https://console.neon.tech/api/v2/projects/long-leaf-97822199/branches" \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Neon-Org-Id: org-red-mode-09715915" \
  -d '{"branch": {"name": "vercel-dev", "parent_id": "br-bold-bar-acge6h1w"}}'
```

**Aviso:** Isso destroi o branch anterior e cria um novo com dados de producao. Nunca aplique migrations direto na branch `main`.

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

Em producao, nao manter fallbacks legados de banco como `DATABASE_POSTGRES_URL`,
`DATABASE_POSTGRES_URL_NON_POOLING`, `POSTGRES_URL` ou `POSTGRES_PRISMA_URL`.
Em preview, nao compartilhar envs gerais de banco com producao.

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

Para uma prova isolada de banco limpo, aponte `DATABASE_URL` e `DATABASE_MIGRATION_URL` para um banco descartavel (ex: `asof_intranet_test` ou clone temporário), rode `npm run db:migrate`, `npm run db:seed` e depois `npm run test:db`.

Ao final da validação, descarte o banco temporário explicitamente (ex: `dropdb asof_intranet_test_temp` ou o nome usado) para evitar acumular clones descartáveis.

No desenvolvimento diário, recomenda-se o clone `asof_intranet_neon_clone` do Neon para dados realistas (associados, kanban etc.) — veja README.md.

**Aviso:** O clone traz PII completa. Siga os controles de segurança/LGPD documentados no README (delete dumps, uso restrito, etc.).

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

Executar via `psql "$DATABASE_MIGRATION_URL"` ou pelo Drizzle Studio (`npm run db:studio`). Recomendado verificar periodicamente em produção; em dev o branch `vercel-dev` pode ser resetado sem preocupação.
