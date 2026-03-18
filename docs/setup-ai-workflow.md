# Setup de Workflow de IA - Intranet ASOF

## Visão Geral

Este documento descreve a configuração completa do ambiente de desenvolvimento otimizado para vibe coding com IA no projeto Intranet ASOF (Laravel 11).

## Estrutura de Diretórios

```
.claude/
├── commands/          # Comandos reutilizáveis
│   ├── migrate.md     # Prompt para migrations
│   ├── queue.md       # Prompt para jobs/queues
│   └── test.md        # Prompt para testes
├── memory/            # Contexto persistente (vazio inicialmente)
├── prompts/           # Prompts reutilizáveis por tipo de arquivo
│   ├── controller.md  # Para Controllers
│   ├── model.md       # Para Models
│   └── test.md        # Para Testes
├── settings.local.json # Configurações locais
└── skills/            # Skills especializadas
    └── laravel-11/  # Skill Laravel 11
        └── SKILL.md

docs/
├── api.md            # Template de documentação de API
├── prd.md            # Template de PRD
└── etapas/           # Guia de desenvolvimento com IA

.github/
└── hooks/
    └── prepare-commit-msg  # Hook de validação de commits
```

## Prompts Reutilizáveis

### Como Usar

Para usar um prompt reutilizável:

```markdown
@.claude/prompts/model.md

Crie um Model chamado TaskCategory com:
- Campos: id, name, slug, color, user_id, active
- Relacionamentos: belongsTo User, hasMany Task
- Escopos: active(), byUser($userId)
```

### Prompts Disponíveis

**Model Prompt** (`.claude/prompts/model.md`)
- Cria Models Laravel 11 completos
- Inclui fillable, casts, relacionamentos
- Gera migrations associadas
- Adiciona factories e seeders

**Controller Prompt** (`.claude/prompts/controller.md`)
- Cria Controllers RESTful
- Implementa validação
- Inclui resource routes
- Gera testes de feature

**Test Prompt** (`.claude/prompts/test.md`)
- Cria testes Pest completos
- Cobertura de cenários principais
- Fábricas de dados
- Asserções claras

### Exemplo Prático

```markdown
@.claude/prompts/controller.md

Crie um TaskController com:
- index(): listar tarefas paginadas
- store(): criar nova tarefa
- update(): atualizar tarefa existente
- destroy(): remover tarefa
```

## Comandos Reutilizáveis

### Lista de Comandos

```
.claude/commands/migrate.md
.claude/commands/queue.md
.claude/commands/test.md
```

### Como Usar

```bash
# Na conversa com Claude:
@.claude/commands/migrate.md
```

## Hooks de Automação

### Hook de Commit

Localização: `.github/hooks/prepare-commit-msg`

**Funcionalidade**:
- Valida mensagens de commit antes de serem salvas
- Enforce conventional commits
- Fornece feedback visual

**Formato Esperado**:
```
<tipo>(<escopo>): <descrição>

Exemplos:
- feat(tasks): adiciona funcionalidade de filtros
- fix(auth): corrige bug na autenticação
- docs(readme): atualiza documentação
- test(tasks): adiciona testes para categorias
```

**Tipos Suportados**:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Mudanças na documentação
- `style`: Formatação, ponto-e-vírgula
- `refactor`: Refatoração de código
- `test`: Adição ou correção de testes
- `chore`: Mudanças no processo de build, tools
- `perf`: Melhorias de performance

**Comportamento**:
- Mensagens válidas: prossegue normalmente
- Mensagens inválidas: exibe aviso mas permite (não bloqueia)
- Sempre mostra o formato recomendado

## Templates de Documentação

### Template de PRD

Arquivo: `docs/prd.md`

**Quando Usar**:
- Planejar novas funcionalidades
- Documentar requisitos detalhados
- Definir casos de uso
- Especificar APIs necessárias

**Estrutura**:
```markdown
# [Nome da Funcionalidade]

## Visão Geral
- Status, Prioridade, Responsável, Data, Versão

## Contexto e Justificativa
- Problema, Objetivos, Benefícios

## Requisitos Funcionais
- RF-001, RF-002, etc.

## Requisitos Não-Funcionais
- RNF-001 (Performance), RNF-002 (Segurança), etc.

## Casos de Uso
- UC-001, UC-002, etc.

## Requisitos de Interface
- Layout, Componentes, Interações

## Requisitos de Dados
- Entidades, Relacionamentos, Regras

## APIs Necessárias
- Endpoints completos com exemplos

## Requisitos de Teste
- Unitários, Integração, E2E

## Riscos e Dependências
- Tabela de riscos, Lista de dependências

## Cronograma
- Fases com datas e status

## Métricas de Sucesso
- Métricas definidas
```

### Template de API

Arquivo: `docs/api.md`

**Quando Usar**:
- Documentar endpoints da API
- Criar referência para frontend
- Documentar respostas de erro
- Especificar parâmetros

**Estrutura**:
```markdown
# [Nome do Endpoint]

## Visão Geral
- Método, URL, Descrição, Versão, Autenticação

## Parâmetros de Request
- Headers, Query Parameters, Body Parameters

## Exemplo de Request
- cURL, JavaScript, PHP

## Respostas
- Sucesso, Erro de Validação, Erro de Autenticação, etc.

## Status Codes
- Tabela com todos os códigos HTTP

## Exemplos de Cenários
- Casos práticos de uso
```

## Scripts Úteis

### PHP (Composer)

