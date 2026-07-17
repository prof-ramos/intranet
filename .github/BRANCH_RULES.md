# Branch Rules — ASOF Intranet

## Nomes de branch

| Prefixo     | Uso                                                   | Exemplo                      |
| ----------- | ----------------------------------------------------- | ---------------------------- |
| `feat/`     | Nova funcionalidade                                   | `feat/report-csv-export`     |
| `fix/`      | Correção de bug                                       | `fix/cpf-mask`               |
| `hotfix/`   | Correção urgente de produção                          | `hotfix/login-rate-limit`    |
| `refactor/` | Refatoração sem mudança visual                        | `refactor/consolidate-dates` |
| `chore/`    | Manutenção (deps, config)                             | `chore/update-next`          |
| `docs/`     | Documentação                                          | `docs/add-branch-rules`      |
| `test/`     | Adição ou correção de testes                          | `test/auth-rate-limit`       |
| `jules-`    | Branch criada pelo Google Jules após aprovação humana | `jules-1234567890-abcd`      |

## Commits

Usar [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(escopo): descricao em minusculas

feat(config): adiciona gestao de usuarios com reset de senha
fix(auth): corrige validacao de sessao expirada
refactor(associados): consolida formatacao de datas
chore(deps): atualiza next para 16.2.7
docs(claude): atualiza instrucoes de ambiente
test(auth): adiciona testes de rate limiting
```

## Fluxo

### Commit direto em main (apenas para solo dev)

Para mudancas pequenas e de baixo risco: bug fixes simples, typos, ajustes de CSS, atualizacao de docs.

**Sempre executar antes do push:**

```bash
npm run pr:check
```

### Pull Request (recomendado para features e refactors)

1. Criar branch a partir de main: `git checkout -b feat/descricao`
2. Desenvolver e commitar
3. Abrir PR contra main
4. **Squash merge** ao aprovar

### Hotfix

1. Branch `hotfix/descricao` a partir de main
2. Corrigir e testar
3. Commit direto em main (urgente) ou PR se nao for urgente

## Protecao de branch

- **main**: PR obrigatório, histórico linear, conversas resolvidas, force-push e exclusão bloqueados; regras também se aplicam a administradores.
- **Checks obrigatórios**: `Lint, Typecheck & Test`, `Database Contract`, `Build Verification` e `E2E Tests (Playwright)` em branch atualizada com `main`.
- O repositório é mantido por uma pessoa; a proteção exige o PR e os checks, mas não exige aprovação de outra conta.
- **Sempre**: após o commit, com a worktree limpa, executar o gate canônico `npm run pr:check` antes de publicar ou fazer merge.
- **E2E**: `E2E Tests (Playwright)` é obrigatório no CI para todo PR; executar `npm run test:e2e` localmente também quando a mudança afetar jornadas, rotas ou componentes cobertos pelo Playwright.
- PRs gerados pelo Jules devem nascer como draft e só podem sair de draft após revisão humana do diff e dos checks.
- Comentários sem menção explícita a `@jules` não autorizam novas alterações automatizadas.
- Sugestões proativas, CI Fixer e exportação automática de PR devem permanecer desativados para este repositório.

## Nunca fazer

- Force-push em main
- Commits com segredos/credenciais
- Merge de PR com testes ou build falhando
