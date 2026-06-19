# Matriz Oficial De Ambientes

Este documento é a fonte canônica para ambientes, bancos, dados, migrations e
CI/CD da intranet ASOF. Se outro arquivo discordar daqui, este documento vence e
o outro arquivo deve ser corrigido.

Decisões arquiteturais:

- `docs/adr/015-official-environment-and-data-matrix.md`
- `docs/adr/016-neon-free-tier-pre-go-live-reset.md`
- `docs/adr/017-neon-governance-cleanup-post-reset.md`

## Regra De Ouro

Não crie novo banco, branch Neon, workflow de staging, env de Vercel, dump local
ou instrução de migration sem atualizar esta matriz e o ADR correspondente.

## Matriz

| Ambiente | Banco oficial | Dados | Uso permitido | Migration |
|---|---|---|---|---|
| Produção | Neon `main`, endpoint `ep-empty-cake-ac26vl6w` | reais | runtime Vercel, smoke controlado, operação ASOF | manual via `ALLOW_PRODUCTION_MIGRATIONS=true npm run db:migrate` após backup, janela e rollback |
| Staging | Neon branch dedicado e nomeado, quando provisionado | snapshot controlado ou seed representativo | validação pré-produção, ensaio de migrations e smoke não destrutivo | `npm run db:migrate` com `DATABASE_MIGRATION_ENV=staging`, `ALLOW_STAGING_MIGRATIONS=true` e `DATABASE_STAGING_HOST` igual ao host direto oficial; nunca usar secrets de produção |
| Preview PR | branch Neon descartável ou sem banco real | sintético/anônimo | build, UI e verificações de PR | somente em banco descartável; Preview não herda envs gerais de produção |
| Dev diário | Postgres local `asof_intranet` | seed sintético robusto, sem PII real | desenvolvimento normal, refactors, UI, testes manuais comuns | `npm run db:migrate` |
| Dev realista restrito | Neon `vercel-dev` ou clone local autorizado | PII real copiada de produção | bugs de volume, importação, relatórios, performance e filtros dependentes de dados reais | controlada; não aplicar migration direto na branch Neon `main` |
| Integração local | Postgres local `asof_intranet_test` | sintético | testes DML/integration | `npm run db:migrate`, bloqueado contra host remoto por padrão |
| E2E local/CI | Postgres local `asof_test` | sintético recriado | Playwright em `127.0.0.1:3001` | recriado pelo `e2e/global-setup.ts` |
| Smoke produção | produção live | reais + registros `SMOKE_*` temporários | validação pós-deploy em janela controlada | sem migration; cria dados marcados e limpa dados operacionais, preservando auditoria |

## Produção E Pré-Go-Live

Enquanto a intranet ainda não estiver em uso real pela ASOF, o Neon `main` é o
banco oficial de **pré-go-live**. Ele pode ser resetado de forma controlada para
eliminar estados inválidos criados durante vibe coding, desde que existam:

- branch backup Neon criado antes da mudança;
- dump local comprimido usando conexão direta;
- nova `ENCRYPTION_MASTER_KEY` registrada em `.env.local` e na Vercel;
- migrations reaplicadas do zero;
- seed administrativo executado;
- validação posterior com `npm run test:db`.

Depois do go-live real, reset destrutivo do `main` fica proibido; usar restore,
migration corretiva ou plano de manutenção aprovado.

Produção/pré-go-live usa como contrato oficial:

- `DATABASE_URL`: URL pooled/runtime do Neon.
- `DATABASE_MIGRATION_URL`: URL direct/non-pooling do Neon.
- `ENCRYPTION_MASTER_KEY`: chave única para PII, login hashing, settings e
  segredos de integrações.

Variáveis injetadas pela Vercel Storage Integration podem existir:

