# Branch Rules — ASOF Intranet

## Nomes de branch

| Prefixo     | Uso                            | Exemplo                      |
| ----------- | ------------------------------ | ---------------------------- |
| `feat/`     | Nova funcionalidade            | `feat/report-csv-export`     |
| `fix/`      | Correção de bug                | `fix/cpf-mask`               |
| `hotfix/`   | Correção urgente de produção   | `hotfix/login-rate-limit`    |
| `refactor/` | Refatoração sem mudança visual | `refactor/consolidate-dates` |
| `chore/`    | Manutenção (deps, config)      | `chore/update-next`          |
| `docs/`     | Documentação                   | `docs/add-branch-rules`      |
| `test/`     | Adição ou correção de testes   | `test/auth-rate-limit`       |

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
npm run typecheck && npm run test && npm run build
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

- **main**: force-push bloqueado, deletacao bloqueada
- **Sempre**: executar typecheck + test + build antes de push/merge

## Nunca fazer

- Force-push em main
- Commits com segredos/credenciais
- Merge de PR com testes ou build falhando
