# ADR 015: Matriz Oficial De Ambientes, Dados E Migrations

Status: accepted
Data: 2026-06-18

## Contexto

O projeto acumulou caminhos paralelos para desenvolvimento, staging, preview,
testes, migrations e bancos realistas com dados de produção. Parte dessa
variação era útil durante a estreia, mas depois do go-live virou fonte de
ambiguidade: agentes e humanos podiam escolher entre `vercel-dev`, dump local,
banco vazio, workflow de staging, Preview sem banco e smoke em produção sem uma
autoridade única.

Os ADRs 004, 007, 009 e 010 continuam válidos para o primeiro go-live e para a
política de produção, mas faltava uma decisão pós-go-live que consolidasse o
estado oficial de ambientes e dados.

## Decisão

Adotar `docs/environments.md` como a matriz operacional canônica para ambientes,
bancos, dados, migrations, CI/CD e documentação relacionada.

Nenhum documento, workflow, script ou instrução para agentes deve introduzir um
novo caminho de banco, staging, preview, migration ou dados realistas sem:

1. atualizar `docs/environments.md`;
2. criar ou atualizar o ADR relevante;
3. refletir a mudança em `README.md`, `DATABASE.md`, `docs/runbook.md`,
   `AGENTS.md` e `CLAUDE.md` quando esses arquivos forem afetados.

A política oficial passa a ser:

- Produção usa somente Neon `main`/endpoint `ep-empty-cake-ac26vl6w`, com
  `DATABASE_URL` pooled e `DATABASE_MIGRATION_URL` direct.
- Variáveis de banco injetadas pela Vercel Storage Integration podem coexistir,
  mas produção não as usa como contrato operacional. O caminho oficial segue
  sendo `DATABASE_URL` e `DATABASE_MIGRATION_URL` explícitos.
- Staging só existe quando houver alvo nomeado, secrets próprios e owner
  operacional. Sem isso, qualquer workflow de staging deve ficar desabilitado ou
  apontar explicitamente para a matriz como pré-requisito.
- Preview de PR não pode herdar envs gerais de produção. Deve usar banco
  descartável separado ou não ter banco real.
- Desenvolvimento diário usa Postgres local com seed sintético como caminho
  padrão.
- Dados reais de produção em `vercel-dev`, branch Neon clonado ou dump local são
  exceção restrita para diagnóstico, performance/importação e bugs dependentes
  de volume. Não são default de onboarding.
- E2E e testes de integração usam bancos locais dedicados e recriados/isolados.
- Migrations oficiais passam por `npm run db:migrate`, exceto operações
  PostgreSQL explicitamente incompatíveis com transação, que seguem o runbook.

## Consequências

- Documentação duplicada deve ser reduzida para evitar drift. Arquivos de
  onboarding podem resumir a política, mas a matriz oficial fica em
  `docs/environments.md`.
- Workflows de CI/CD devem remover resíduos de arquiteturas antigas e usar os
  comandos oficiais sempre que possível.
- Qualquer alternativa útil deve ser marcada como exceção com owner, risco LGPD,
  pré-requisitos e descarte/limpeza.
- Alterações futuras em ambiente ou banco são tratadas como decisão
  arquitetural, não como ajuste casual de README.

## Opções Rejeitadas

- Manter várias alternativas equivalentes no README: rejeitado porque perpetua a
  confusão original.
- Tornar `vercel-dev` com dados reais o caminho padrão: rejeitado por risco
  LGPD e por misturar desenvolvimento diário com dados sensíveis.
- Remover todos os caminhos realistas com PII: rejeitado porque o projeto ainda
  precisa de uma rota controlada para bugs de volume, importação e performance.
- Automatizar migrations de produção no merge para `main`: continua rejeitado
  pelo ADR 004.
