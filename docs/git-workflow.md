# Fluxo de Trabalho Git - Intranet ASOF

Este documento define o fluxo de trabalho Git padronizado para o projeto Intranet ASOF.

## Template de Commit

O projeto utiliza **Conventional Commits** com mensagens em **inglês** e comentários em **português**.

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Estrutura:**

| Parte       | Descrição                                                                 |
|-------------|---------------------------------------------------------------------------|
| `type`      | Tipo da mudança (feat, fix, docs, etc.)                                  |
| `scope`     | Módulo/área afetada (auth, tasks, api, etc.) - Opcional                 |
| `subject`   | Descrição curta em inglês, no imperativo                                 |
| `body`      | Descrição longa em inglês - Opcional                                    |
| `footer`    | Referências a issues, breaking changes - Opcional                       |

**Exemplo completo:**

```
feat(auth): add two-factor authentication

Implement TOTP-based two-factor authentication using Google Authenticator.
Users can now enable 2FA in their security settings.

Closes #123
Breaking change: API endpoints now require 2FA token for sensitive operations
```

## Tipos Permitidos

| Tipo    | Descrição                          | Quando Usar                                |
|---------|------------------------------------|--------------------------------------------|
| `feat`  | Nova funcionalidade                | Adiciona algo novo para o usuário          |
| `fix`   | Correção de bug                    | Resolve um problema existente              |
| `docs`  | Documentação                       | Altera apenas documentação                 |
| `style` | Formatação/código                  | Mudanças de estilo (semelântica)           |
| `refactor` | Refatoração                      | Melhora estrutura sem mudar comportamento  |
| `perf`  | Performance                        | Melhora performance                        |
| `test`  | Testes                             | Adiciona ou modifica testes                |
| `chore` | Manutenção                         | Atualiza dependências, configurações       |
| `ci`    | CI/CD                              | Mudanças em pipelines, build scripts       |
| `revert` | Reversão                          | Reverte um commit anterior                 |

## Escopes Dinâmicos

Escopos devem seguir o padrão `^[a-z0-9-]+$` (letras minúsculas, números e hífens).

**Escopos comuns do Laravel:**

```
auth, tasks, contacts, api, admin, user, dashboard,
calendar, kanban, notifications, middleware, validators,
jobs, commands, seeders, migrations, controllers, models
```

**Exemplos válidos:**

```
feat(two-factor): add TOTP authentication
fix(race-condition): resolve payment status conflict
docs(api-endpoint): add authentication documentation
chore(laravel-upgrade): upgrade laravel/framework to 11.23.0
refactor(rate-limiter): extract middleware logic
```

## Exemplos Práticos - Laravel

```bash
# Adiciona nova funcionalidade de autenticação
feat(auth): add two-factor authentication

# Corrige condição de corrida em pedidos
fix(order): resolve race condition on payment status

# Documenta novo endpoint da API
docs(api): add authentication endpoint documentation

# Atualiza dependência do Laravel
chore(deps): upgrade laravel/framework to 11.23.0

# Refatora lógica de middleware
refactor(middleware): extract rate limiting logic to dedicated class

# Adiciona testes para jobs
test(jobs): add unit tests for ProcessPaymentJob

# Corrige formatação de código
style(controller): apply laravel pint formatting

# Melhora performance de query
perf(tasks): add database index for deadline column

# Atualiza pipeline de CI
ci(github-actions): add automated testing workflow

# Reverte commit problemático
revert: feat(experimental-feature)
```

## Anti-Patterns

| Categoria      | ❌ Errado                              | ✅ Correto                                  |
|----------------|----------------------------------------|---------------------------------------------|
| **Tipo**       | `update: alterei algo`                 | `feat: add user profile settings`           |
| **Assunto**    | `feat: Adicionando coisa`              | `feat: add user authentication`             |
| **Assunto**    | `feat(auth): Added login`              | `feat(auth): add login functionality`       |
| **Assunto**    | `fix: bug corrigido`                   | `fix: resolve authentication timeout`       |
| **Body**       | `feat: implementado`                   | `feat: implement OAuth2 authentication`     |
| **Scope**      | `feat(Auth_Module): add login`         | `feat(auth): add login functionality`       |
| **Scope**      | `feat(auth module): add login`         | `feat(auth-module): add login`              |
| **Misto**      | `feat + fix: add and fix things`       | `feat: add feature` depois `fix: resolve bug` |
| **Vazio**      | `feat(): add stuff`                    | `feat(tasks): add task creation`            |
| **Maiúsculas** | `feat(Auth): Add Login`                | `feat(auth): add login`                     |

