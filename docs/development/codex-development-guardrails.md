# Codex Development Guardrails

Este projeto usa AGENTS.md e CLAUDE.md como instruções humanas/canônicas, mas
também precisa de verificações executáveis para evitar ruído de worktrees,
arquivos locais e PRs incompletos.

## Configuração Codex

- `.codex/config.toml` habilita `features.codex_hooks` no escopo do projeto.
- O projeto precisa estar marcado como trusted no Codex para carregar `.codex/`.
- `.codex/hooks.json` registra um `PreToolUse` para Bash que chama
  `scripts/codex-pre-tool-use-policy.mjs`.

## Scripts de Guardrail

Use estes comandos antes de PRs ou mudanças grandes:

```bash
npm run scope:status
npm run validate:quick
npm run validate:full
npm run pr:check
```

`npm run scope:status` mostra branch, status, staged/untracked e worktrees.

`npm run scope:check` falha quando há sinais comuns de escopo incorreto:

- arquivos `.env*`, `.vercel/`, `.maestri/`, `.claude/worktrees/`, `.worktrees/`
  ou `.omc/` staged/untracked indevidamente;
- migration SQL de Drizzle staged sem `drizzle/postgres/meta/_journal.json`;
- erros de whitespace no diff staged.

`npm run pr:check` exige árvore limpa e roda:

```bash
npm run typecheck
npm run lint
npm run test
npm run test:db
npm run build
```

## Hooks Recomendados

Os hooks devem chamar scripts versionados em vez de duplicar lógica:

- antes de comandos Git destrutivos/amplos: bloquear `git add .`, `git add -A`,
  `git reset --hard`, `git checkout --`, `git clean -fd` e
  `git worktree remove --force` via `PreToolUse`;
- antes de commit/PR: executar `npm run scope:check`;
- antes de abrir PR: executar `npm run pr:check`;
- após mudanças em `drizzle/postgres/**`: exigir `npm run test:db`;
- após mudanças em `src/**`, `package.json`, `next.config.ts` ou configs de
  build: exigir pelo menos `npm run validate:quick`.

## CodeRabbit

Migrations em `drizzle/postgres/**` são parte crítica do projeto. Elas devem ser
revisadas pelo CodeRabbit com foco em RLS, LGPD, enums, índices e alinhamento com
`_journal.json`.
