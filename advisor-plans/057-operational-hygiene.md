# Plano 057: Concluir a higiene operacional sem apagar evidência válida

> **Instruções ao executor**: este plano contém operações destrutivas em produção
> e no remoto Git. Faça primeiro todo o inventário somente leitura. Antes de
> qualquer `DELETE` SQL ou exclusão de branch, pare e obtenha autorização humana
> explícita para a lista exata de objetos. Nunca conclua que uma branch foi
> incorporada apenas por ancestralidade: este repositório usa squash merge.
>
> **Verificação de drift**:
> `git diff --stat 14dae8f..HEAD -- TODO-PROD.md docs/environments.md docs/release-1-operational-go-live.md docs/operations/archive`

## Status

- **Prioridade**: P1
- **Esforço**: M
- **Risco**: ALTO
- **Depende de**: nenhum
- **Categoria**: docs / operação
- **Planejado em**: `main` commit `14dae8f`, 2026-07-18

## Por que isso importa

O CI de produção deixou artefatos `SMOKE_*`, o `TODO-PROD.md` registra uma
execução anterior à atual e há 25 referências de branches remotas antigas no
baseline auditado. Limpar sem inventário pode apagar dados legítimos ou trabalho
não incorporado; não limpar perpetua ruído operacional e evidência falsa.

## Estado atual

- `e2e/smoke-prod.spec.ts:356-388` apenas imprime SQL de limpeza.
- `TODO-PROD.md:7-8,40,48` aponta para o run/commit anterior ao `14dae8f`.
- `TODO-PROD.md:60` afirma higiene completa em maio, mas o baseline contém 25
  branches remotas além de `main`.
- `docs/adr/009-smoke-in-production-window.md:21` exige remover dados operacionais
  do smoke e preservar a auditoria.
- Squash merge faz `git branch -r --merged origin/main` ser insuficiente para
  decidir exclusões.

## Comandos necessários

| Finalidade | Comando                                                                                       | Resultado esperado           |
| ---------- | --------------------------------------------------------------------------------------------- | ---------------------------- |
| Estado     | `git status --short && git rev-parse HEAD && git rev-parse origin/main`                       | worktree limpa e SHAs iguais |
| PRs        | `gh pr list --state all --limit 500 --json number,state,mergedAt,headRefName,baseRefName,url` | JSON válido                  |
| Branches   | `git ls-remote --heads origin`                                                                | lista remota atual           |
| Docs       | `npm run docs:check`                                                                          | exit 0                       |

## Escopo

**Dentro do escopo**:

- Registros operacionais cujo identificador começa exatamente com `SMOKE_` nas
  tabelas já listadas pelo spec, preservando `audit_logs`.
- Branches remotas aprovadas nominalmente após cruzamento com PR e conteúdo.
- `TODO-PROD.md` e evidência arquivada sob `docs/operations/archive/`.
- `advisor-plans/README.md`.

**Fora do escopo**:

- Qualquer registro sem marcador `SMOKE_`.
- `audit_logs`, contas admin, secrets, migrations e dados de associados reais.
- Branch com PR aberto, worktree ativa, diff exclusivo não explicado ou estado
  que não possa ser provado.
- Alterar produção antes de autorização específica para a mutação SQL.

## Fluxo Git

- Branch documental: `advisor/057-operational-hygiene`.
- Commit: `docs(ops): record smoke and branch hygiene evidence`.
- Não publique nem exclua branches sem instrução do operador.

## Etapas

### Etapa 1: Revalidar repositório, PRs, worktrees e branches

Confirme root, HEAD, worktree limpa, `git worktree list --porcelain`, referências
remotas e PRs de todos os estados. Produza uma tabela com branch, PR associado,
estado do PR, caminhos diferentes de `origin/main`, worktree e recomendação.

**Verificar**: a tabela contabiliza exatamente todas as linhas retornadas por
`git ls-remote --heads origin`, exceto `main`.

### Etapa 2: Inventariar resíduos de smoke em modo read-only

Com a credencial de migração aprovada para leitura, abra transação `READ ONLY` e
conte `activities.title`, `associates.full_name`, `legal_consultations.title`,
`oficios.subject` e `notifications.message` pelos mesmos prefixos do spec.
Registre apenas contagens e IDs técnicos; não copie PII nem valores de secrets.

**Verificar**: a consulta termina com `ROLLBACK` e produz cinco contagens.

### Etapa 3: Parar para duas aprovações nominais

Apresente (a) contagens/IDs `SMOKE_*` e SQL exato; (b) lista exata de branches
candidatas. Sem aprovação explícita para cada conjunto, marque o plano BLOCKED e
não prossiga.

### Etapa 4: Remover somente resíduos aprovados e verificar zero

Execute uma única transação com `ON_ERROR_STOP`, apagando dependências antes dos
pais e mantendo `audit_logs`. Use os predicados exatos do spec, capture contagens
afetadas, rode novamente o SELECT de inventário e só então faça `COMMIT`.

**Verificar**: as cinco contagens operacionais são zero e `audit_logs` não foi
alvo de nenhuma instrução.

### Etapa 5: Excluir somente branches aprovadas

Para cada nome aprovado, faça um último `git fetch --prune`, confirme que o SHA e
o estado do PR não mudaram e use `git push origin --delete <nome>`. Não automatize
a lista com `xargs`.

**Verificar**: `git ls-remote --heads origin refs/heads/<nome>` não produz saída
para cada branch aprovada; branches preservadas continuam presentes.

### Etapa 6: Atualizar evidência operacional

Atualize `TODO-PROD.md` com HEAD, run de CI realmente validado, data, contagens
pré/pós-limpeza e resumo da auditoria de branches. Mova detalhes históricos que
não orientam operação para `docs/operations/archive/`.

**Verificar**: `npm run docs:check` sai 0 e `git diff --check` não aponta erros.

## Plano de testes

- Não há teste de produto: trata-se de higiene operacional.
- Todas as consultas de inventário devem rodar em transação read-only.
- A verificação pós-mudança deve provar zero resíduos e ausência das branches
  exatas, sem usar ancestralidade como substituto.

## Critérios de conclusão

- [ ] Inventário read-only de produção registrado sem PII.
- [ ] Autorizações explícitas registradas antes de SQL e Git destrutivos.
- [ ] Contagens `SMOKE_*` aprovadas ficaram zero; auditoria foi preservada.
- [ ] Apenas branches nominalmente aprovadas foram removidas.
- [ ] `TODO-PROD.md` contém evidência atual e `npm run docs:check` passa.

## Condições de STOP

- Worktree suja, worktree adicional não explicada ou HEAD diferente de main.
- Registro candidato não possui marcador inequívoco `SMOKE_`.
- Há FK/dependência fora das tabelas previstas ou a transação afeta quantidade
  diferente do inventário.
- Branch tem PR aberto, SHA mudou, conteúdo exclusivo ou não possui prova segura.
- Falta autorização explícita para a mutação produtiva ou exclusão remota.

## Notas de manutenção

O Plano 060 impede que pushes comuns continuem criando resíduos. Até ele ser
executado, repita este inventário após todo smoke mutante.