- `DATABASE_POSTGRES_URL`
- `DATABASE_POSTGRES_URL_NON_POOLING`
- `POSTGRES_URL`
- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_PRISMA_URL`
- `DATABASE_URL_UNPOOLED`

Elas não são o caminho operacional documentado para a aplicação. O código,
runbooks e workflows devem usar `DATABASE_URL` e `DATABASE_MIGRATION_URL`
explicitamente.

### Neon Free Tier

No Free Tier, a janela máxima de Instant Restore/Time Travel é 6 horas. Por isso,
não confie só em PITR para mudanças destrutivas. Antes de resetar ou reimportar
o `main`, crie um branch backup copy-on-write e um dump local comprimido. Após a
validação do novo estado, mantenha apenas backups necessários e nunca commite
dumps.

### Governança pós-reset (ADR 017)

Após o reset ADR 016, a área Neon foi limpa: `vercel-dev` foi resetado para
`main` (mantido como slot "Dev realista restrito"); `dev/migration-test` e
`backup/pre-reset-20260618T191453Z` foram excluídos; `backup/post-clean-main`
permanece como rollback net até o go-live estabilizar. Restam 3 branches no
projeto `intranet-db` (limite Free Tier: 10).

Rotação de credenciais pendente no console Neon (a org é "managed by Vercel",
o que restringe `neonctl`/API para operações de projeto):

- **Urgente:** revogar a API key `napi_0cmv74hlnn1x...` (controle sobre toda a
  org, incluindo `main`) em Organization → API keys.
- Rotacionar a senha do role `neondb_owner` do `vercel-dev` e atualizar o
  `DATABASE_URL` dos ambientes que o usam.

## Staging

Staging não é um conceito abstrato. Ele só existe quando todos os itens abaixo
estiverem definidos:

- branch/banco Neon nomeado;
- secrets próprios no ambiente `staging` do GitHub/Vercel;
- owner técnico;
- política de reset/descarte;
- smoke esperado;
- confirmação de que não há env herdado de produção.
- `DATABASE_STAGING_HOST` configurado com o host direto do branch de staging.

Enquanto isso não existir, não use staging como destino de smoke, migration ou
teste manual. Use E2E local/CI ou produção em janela controlada, conforme ADR 009.

## Preview

Preview de PR nunca aponta para produção. O ambiente Preview da Vercel deve
ficar sem envs gerais de banco ou usar banco descartável criado especificamente
para aquele preview.

No setup atual via Vercel Storage Integration, algumas variáveis de banco podem
aparecer também em Preview/Development por injeção automática da plataforma.
Isso não torna esses ambientes oficiais. Até existir branch Neon descartável e
segredos próprios, Preview não deve ser usado para validação de dados reais.

## Desenvolvimento

O caminho padrão de onboarding e desenvolvimento diário é:

```bash
createdb asof_intranet
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Dados reais de produção só entram em desenvolvimento quando houver necessidade
concreta e autorização. Preferir branch/snapshot Neon a dump local. Se dump local
for inevitável, remover arquivos temporários imediatamente e tratar o banco local
como PII sensível.

O seed sintético de desenvolvimento deve ser separado do seed E2E. O seed E2E
existe para specs determinísticas e pode continuar pequeno; o seed de
desenvolvimento deve simular volume e variedade suficientes para UI, dashboard,
busca, filtros e relatórios sem usar dados reais da ASOF. O comando oficial é
`npm run db:seed:dev`.

`npm run db:seed:dev` bloqueia hosts remotos por padrão. Para popular um branch
remoto descartável com dados sintéticos, use
`ALLOW_REMOTE_DEV_SEED=SEED_SYNTHETIC_DATA` e registre o motivo no plano/ADR
aplicável. Nunca use esse override contra produção.

O seed de desenvolvimento deve cobrir os módulos principais, não apenas
`associates`: associados, mensalidades, atividades, consultas jurídicas e
ofícios. Volume inicial: 120 oficiais sintéticos, 30 atividades, 20 consultas jurídicas,
12 ofícios e mensalidades suficientes para
exercitar financeiro e dashboard.

## Testes

- `npm run test` não deve depender de banco real.
- `npm run test:db` valida contrato de schema contra o `DATABASE_URL`
  configurado.
- `npm run test:integration` usa `.env.test.local` e bloqueia hosts remotos por
  padrão.
- `npm run test:e2e` cria/recria `asof_test`, sobe Next.js em `127.0.0.1:3001` e
  nunca deve apontar para `localhost:3000` ou produção.

## Migrations

Use `npm run db:migrate` como caminho oficial. Esse comando passa por
`scripts/guarded-migrate.ts`.

Exceções:

- `CREATE INDEX CONCURRENTLY`
- `DROP INDEX CONCURRENTLY`
- alterações PostgreSQL que não podem rodar dentro da transação usada pelo
  Drizzle

Essas exceções exigem runbook: backup/snapshot, teste em ambiente separado,
janela aprovada, `psql "$DATABASE_MIGRATION_URL"` e validação posterior com
`npm run test:db`.

## Mudando Esta Matriz

Toda mudança deve responder:

- Qual ambiente muda?
- Qual banco/branch/endpoint é afetado?
- Que tipo de dado existirá ali?
- Quem é o owner?
- Como descartar ou restaurar?
- Qual comando de validação prova que o ambiente está correto?
- Quais documentos e workflows precisam ser atualizados junto?
