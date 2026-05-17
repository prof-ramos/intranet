# Auditoria Supabase/Postgres/Vercel

Data: 2026-05-13  
Escopo: auditoria documental e operacional de banco de dados, Supabase e Vercel.  
Status inicial: somente leitura. Nenhuma correcao de codigo, migration, variavel de ambiente ou configuracao remota havia sido aplicada na etapa de auditoria.

Atualizacao de remediacao local: apos autorizacao separada, foram aplicadas correcoes locais no repositorio e no Postgres local:

- `0013_db_contract_hardening.sql` adiciona indices faltantes e habilita RLS/policy em `monthly_payments`.
- `src/lib/db/schema.integration.test.ts` foi atualizado para cobrir `oficios`, `official_letter_status`, `official_letter`, indices e RLS/policies.
- `scripts/supabase-status.ts` foi restaurado com teste unitario e sem impressao de segredos.
- `src/lib/env.ts` deixou de exigir `SESSION_SECRET` e passou a tratar strings vazias de envs opcionais como ausentes.
- Nenhuma mudanca foi aplicada no Supabase remoto, na Vercel remota ou em secrets.

Atualizacao de decisao operacional em 2026-05-17:

- O Supabase oficial de producao passa a ser `uftzjmmfkoqhjjwsiynk` (`db-intranet`).
- `vmohxhyfgywaqfuqeuom` deve ser tratado como drift ate reconciliacao explicita.
- Staging/preview deve usar Supabase separado de producao.
- Primeiro go-live exige hardening operacional antes de producao, com migrations e deploy manuais.
- RLS restritiva por papel/sessao nao bloqueia o primeiro go-live, desde que RLS esteja habilitado/forcado no remoto correto e nenhuma tabela sensivel seja exposta diretamente via Data API/browser.
- Escopo bloqueante do dia 1: login, dashboard, associados, juridico e oficios.
- Financeiro, integracoes/webhooks e notificacoes realtime nao bloqueiam o dia 1, salvo dependencia operacional separada.

Atualizacao de remediacao Vercel em 2026-05-17:

- O Project Setting remoto da Vercel foi ajustado via API para `framework=nextjs`.
- `vercel project inspect asof-intranet` passou a mostrar `Framework Preset: Next.js`, `Build Command: npm run build` ou `next build`, e `Output Directory: Next.js default`.
- Smoke do dominio customizado: `/` respondeu `307` para `/app`, `/app` respondeu `307` para `/login` sem sessao, e `/login` respondeu `200` com cabecalho Next.js.
- O Browser interno em `http://localhost:3000/app` carregou o painel local (`ASOF Intranet`, `Painel da diretoria`) sem alertas de erro no DOM.

Atualizacao de validacao E2E em 2026-05-17:

- `npm run test:e2e` passou com `51 passed`.
- Durante o bootstrap do banco de testes local, a migration `0037_add_notifications.sql` pode emitir warning `wal_level is insufficient to publish logical changes` ao tentar criar `supabase_realtime`.
- Esse warning nao bloqueou migrations, seed nem os cenarios E2E. Ele indica apenas que o Postgres local nao esta configurado para logical replication/publications.
- Como notificacoes realtime nao bloqueiam o primeiro go-live, esse warning local deve ser tratado como ruido operacional conhecido, nao como falha funcional do app.

Atualizacao de publicacao do codigo em 2026-05-17:

- A `main` local foi rebaseada sobre `origin/main` apos o remoto avancar para `171d5e8`.
- O commit `4e9adfa chore: harden intranet modules` foi publicado em `origin/main`.
- Validacoes executadas antes da publicacao: `npm run typecheck`, `npm run test` (`100` arquivos, `731` testes), `npm run lint` e `npm run build`.
- Esta publicacao nao aplicou migrations no Supabase remoto, nao alterou env vars/secrets na Vercel e nao executou deploy de producao.
- O status operacional abaixo continua valido: reconciliacao do Supabase remoto correto, RLS/Data API, migrations remotas e go-live seguem como etapas manuais separadas.

## Resumo executivo

A configuracao atual ainda tem divergencias criticas entre o repositorio, o banco local, o Supabase remoto e o projeto Vercel. O risco principal nao e apenas uma migration pendente: ha sinais de que o ambiente remoto atualmente configurado nao e o mesmo ambiente historicamente validado, nao tem historico Drizzle aplicado, esta sem RLS nas tabelas publicas e nao possui todo o schema esperado pelo codigo atual.