## Glossário PT-BR → EN

| Português        | Inglês              |
|------------------|---------------------|
| adiciona, adicionando | add, adding      |
| corrige, corrigindo   | fix, fixing       |
| atualiza, atualizando | update, updating  |
| remove, removendo     | remove, removing  |
| refatora, refatorando | refactor, refactoring |
| cria, criando         | create, creating  |
| deleta, deletando     | delete, deleting  |
| altera, alterando     | change, changing  |
| melhora, melhorando   | improve, improving |
| move, movendo         | move, moving      |
| renomeia, renomeando  | rename, renaming  |
| substitui, substituindo | replace, replacing |
| extrai, extraindo     | extract, extracting |
| implementa, implementando | implement, implementing |
| habilita, habilitando | enable, enabling  |
| desabilita, desabilitando | disable, disabling |
| processa, processando | process, processing |
| valida, validando     | validate, validating |

## Grace Period

O projeto suporta um período de carência via arquivo `.commitlint-grace-period` para commits temporários durante desenvolvimento.

**Como usar:**

```bash
# Criar arquivo de grace period (commits WIP não serão validados)
touch .commitlint-grace-period

# Fazer commits temporários
git commit -m "wip: working on stuff"

# REMOVER antes de push!
rm .commitlint-grace-period
```

**⚠️ AVISO:** Nunca commite o arquivo `.commitlint-grace-period`! Adicione ao `.gitignore`:

```gitignore
# Grace period para commits locais
.commitlint-grace-period
```

## Branch Protection

Regras de proteção do branch `main`:

| Regra                              | Status |
|------------------------------------|--------|
| Push direto                        | ❌ Bloqueado |
| Pull Request obrigatório           | ✅ Ativo |
| Aprovações obrigatórias (1+)       | ✅ Ativo |
| dismiss stale reviews              | ✅ Ativo |
| require code owner review          | ✅ Ativo |
| Restrições (só maintainers)        | ✅ Ativo |
| Status checks obrigatórios         | ✅ Ativo |
| - commitlint                       | ✅ Obrigatório |
| - lint (Pint/Pint)                 | ✅ Obrigatório |
| - test (Pest)                      | ✅ Obrigatório |
| Require branches to be up to date  | ✅ Ativo |
| Block forced pushes                | ✅ Ativo |

**Fluxo para main:**

```
develop → PR → Code Review → CI Pass → Approval → Merge (squash) → main
```

## Fluxo de Branches

```
main ←─────────────────────────────────────┐
  ↑                                        │
  │ (merge após release)                   │
  │                                        │
develop ←──────────────────────────────────┘
  ↑
  │ (PR)
  │
feat/xxx, fix/xxx, chore/xxx
```

**Convenções de nomenclatura de branches:**

```
feat/<descricao>     Nova funcionalidade
fix/<descricao>      Correção de bug
hotfix/<descricao>   Correção urgente em produção
release/<versao>     Preparação de release
docs/<descricao>     Documentação
refactor/<descricao> Refatoração
```

**Exemplos:**

```bash
feat/two-factor-authentication
fix/race-condition-payment-status
hotfix/security-patch-cve-2024-12345
release/v1.2.0
docs/api-endpoints-documentation
refactor/extract-service-layer
```

## Integração com Ferramentas

### Commitlint

Validação automática de mensagens de commit:

```bash
# Instalação via script
./scripts/setup-commitlint.sh
```

### Husky

Hooks Git automatizados:

| Hook            | Ação                                  |
|-----------------|---------------------------------------|
| pre-commit      | Executa Laravel Pint (formatting)     |
| commit-msg      | Valida mensagem com commitlint        |
| pre-push        | Executa Pest (testes)                 |

## Comandos Úteis

```bash
# Ver histórico limpo
git log --oneline --graph --decorate

# Ver branches e rastreamento
git branch -vv

# Limpar branches mescladas localmente
git branch --merged | grep -v "main\|develop" | xargs git branch -d

# Ver o que será commitado
git diff --staged

# Desfazer último commit (mantendo mudanças)
git reset --soft HEAD~1

# Alterar mensagem do último commit
git commit --amend -m "new: message"

# Rebase interativo para limpar histórico
git rebase -i HEAD~5

# Criar branch a partir de issue
git checkout -b feat/123-add-feature
```

## Referências

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Conventional Commits em PT-BR](https://www.conventionalcommits.org/pt-br/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)
- [Commitlint](https://commitlint.js.org/)
