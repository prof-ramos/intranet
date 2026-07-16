# Plano 054: Tornar o gate de PR canônico e eliminar testes unitários duplicados no CI

> **Instruções ao executor**: preserve os nomes dos jobs exigidos por branch
> protection. O gate oficial continua lint → typecheck → unitários → DB → build;
> coverage executa a suíte uma única vez no CI.
>
> **Verificação de drift**:
> `git diff --stat 45b9ba3..HEAD -- package.json .github/workflows/ci.yml scripts/check-pr-ready.sh .github/BRANCH_RULES.md .github/pull_request_template.md AGENTS.md`
> O baseline já contém a governança de Jules/CodeRabbit mesclada pela PR #366;
> preserve essas regras ao ajustar o gate.

## Status

- **Prioridade**: P2
- **Esforço**: S
- **Risco**: BAIXO
- **Depende de**: nenhum
- **Categoria**: dx
- **Planejado em**: `main` commit `45b9ba3`, 2026-07-16

## Por que isso importa

O CI roda a mesma suíte Vitest duas vezes (`test` e `test:coverage`). Além disso,
script, regras de branch e template definem subconjuntos/ordens diferentes do
gate oficial. Há múltiplas respostas para “pronto para PR”, aumentando custo e
permitindo checklists verdes incompletas.

## Estado atual

- `.github/workflows/ci.yml:34-39`: `npm run test` seguido de
  `npm run test:coverage`; ambos são `vitest run` (`package.json:24-28`).
- `AGENTS.md`, na seção de tooling, define a ordem canônica e recomenda
  `pr:check`.
- `scripts/check-pr-ready.sh:16-21`: roda typecheck antes de lint e duplica a
  lista manualmente.
- `.github/BRANCH_RULES.md:36-40` e PR template `:14-20` omitem lint/test:db.
- `validate:full` já agrega quick + DB + integration + build na ordem correta.

## Comandos necessários

| Finalidade | Comando                             | Resultado esperado                   |
| ---------- | ----------------------------------- | ------------------------------------ |
| Shell      | `bash -n scripts/check-pr-ready.sh` | exit 0                               |
| Coverage   | `npm run test:coverage`             | testes passam e thresholds aplicados |
| Quick      | `npm run validate:quick`            | exit 0                               |
| Gate       | `npm run pr:check`                  | exit 0 em worktree limpa/configurada |

## Escopo

**Dentro do escopo**:

- `package.json` somente se um alias CI for necessário
- `.github/workflows/ci.yml`
- `scripts/check-pr-ready.sh`
- `.github/BRANCH_RULES.md`
- `.github/pull_request_template.md`
- `advisor-plans/README.md`

**Fora do escopo**:

- Renomear jobs/checks protegidos, branch protection ou GitHub settings.
- Alterar thresholds de coverage.
- Mudar conteúdo dos testes ou adicionar E2E obrigatório global.
- Governança Jules/CodeRabbit.

## Fluxo Git

- Branch: `advisor/054-canonical-pr-validation`
- Commit: `ci: unify pr validation and avoid duplicate unit run`
- Não publique sem autorização.

## Etapas

### Etapa 1: Executar unitários uma vez no CI

No job `validate`, mantenha lint e typecheck e use somente
`npm run test:coverage`, pois ele executa a suíte e thresholds. Preserve nome do
job. Ajuste o nome do step para comunicar “Unit Tests with coverage”.

**Verificar**: workflow contém uma única invocação Vitest no job; coverage local
passa.

### Etapa 2: Delegar o script ao agregador canônico

Preserve scope check e worktree limpa. Depois, chame `npm run validate:full` em
vez de listar comandos em ordem divergente. Não crie recursão com `pr:check`.

**Verificar**: `bash -n` e busca no script encontra `validate:full` uma vez.

### Etapa 3: Alinhar documentação operacional

Troque checklists de branch/PR por `npm run pr:check`, com E2E relevante como
adicional. Não replique novamente a lista de subcomandos.

**Verificar**: `rg -n "npm run typecheck && npm run test" .github` não encontra
o fluxo antigo.

### Etapa 4: Rodar gates

Rode `validate:quick`, coverage e, em checkout limpo com env sintético, `pr:check`.
Confirme que thresholds ainda falham quando abaixo do piso.

## Plano de testes

- `bash -n` do script.
- Coverage executa testes e thresholds.
- CI YAML parseia e mantém jobs esperados.
- `pr:check` delega uma vez e preserva scope/clean-tree.

## Critérios de conclusão

- [ ] CI executa a suíte unitária uma vez.
- [ ] Coverage continua obrigatório.
- [ ] `pr:check` é a única fonte executável de prontidão.
- [ ] Regras/template apontam ao comando canônico.
- [ ] Jobs protegidos não foram renomeados; índice atualizado.

## Condições de STOP

- Branch protection depende do nome exato de um step removido, não apenas job.
- `test:coverage` não falha em teste quebrado ou não aplica thresholds.
- `validate:full` mudou de ordem/semântica.
- A implementação exige remover ou enfraquecer as regras de governança Jules ou
  CodeRabbit já presentes no baseline.

## Notas de manutenção

Novos gates devem entrar no agregador canônico e ser referenciados, não copiados,
por scripts/documentação. O Plano 056 adicionará verificação de docs após este.