Tambem ha drift operacional no proprio repositorio: `npm run test:db` falha porque o contrato de schema nao acompanha `oficios`; `monthly_payments` esta sem RLS no banco local; e o script documentado `npm run db:supabase:status` aponta para um arquivo inexistente.

Este documento consolida os achados e define a ordem recomendada de correcao futura. As proximas mudancas devem ser autorizadas separadamente.

## Arquivos e areas analisadas

Arquivos de configuracao e deploy:

- `package.json`
- `package-lock.json`
- `.env.example`
- `.gitignore`
- `.mcp.json` (ignorado pelo git)
- `.vercel/README.txt`, `.vercel/repo.json`, `.vercel/.env.production.local` (ignorados pelo git)
- `vercel.json`
- `.github/workflows/ci.yml`
- `drizzle.config.ts`
- `next.config.ts`
- `vitest.integration.config.ts`
- `playwright.config.ts`

Arquivos de banco, Supabase e scripts:

- `src/lib/env.ts`
- `src/lib/db/index.ts`
- `src/lib/db/schema/*`
- `src/lib/db/schema.integration.test.ts`
- `src/lib/supabase/config.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/proxy.ts`
- `src/lib/supabase/admin.ts`
- `src/lib/storage/client.ts`
- `src/lib/storage/index.ts`
- `scripts/check-db.ts`
- `scripts/seed-admin.ts`
- `scripts/seed-e2e.ts`
- `scripts/import-asof-associados-json.ts`
- `e2e/global-setup.ts`
- `e2e/helpers/db.ts`
- `drizzle/postgres/*.sql`
- `drizzle/postgres/meta/_journal.json`

Documentacao interna correlata:

- `README.md`
- `CLAUDE.md`
- `CONTRIBUTING.md`
- `ARCHITECTURE.md`
- `AGENTS.md`
- `docs/migrationdb.md`
- `docs/adr/ADR-001-rls-removal-and-reimplementation.md`

## Documentacao externa consultada

