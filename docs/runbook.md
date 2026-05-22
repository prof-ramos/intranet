# Runbook Operacional — ASOF Intranet

Procedimentos operacionais para deploy, backup, rollback e verificação de saúde.

---

## 1. Backup antes de migração

### 1.1 Supabase (produção/remoto)

Via Dashboard:

1. Acesse o projeto Supabase (`vmohxhyfgywaqfuqeuom`)
2. Database → Backups → Trigger new backup
3. Aguarde confirmação (geralmente < 5 min para bancos < 5 GB)

Via CLI (se configurado):

```bash
supabase db dump --data-only --db-url "$DATABASE_MIGRATION_URL" > backup-$(date +%Y%m%d-%H%M%S).sql
```

> **Regra:** Nunca aplique migration em produção sem backup confirmado.

---

## 2. Deploy Vercel

### 2.1 Deploy de produção

```bash
# Validar estado local primeiro
npm run lint && npm run typecheck && npm run test && npm run build

# Deploy
vercel deploy --prod --yes
```

### 2.2 Rollback de deploy

Se o deploy novo quebrar:

```bash
# Listar deployments recentes
vercel ls asof-intranet --limit 10

# Promover deployment anterior para produção
vercel promote <deployment-id> --yes

# Ou via dashboard: Vercel → Project → Deployments → ... → Promote to Production
```

> **Nota:** Rollback de deploy NÃO reverte o banco de dados. Se uma migration foi aplicada, o rollback do deploy pode causar incompatibilidade de schema.

---

## 3. Rollback de migration Drizzle

Drizzle não tem rollback automático. Procedimento manual:

1. Identificar a migration problemática (última aplicada)
2. Criar migration reversa manual (`drizzle/postgres/XXXX_rollback_description.sql`)
3. Aplicar com `DATABASE_MIGRATION_URL=... npx drizzle-kit migrate`
4. Validar schema com `npm run test:db`

> **Prevenção:** sempre teste migrations em staging antes de produção.

### 3.1 Índices grandes e `CREATE INDEX CONCURRENTLY`

O fluxo `npm run db:migrate` aplica migrations Drizzle versionadas e deve ser tratado como fluxo transacional. PostgreSQL não permite `CREATE INDEX CONCURRENTLY` ou `DROP INDEX CONCURRENTLY` dentro de um bloco transacional; portanto, essas operações não entram em `drizzle/postgres/*.sql` nem devem ser executadas pelo migrator.

Procedimento para índices grandes em produção:

1. Confirmar necessidade com `EXPLAIN (ANALYZE, BUFFERS)` em staging ou réplica.
2. Criar backup/snapshot antes da janela.
3. Testar o SQL em staging usando a URL direta/non-pooling.
4. Executar em produção via `psql`, com `ON_ERROR_STOP=1`, fora do `npm run db:migrate`.
5. Validar `pg_indexes`, consultas críticas e `npm run test:db` contra o alvo migrado.
6. Registrar no release log: operador, horário, commit, SQL executado e plano de rollback.

Exemplo:

```bash
psql "$DATABASE_MIGRATION_URL" -v ON_ERROR_STOP=1 \
  -c "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_table_column ON table_name (column_name);"
```

Se a mudança precisar de alteração de schema além do índice, separe em duas etapas: primeiro a migration Drizzle transacional, depois o índice concorrente manual.

---

## 4. Smoke test pós-deploy

Sequência obrigatória após deploy de produção:

```bash
# 1. Verificar redirects
curl -sSI https://intranet.asof.com.br/
curl -sSI https://intranet.asof.com.br/app
curl -sSI https://intranet.asof.com.br/login

# 2. Login (use variável de ambiente para evitar expor senha no shell history)
read -s ADMIN_PASSWORD
curl -sS -X POST https://intranet.asof.com.br/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=admin@asof.org.br" \
  -d "password=$ADMIN_PASSWORD"
unset ADMIN_PASSWORD

# 3. Health check da API
curl -sS https://intranet.asof.com.br/api/v1/health
```

