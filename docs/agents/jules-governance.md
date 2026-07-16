# Governança do Google Jules

Este runbook controla o uso do Jules no repositório `prof-ramos/intranet`. A regra padrão é: plano aprovado por uma pessoa, execução isolada, diff revisado e publicação manual como draft.

## Configuração obrigatória no Jules

Em **Settings > General**:

- desativar **Export as pull request**;
- ativar **Only respond to comments that mention @jules**;
- ativar **Open pull requests as drafts by default**;
- manter autoria **Co-authored (Jules + User)** para preservar rastreabilidade.

Em **prof-ramos/intranet > Suggestions**:

- manter o toggle de sugestões desativado;
- revisar sugestões antigas individualmente; não usar “Review” como autorização automática para publicar.

Em **prof-ramos/intranet > CI Fixer**:

- manter o toggle global desativado; uma falha de CI deve ser diagnosticada e corrigida em uma nova rodada explicitamente autorizada.

Em **prof-ramos/intranet > Environment**:

```bash
set -euo pipefail
node --version
npm --version
npm ci
npm run validate:quick
```

Execute **Run and snapshot** após alterar o script. Não adicionar segredos nem URLs de bancos. Manter **Network access** desativado para as sessões; a rede continua disponível durante o setup, conforme a interface do Jules.

Rotinas agendadas são uma fonte separada de automação. Antes de criar uma, documente objetivo, frequência, dono e critério de parada. Não manter agendas genéricas de “Performance”, “Design”, “Security”, “Code Health” ou “Testing” neste repositório.

## Fluxo autorizado

1. Confirmar que `main` está atualizada e executar `npm run jules:audit`.
2. Criar uma sessão manual para um problema concreto.
3. Exigir plano e revisar arquivos, escopo, testes e riscos.
4. Aprovar o plano explicitamente na sessão.
5. Revisar o diff e os resultados de `npm run validate:quick` e `npm run pr:check`.
6. Pedir publicação manual como draft.
7. Aplicar o label `agent:jules` e revisar CodeRabbit, CI e Vercel antes de tirar o PR de draft.
8. Fazer merge humano e apagar a branch somente depois de confirmar a incorporação.

Se a análise concluir que o problema já está resolvido, é falso positivo ou duplica outro PR, encerrar a sessão sem publicar.

## Auditoria por CLI

Instalação e autenticação:

```bash
npm install -g @google/jules
jules login
```

Auditoria resumida do repositório:

```bash
npm run jules:audit
npm run jules:audit -- --json
```

Consultas manuais:

```bash
jules remote list --session --repo prof-ramos/intranet
gh pr list --repo prof-ramos/intranet --state open \
  --json number,title,headRefName,isDraft,url
git ls-remote --heads origin 'jules-*'
```

O audit retorna código `1` quando encontra sessão em `Planning`/`In Progress`, PR do Jules aberto fora de draft ou falha de autenticação/ferramenta. Sessões aguardando feedback e PRs draft permanecem visíveis nas ferramentas de origem, mas não tornam o resultado insalubre por si sós. Como a CLI não distingue uma sessão pausada, confirme o botão **Resume session** na interface antes de tratá-la como execução real.

## Resposta a uma tempestade de tarefas

1. Desativar **Suggestions** imediatamente para impedir novos disparos.
2. Em cada sessão `Planning` ou `In Progress`, usar **Pause session** na interface. A API pública não oferece pause/cancel.
3. Desativar exportação automática e CI Fixer; ativar PR draft + modo reativo a `@jules`.
4. Preservar sessões e sugestões como evidência até revisar o que produziram.
5. Listar os PRs `jules-*`, fechar apenas duplicatas/falsos positivos confirmados e apagar a branch remota somente depois.
6. Rodar novamente `npm run jules:audit` e registrar o resultado no PR de governança.

## Referências oficiais

- [Environment setup](https://jules.google/docs/environment/)
- [Getting started e AGENTS.md](https://jules.google/docs/)
- [Reviewing code e publicação](https://jules.google/docs/code/)
- [Tasks and repositories](https://jules.google/docs/tasks-repos/)
- [Jules API](https://developers.google.com/jules/api)