- [Supabase changelog: Tables not exposed to Data and GraphQL API automatically](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Supabase: Securing your API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase: Connecting to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Vercel: Project configuration with vercel.json](https://vercel.com/docs/project-configuration/vercel-json)
- Context7: `/supabase/supabase`, `/supabase/ssr`, `/vercel/vercel`, `/llmstxt/vercel_llms-full_txt`
- Skill local `supabase-postgres-best-practices`: RLS, connection pooling e prepared statements com pooler transaction-mode.

Pontos relevantes dessas fontes:

- Supabase separa grants de Data API e RLS: grants controlam se uma role acessa o objeto; RLS controla quais linhas ficam visiveis.
- Novos projetos/tabelas do Supabase passam a exigir decisoes explicitas de exposicao via Data API. Migrations devem agrupar grants, RLS e policies quando a tabela precisar ser acessivel via REST/GraphQL.
- Para serverless/Vercel, Supabase recomenda pooler transaction-mode para runtime; prepared statements devem ser desligados nesse modo.
- Migrations, backups e comandos administrativos devem usar conexao direta ou session-mode, nao transaction-mode na porta `6543`.
- `vercel.json` pode definir o framework, mas o projeto remoto ainda deve ser verificado porque preset/output errados podem gerar deploy `Ready` servindo apenas estaticos.

## Findings

| Severidade | Finding | Evidencia | Risco | Correcao futura recomendada |
|---|---|---|---|---|
| P0 | Supabase remoto configurado nao corresponde ao remoto oficialmente escolhido | `.mcp.json` e envs locais apontam para `vmohxhyfgywaqfuqeuom`; `uftzjmmfkoqhjjwsiynk` foi definido em 2026-05-17 como `db-intranet` de producao | Migrations e dados podem estar sendo aplicados/consultados no projeto errado | Alinhar `.mcp.json`, Vercel envs e docs ao alvo `uftzjmmfkoqhjjwsiynk`; so depois aplicar migrations |
| P0 | Banco remoto atual esta sem historico Drizzle aplicado | Consulta metadata-only retornou `remoteMigrations=0` em `drizzle.__drizzle_migrations` | Deploy remoto pode rodar contra schema incompleto/desalinhado | Reconciliar o banco remoto correto com `_journal.json`; aplicar migrations na ordem correta usando URL non-pooling |
| P0 | RLS desligado no remoto atual | Metadata remoto: tabelas publicas com `rls=false`, `policies=0`, incluindo `admins`, `associates`, `audit_logs`, `monthly_payments` | Se houver grants/Data API, dados LGPD podem ficar expostos; tambem contradiz docs internas | Habilitar RLS e policies no remoto correto; decidir se policies serao permissivas ou restritivas por role/contexto |
| P0 | Schema remoto atual nao tem `oficios` e tem tabela extra `notes` | Metadata remoto lista `notes`, mas nao `oficios`; local tem `oficios` | Codigo atual de secretaria/oficios pode quebrar em producao; tabela extra sugere drift/manual change | Rodar diff controlado e decidir se `notes` deve ser removida/migrada; aplicar migration `0012` no remoto correto |
| P1 | `pg_trgm` ausente no remoto atual | Metadata remoto retornou `extensions=pg_stat_statements`; nao retornou `pg_trgm` | Indices trigram esperados podem estar ausentes, afetando performance e contrato | Garantir aplicacao da migration `0004_database_optimization.sql` no remoto correto |
| P1 | `npm run test:db` falhava no local por contrato desatualizado | Falhas em colunas, enums e indices: DB tinha `oficios`, `official_letter_status`, `audit_entity_type=official_letter`; teste nao esperava esses itens | O principal gate de schema ficava vermelho; futuras mudancas de DB ficavam sem sinal confiavel | Remediado localmente: contrato atualizado e `npm run test:db` passa |
| P1 | `monthly_payments` estava sem RLS/policies no local | Metadata local inicial: `monthly_payments: rls=false force=false policies=0` | Tabela financeira sensivel sem defense-in-depth; contradizia padrao documentado de RLS | Remediado localmente em `0013_db_contract_hardening.sql`; pendente aplicar no remoto correto |
| P1 | Script documentado `db:supabase:status` estava quebrado | `package.json` apontava `tsx scripts/supabase-status.ts`; arquivo nao existia; README/CLAUDE/CONTRIBUTING citavam o comando | Operacao remota sem UI ficava indisponivel; docs enganavam o operador | Remediado localmente com `scripts/supabase-status.ts` e teste unitario |
| P1 | Vercel remoto mostrava Framework Preset `Other` | Remediado em 2026-05-17: `vercel project inspect asof-intranet` passou a mostrar `Framework Preset: Next.js`, build Next.js e output default | Se o setting regredir, deploy pode voltar ao erro `404 NOT_FOUND` por output estatico | Manter `vercel.json`, revalidar `vercel project inspect` antes de go-live e confirmar smoke em `/`, `/app` e `/login` |
| P1 | `.vercel/.env.production.local` contem segredos e valores vazios criticos | Arquivo ignorado pelo git existe localmente; contem chaves Supabase/Vercel; tambem `DATABASE_URL`, `SESSION_SECRET` e `POSTGRES_*` vazios | Risco de exposicao local e confusao operacional; build local com env de producao pode falhar | Remover arquivo local quando nao necessario; rotacionar segredos se houve qualquer exposicao; usar `vercel env pull` sob demanda |
| P2 | `SESSION_SECRET` estava inconsistente entre codigo e docs | `src/lib/env.ts` exigia `SESSION_SECRET`; `CONTRIBUTING.md` e `CLAUDE.md` dizem para nao reintroduzir requisito de JWT customizado | Build/deploy exigia env obsoleta ou docs ficavam incorretas | Remediado localmente: `envSchema` nao exige `SESSION_SECRET` |
| P2 | Env local/remoto tem nomes duplicados e prioridades perigosas | Runtime prefere `DATABASE_URL`; Vercel tem `DATABASE_URL` e `POSTGRES_*` vazios em alguns arquivos locais; `DATABASE_POSTGRES_URL` existe | Uma env vazia ou errada pode mascarar a URL correta em build/runtime | Parcialmente remediado localmente: `envSchema` trata strings vazias opcionais como ausentes; matriz remota ainda pendente |
| P2 | Policies RLS atuais sao permissivas quando existem | Migrations `0009` e `0012` criam policies `FOR ALL TO PUBLIC USING (true)` | Se tabelas forem expostas via Data API, RLS permissiva nao protege dados LGPD | Como o app usa Drizzle server-side, decidir primeiro se Data API sera desabilitada/restrita; se houver cliente browser, criar policies restritivas |
| P2 | Migrations recentes nao cobrem todos os indices declarados no schema Drizzle | `src/lib/db/schema/oficios.ts` declara `idx_oficios_created_by` e `idx_oficios_updated_by`, mas migration `0012` nao cria esses indices; `finance.ts` declara indices adicionais nao presentes no local | Drift entre schema Drizzle e banco real; futuras geracoes podem produzir migrations inesperadas | Gerar/revisar migration complementar para indices faltantes apos estabilizar remoto |

## Evidencia operacional

Comandos executados em modo somente leitura ou metadata-only:

```bash
git status --short
rg --files -g '!node_modules' -g '!.next' -g '!coverage' -g '!test-results'
rg -n 'DATABASE_|SUPABASE|POSTGRES|Vercel|vercel|drizzle|postgres|RLS|service_role|NEXT_PUBLIC|pooler|migration'
npm run test:db
vercel --version
vercel project inspect asof-intranet
vercel env ls
curl -fsSL https://supabase.com/changelog.md
curl -fsSL https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically.md
curl -fsSL https://supabase.com/docs/guides/api/securing-your-api.md
curl -fsSL https://supabase.com/docs/guides/database/connecting-to-postgres.md
```

Consultas locais metadata-only:

```sql
select c.relname, c.relrowsecurity, c.relforcerowsecurity, count(p.polname)::int as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity, c.relforcerowsecurity
order by c.relname;
```

Resultado local resumido:

```text
activities: rls=true policies=1
admins: rls=true policies=1
assignments: rls=true policies=1
associates: rls=true policies=1
audit_logs: rls=true policies=1
legal_consultations: rls=true policies=1
legal_notes: rls=true policies=1
legal_opinion_tags: rls=true policies=1
legal_opinions: rls=true policies=1
legal_processes: rls=true policies=1
login_attempts: rls=true policies=1
monthly_payments: rls=false policies=0
oficios: rls=true policies=1
rate_limits: rls=true policies=1
```

Resultado local apos remediacao `0013_db_contract_hardening.sql`:

```text
npm run test:db
Test Files  1 passed (1)
Tests  6 passed (6)
```

Resultado remoto resumido, usando somente metadados:

```text
remoteDatabase=postgres
remoteMigrations=0
public tables: activities, admins, assignments, associates, audit_logs,
legal_consultations, legal_notes, legal_opinion_tags, legal_opinions,
legal_processes, login_attempts, monthly_payments, notes, rate_limits
RLS remoto: false em todas as tabelas publicas listadas
policy_count remoto: 0 em todas as tabelas publicas listadas
extensions remotas detectadas: pg_stat_statements
```

Falha local de `npm run test:db`:

```text
3 failed | 2 passed

Falhas:
- has all expected public tables and columns
- has all expected enum labels in the right order
- has all expected indexes and unique constraints

Diferencas principais:
- tabela oficios existe no banco, mas nao no expectedColumns
- enum official_letter_status existe no banco, mas nao no expectedEnums
- audit_entity_type contem official_letter, mas o teste nao espera
- indices de oficios existem no banco, mas nao no expectedIndexes
```

Checagem de scripts:

```text
db:supabase:status: missing scripts/supabase-status.ts
```

Checagem de scripts apos remediacao:

```text
npm run test -- scripts/supabase-status.test.ts
Test Files  1 passed (1)
Tests  5 passed (5)

node --env-file=.env.development.local node_modules/tsx/dist/cli.mjs scripts/supabase-status.ts
Supabase project: vmohxhyfgywaqfuqeuom.supabase.co
oficios: ERROR count unavailable
```

O status script confirmou que a Data API nao deve converter `count: null` em `0`; isso reforca o finding de drift remoto para `oficios`.

Checagem Vercel:

```text
Vercel CLI 53.3.2
Project: asof-intranet
Framework Preset: Other
Output Directory: public if it exists, or .
```

O build output local em `.vercel/output/builds.json` indicou uso de `@vercel/next` e `framework=nextjs`, mas com erro de build anterior. Isso nao substitui a necessidade de corrigir o Project Setting remoto, porque `vercel project inspect` ainda mostra `Other`.

## Observacoes sobre segredos

Foram inspecionados nomes de variaveis e presenca/ausencia de valores, mas valores sensiveis nao devem ser copiados para este documento. Pontos confirmados:

- `.vercel/.env.production.local` existe localmente e contem segredos Supabase/Vercel.
- `.env.development.local` tambem contem chaves Supabase.
- Ambos estao ignorados pelo git.
- Se qualquer trecho desses arquivos tiver sido exposto em chat, terminal compartilhado, PR, log ou artefato, a acao correta e rotacionar as chaves afetadas no Supabase/Vercel.

## Plano de correcao futuro recomendado

1. Alinhar o alvo remoto oficial

   O Supabase oficial da intranet e `uftzjmmfkoqhjjwsiynk` (`db-intranet`). Alinhar `.mcp.json`, Vercel envs, docs e comandos operacionais para esse alvo. Nao aplicar migrations enquanto qualquer ferramenta ainda apontar para `vmohxhyfgywaqfuqeuom` sem justificativa explicita.

2. Recuperar o estado remoto

   No projeto Supabase oficial, comparar `_journal.json`, `drizzle.__drizzle_migrations`, tabelas publicas, enums, indices e extensoes. Aplicar migrations com URL direta/session-mode, nunca com transaction pooler `6543`.

3. Corrigir RLS e Data API

   Para tabelas acessadas somente pelo app server via Drizzle, preferir nao expor via Data API. Se alguma tabela precisar ser acessada por Supabase client/REST/GraphQL, adicionar grants explicitos, RLS habilitado e policies restritivas. Evitar policies `PUBLIC USING (true)` em qualquer superficie exposta ao browser.

4. Restaurar o gate local de DB

   Atualizar `src/lib/db/schema.integration.test.ts` para `oficios`, `official_letter_status`, `official_letter` e indices reais. Adicionar cobertura explicita de RLS/policies para `monthly_payments` depois da migration.

5. Corrigir drift schema x migration

   Revisar indices declarados no Drizzle mas ausentes no banco real, especialmente `oficios` e `monthly_payments`. Gerar migration complementar somente depois de confirmar o banco remoto alvo.

6. Resolver automacao Supabase

   Restaurar `scripts/supabase-status.ts` com saida metadata-only segura ou remover `db:supabase:status` de `package.json` e docs. Como a preferencia operacional e evitar UI, a recomendacao e restaurar o script.

7. Verificar Vercel

   O Project Setting remoto foi ajustado em 2026-05-17 para Next.js. Antes do go-live, revalidar:

   ```bash
   vercel project inspect asof-intranet
   vercel inspect intranet.asof.com.br
   ```

8. Resolver `SESSION_SECRET`

   Decidir se a variavel ainda tem funcao real. Se nao tiver, remover a obrigatoriedade de `src/lib/env.ts` e atualizar testes. Se tiver, corrigir `CLAUDE.md` e `CONTRIBUTING.md` para nao dizerem o contrario.

9. Higienizar envs locais

   Remover `.vercel/.env.production.local` quando nao for necessario para diagnostico, manter `vercel env pull` como fluxo sob demanda e rotacionar segredos caso tenha havido exposicao.

## Validacao esperada apos autorizacao das correcoes

Depois das correcoes futuras, validar nesta ordem:

```bash
npm run test:db
npm run typecheck
npm run test
npm run build
```

Depois, executar consulta metadata-only no Supabase remoto oficial para confirmar:

- `drizzle.__drizzle_migrations` alinhado com `drizzle/postgres/meta/_journal.json`
- RLS/policies conforme decisao de seguranca
- `pg_trgm` e `pg_stat_statements` presentes quando esperados
- `oficios` presente
- ausencia de tabelas extras nao justificadas, como `notes`, ou decisao documentada sobre elas
- indices esperados presentes

## Nao fazer sem autorizacao separada

- Nao aplicar migrations no remoto.
- Nao editar envs da Vercel.
- Nao remover tabelas remotas.
- Nao rotacionar chaves.
- Nao alterar RLS/policies.
- Nao atualizar `src/lib/env.ts`.
- Nao restaurar/remover `db:supabase:status`.