### 4.1 Verificação manual (navegador)

1. Acesse `https://intranet.asof.com.br/`
2. Confirme redirect para `/app` (se autenticado) ou `/login` (se não)
3. Faça login
4. Navegue por: Dashboard → Associados → Jurídico → Ofícios
5. Verifique se dados carregam (não apenas a UI)

### 4.2 Verificação do Framework Preset

Se `/login` retornar `404 NOT_FOUND`:

```bash
# Diagnóstico
vercel project inspect asof-intranet
vercel inspect intranet.asof.com.br
vercel alias list | rg 'intranet\.asof\.com\.br'

# Se estático retorna 200 mas rotas Next retornam 404:
# Causa raiz: Framework Preset = "Other" (incidente 2026-05-12)
# Correção: verificar se vercel.json tem "framework": "nextjs"
```

### 4.3 Smoke Realtime de notificações com dois usuários

Este smoke valida o que os testes unitários não provam: Supabase Realtime no ambiente alvo, publication `supabase_realtime`, RLS por usuário e isolamento entre sessões.

Pré-requisitos:

1. Dois usuários de teste sem PII real: `realtime-a@asof.org.br` e `realtime-b@asof.org.br`.
2. Ambos devem existir no Supabase Auth e em `admins`, ativos, com roles operacionais adequados.
3. O operador precisa de URL SQL direta/non-pooling do ambiente alvo ou acesso equivalente ao SQL Editor Supabase.

Consultas SQL no alvo:

```sql
select pubname
from pg_publication
where pubname = 'supabase_realtime';

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename = 'notifications';

select relrowsecurity, relforcerowsecurity
from pg_class
where relname = 'notifications';

select policyname, permissive, roles, cmd, qual
from pg_policies
where tablename = 'notifications'
order by policyname;
```

Resultado esperado:

- `supabase_realtime` existe.
- `notifications` está na publication.
- `relrowsecurity=true` e `relforcerowsecurity=true`.
- política `notifications_select_authenticated` presente para `SELECT` (migration 0044).

Checklist manual:

1. Abrir sessão A com `realtime-a@asof.org.br`.
2. Abrir sessão B com `realtime-b@asof.org.br` em outro navegador/perfil.
3. Criar uma notificação para o admin da sessão A por fluxo real do sistema ou insert controlado.
4. Confirmar que A lista/recebe a notificação no sino.
5. Confirmar que B não lista nem recebe a notificação de A.
6. Confirmar que B não consegue marcar a notificação de A como lida, nem por ação individual nem por "marcar todas".
7. Registrar horário, ambiente, commit SHA, IDs dos usuários de teste e prints/logs sem expor tokens.

### 4.4 Smoke de redefinição de senha

O fluxo de reset é iniciado por um `admin` em Configurações → Usuários. A Action gera um link de recuperação via Supabase Auth antes de invalidar a senha atual. Em produção, `ASOF_INTRANET_URL` deve estar definido como `https://intranet.asof.com.br`; essa URL é passada como redirect do link de recuperação para evitar links que retornem para `localhost`.

Envio automático:

- O Supabase Auth gera o link, mas este fluxo não usa o envio nativo do Supabase.
- A intranet envia o email transacional pelo Mailjet somente quando `MAILJET_API_KEY`, `MAILJET_SECRET_KEY` e `MAILJET_SENDER_VALIDATED=true` estiverem configurados.
- `MAILJET_SENDER_EMAIL` deve ser um remetente validado no Mailjet. Se houver alerta como "A non-validated sender address was used on your account", mantenha `MAILJET_SENDER_VALIDATED=false` até validar o remetente correto.

Fallback seguro:

- Se Mailjet não estiver configurado, se o remetente não estiver validado ou se a entrega falhar, o reset ainda é concluído e a tela administrativa mostra o link/senha temporária uma única vez para comunicação por canal seguro.
- Logs não devem conter email do alvo, token, link completo, senha temporária ou corpo bruto de resposta do provedor.

Checklist:

1. Confirmar env de produção sem expor valores:
   ```bash
   vercel env ls | rg 'ASOF_INTRANET_URL|MAILJET_'
   ```
2. Confirmar no painel do Mailjet que `MAILJET_SENDER_EMAIL` está validado.
3. Redefinir a senha de um usuário de teste ativo.
4. Se `MAILJET_SENDER_VALIDATED=true`, confirmar recebimento do email "Redefinição de senha — ASOF Intranet".
5. Abrir o link e confirmar que ele não aponta para `localhost` e termina no domínio `https://intranet.asof.com.br`.
6. Se o email não for entregue, usar o fallback exibido pela UI admin e registrar o incidente sem copiar tokens nos logs.

---

## 5. Verificação de saúde

### 5.1 Domínio customizado

```bash
# Status do deployment
vercel inspect intranet.asof.com.br

# Esperado: status Ready, aliases incluindo https://intranet.asof.com.br
```

### 5.2 Banco de dados

```bash
# Conexão e estatísticas
psql "$DATABASE_URL" -c "SELECT version();"
psql "$DATABASE_URL" -c "SELECT count(*) FROM associates;"
psql "$DATABASE_URL" -c "SELECT count(*) FROM admins WHERE is_active = true;"
```

### 5.3 Schema alignment

```bash
# Após qualquer migration em produção
DATABASE_URL=<produção> npm run test:db
```

---

## 6. Incidente conhecido — Deploy estático (2026-05-12)

**Sintoma:** `vercel inspect` mostra `Ready`, mas `/login` e `/app` retornam `404 NOT_FOUND`.

**Causa:** Projeto configurado na Vercel como `Framework Preset: Other` com `Output Directory: public`.

**Correção:**

1. `vercel.json` deve ter `"framework": "nextjs"`
2. Project Settings → Framework Preset → Next.js
3. Output Directory → Next.js default (não `public` ou `.`)
4. Redeploy: `vercel deploy --prod --yes`

**Validação:**

```bash
curl -sSI https://intranet.asof.com.br/
# Esperado: 307 → /app
curl -sSI https://intranet.asof.com.br/app
# Esperado: 307 → /login (sem sessão)
curl -sSI https://intranet.asof.com.br/login
# Esperado: 200
```

---

## 7. Comandos úteis

```bash
# Inspecionar projeto
vercel project inspect asof-intranet

# Listar deployments
vercel ls asof-intranet --limit 20

# Listar aliases
vercel alias list

# Verificar env vars
vercel env ls

# Logs de produção
vercel logs --prod

# Status do banco Supabase
npm run db:supabase:status

# Drizzle Studio (local)
npm run db:studio
```

## 8. Diagnóstico com Logger Estruturado

O sistema usa `src/lib/logger.ts` para logs estruturados com redação automática de PII. Em produção, os logs são emitidos em formato JSON; em desenvolvimento, colorizados.

### Níveis de log

| Nível   | Uso                                |
| ------- | ---------------------------------- |
| `trace` | Rastreamento detalhado de execução |
| `debug` | Informações de depuração           |
| `info`  | Eventos normais do sistema         |
| `warn`  | Condições anômalas não críticas    |
| `error` | Falhas que requerem atenção        |
| `fatal` | Erros irrecuperáveis               |

Configuração via env var `LOG_LEVEL` (padrão: `info`).

### Logs de produção (Vercel)

```bash
vercel logs --prod
```

Os logs JSON incluem campos como `module`, `level`, `message`, `timestamp` e `context` (com PII redigido).

### Logs locais

```bash
npm run dev
```

Formato colorizado com prefixo `[module] level: message`.

---

## 9. Contatos e referências

- **Repositório:** https://github.com/prof-ramos/intranet
- **Projeto Supabase:** `vmohxhyfgywaqfuqeuom` (`db-intranet`)
- **Domínio:** `https://intranet.asof.com.br`
- **Checklist de release:** ARCHITECTURE.md §6.4
- **CI/CD:** ARCHITECTURE.md §6.5
- **Worktrees:** CLAUDE.md §Git Worktree + Subagentes Paralelos