```bash
# Rodar todos os testes
composer test

# Rodar testes com coverage
composer test:coverage

# Corrigir código (Laravel Pint)
composer code:fix

# Verificar código sem modificar
composer code:check

# Rodar QA completo (verificação + testes)
composer qa

# Limpar todos os caches
composer clear-all
```

### JavaScript (NPM)

```bash
# Servidor de desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview

# Lintar JavaScript
npm run lint

# Formatar código
npm run format
```

### Laravel Artisan

```bash
# Rodar migrations
php artisan migrate

# Criar nova migration
php artisan make:migration create_categories_table

# Criar novo model
php artisan make:model TaskCategory

# Criar novo controller
php artisan make:controller TaskController

# Limpar cache de rotas
php artisan route:clear

# Limpar cache de configuração
php artisan config:clear

# Limpar cache de views
php artisan view:clear
```

## Workflow de Desenvolvimento

### 1. Planejamento

1. Criar PRD usando `docs/prd.md`
2. Definir requisitos e casos de uso
3. Especificar APIs necessárias

### 2. Especificação

1. Criar ADR (Architecture Decision Record) em `docs/decisions/`
2. Definir arquitetura da solução
3. Planejar estrutura de banco de dados

### 3. Implementação

#### 3.1. Backend

```bash
# Criar migration
php artisan make:migration create_table

# Criar model
php artisan make:model ModelName

# Criar controller
php artisan make:controller ControllerName

# Usar prompts reutilizáveis
@.claude/prompts/model.md
@.claude/prompts/controller.md
```

#### 3.2. Frontend

- Criar componentes React
- Implementar visualizações
- Integrar com API

### 4. Testes

```bash
# Criar testes
@.claude/prompts/test.md

# Rodar testes
composer test

# Verificar coverage
composer test:coverage
```

### 5. Code Review

```bash
# Verificar código
composer code:check

# Corrigir se necessário
composer code:fix
```

### 6. Commit

```bash
# O hook valida automaticamente
git add .
git commit
# Seguir formato: <tipo>(<escopo>): <descrição>

# Exemplos:
git commit -m "feat(tasks): adiciona sistema de categorias"
git commit -m "fix(auth): corrige bug de token expirado"
git commit -m "docs(readme): atualiza documentação de setup"
```

### 7. Documentação

```bash
# Documentar API
cp docs/api.md docs/api/tasks-create.md

# Atualizar README se necessário
```

## Boas Práticas

### 1. Sempre Use Prompts Reutilizáveis

✅ **Recomendado**:
```markdown
@.claude/prompts/model.md

Crie um Model chamado Category...
```

❌ **Evite**:
```markdown
Crie um Model Laravel 11 chamado Category com campos...
```

### 2. Documente Todas as Funcionalidades

- Crie PRD antes de implementar
- Documente endpoints da API
- Mantenha ADRs atualizados

### 3. Sempre Teste

- Crie testes junto com o código
- Use factories para dados de teste
- Atinga coverage > 80%

### 4. Siga Conventional Commits

- Use prefixos apropriados
- Seja descritivo na descrição
- Use escopo quando aplicável

### 5. Valide Código Antes de Commitar

```bash
# Verifique código
composer code:check

# Rode testes
composer test

# Linte frontend
npm run lint
```

## Exemplo Completo: Adicionar Sistema de Categorias

### 1. Planejamento

```markdown
# Crie PRD em docs/prd/categories.md usando template docs/prd.md
```

### 2. Especificação

```markdown
# Crie ADR em docs/decisions/004-categories.md
```

### 3. Implementação

```bash
# Migration
php artisan make:migration create_categories_table

# Model
@.claude/prompts/model.md

# Controller
@.claude/prompts/controller.md

# Testes
@.claude/prompts/test.md
```

### 4. Validação

```bash
# Verificar código
composer code:check

# Rodar testes
composer test

# Lint frontend
npm run lint
```

### 5. Commit

```bash
git add .
git commit -m "feat(categories): adiciona sistema de categorização de tarefas"
```

### 6. Documentação

```markdown
# Documentar API em docs/api/categories.md usando template docs/api.md
```

## Troubleshooting

### Hook de Commit Não Funciona

**Problema**: Hook não está sendo executado

**Solução**:
```bash
# Verificar se o caminho está correto
git config --get core.hooksPath

# Deveria ser: .github/hooks

# Se não estiver:
git config core.hooksPath .github/hooks
```

### Prompts Não São Encontrados

**Problema**: Claude não encontra os prompts

**Solução**:
- Verifique se os arquivos existem em `.claude/prompts/`
- Use o caminho completo: `@.claude/prompts/model.md`
- Verifique se não há erros de digitação

### Testes Falham

**Problema**: Testes não passam

**Solução**:
```bash
# Verificar syntaxe
composer code:check

# Rodar testes com verbose
composer test --verbose

# Verificar database
php artisan migrate:fresh --seed
```

## Recursos Adicionais

- [CLAUDE.md](../CLAUDE.md) - Instruções globais do projeto
- [docs/git-workflow.md](git-workflow.md) - Workflow de Git
- [docs/etapas/](etapas/README.md) - Guia completo de desenvolvimento com IA
- [implementation_plan.md](../implementation_plan.md) - Plano de implementação do setup de IA

## Suporte

Para dúvidas ou problemas:
1. Verifique este documento
2. Consulte o [README.md](../README.md)
3. Verifique os ADRs em `docs/decisions/`
4. Consulte o guia em `docs/etapas/`

## Changelog

- **18/03/2026**: Criação inicial do setup de IA workflow
  - Estrutura de diretórios
  - Prompts reutilizáveis
  - Hooks de automação
  - Templates de documentação
  - Scripts úteis