# Codex Worktrees e Automacoes

Este fluxo define como usar worktrees do Codex neste repositório sem misturar
trabalho em andamento, snapshots locais e automações de background.

## Regra operacional

- Use `Worktree` para tarefas independentes, demoradas ou de baixo acoplamento
  com o checkout local.
- Use `Local` quando precisar inspecionar no IDE principal, reaproveitar um dev
  server ja aberto ou validar algo que depende do estado local atual.
- Use `Handoff` para mover uma thread entre `Local` e `Worktree`; nao tente
  fazer checkout manual da mesma branch em dois worktrees ao mesmo tempo.
- Ao criar uma branch dentro de um worktree, trate aquele worktree como o dono
  temporario dessa branch. Para trabalhar nela no checkout local, faca handoff
  ou troque o worktree para outro HEAD/branch antes.
- Arquivos ignorados pelo Git nao acompanham handoff. Antes de mover uma thread,
  confira se a tarefa depende de `.env.local`, caches, downloads ou artefatos
  locais ignorados.

## Auditoria rapida

Rode antes de handoff, PR ou limpeza manual:

```bash
npm run scope:status
git worktree list --porcelain
find "${CODEX_HOME:-$HOME/.codex}/worktrees" -mindepth 1 -maxdepth 2 -type d -print 2>/dev/null | sort
find "${CODEX_HOME:-$HOME/.codex}/automations" -maxdepth 3 -name automation.toml -print 2>/dev/null | sort
```

Interprete assim:

- `npm run scope:status` mostra branch, status, whitespace staged e worktrees.
- `git worktree list --porcelain` e a fonte Git autoritativa para checkouts
  ligados ao repositório.
- `${CODEX_HOME:-$HOME/.codex}/worktrees` mostra worktrees gerenciados pelo
  Codex quando o app ja criou ambientes de background.
- `${CODEX_HOME:-$HOME/.codex}/automations` mostra automações locais salvas pelo
  Codex app.

## Limpeza

Nao remova worktrees automaticamente como parte de uma automação. Antes de
limpar:

1. Confirme que a thread associada foi arquivada ou nao e mais necessaria.
2. Confirme que nao ha branch exclusiva presa ao worktree.
3. Salve ou descarte deliberadamente qualquer diff local.
4. Use a interface do Codex app quando a pasta for gerenciada pelo app.
5. Use `git worktree remove <path>` apenas para worktrees Git que voce verificou
   manualmente.

Evite `git worktree remove --force` salvo em recuperacao explicita. O hook do
projeto deve tratar remocoes forcadas como operacao destrutiva.

## Automacao configurada

Automacao ativa no Codex app:

- Nome: `ASOF worktree hygiene audit`
- ID: `asof-worktree-hygiene-audit`
- Frequencia: semanal, segunda-feira as 09:00 no fuso local do usuario
- Ambiente: worktree dedicado do Codex
- Escopo: `/Users/gabrielramos/projetos/ASOF/intranet`
- Comportamento: audita `git worktree list`, `${CODEX_HOME:-$HOME/.codex}/worktrees`
  e `${CODEX_HOME:-$HOME/.codex}/automations`; nao apaga, move, stageia, commita
  ou modifica arquivos.

O objetivo da automação e produzir evidencia periodica e recomendacoes
conservadoras de limpeza, nao executar limpeza.

## Snapshot local em 2026-05-28

Revisao feita no checkout local:

- `CODEX_HOME` nao estava exportado no shell; foi usado o padrao
  `/Users/gabrielramos/.codex`.
- `git worktree list --porcelain` mostrou apenas o checkout local:
  `/Users/gabrielramos/projetos/ASOF/intranet` em `main`, commit
  `66407fb7506f9bbcf56548337df183d1d8eacd34`.
- Nao havia diretorio `${CODEX_HOME:-$HOME/.codex}/worktrees` com worktrees
  gerenciados pelo Codex no momento da revisao.
- A automacao `asof-worktree-hygiene-audit` foi criada em
  `/Users/gabrielramos/.codex/automations/asof-worktree-hygiene-audit/automation.toml`.
- O checkout local estava `main...origin/main [ahead 1]` com alteracoes
  pendentes nao relacionadas a este documento. Nao misturar essas alteracoes
  com limpeza de worktrees.
