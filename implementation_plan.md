# Implementation Plan

## Overview

Configurar o ambiente de desenvolvimento para otimizar o workflow de vibe coding com IA, criando prompts reutilizáveis, estrutura de diretórios completa e hooks de automação.

## Contexto

O projeto já possui uma base sólida com Laravel 11 configurado, CLAUDE.md criado e algumas estruturas iniciadas. Esta implementação completará a preparação do ambiente conforme descrito em `docs/etapas/01-preparacao.md`, focando em criar prompts reutilizáveis, estrutura de diretórios otimizada e hooks de automação para maximizar a eficiência da IA durante o desenvolvimento.

## Types

### Tipos de Arquivos de Configuração

- **Markdown Files** (.md): Documentação e prompts
- **Shell Scripts** (.sh): Hooks de Git
- **JSON Files** (.json): Configurações

### Estrutura de Diretórios

```text
project/
├── .claude/
│   ├── CLAUDE.md           # Instruções globais (já existe)
│   ├── prompts/            # Prompts reutilizáveis
│   │   ├── model.md         # Criar
│   │   ├── controller.md    # Criar
│   │   └── test.md         # Criar
│   └── memory/             # Contexto persistente (criar se não existir)
├── docs/
│   ├── prd.md             # Criar template (opcional)
│   ├── api.md             # Criar template (opcional)
│   └── decisions/         # Criar diretório se não existir
├── .github/
│   └── hooks/             # Criar
│       └── prepare-commit-msg
└── tests/                 # Já existe
    ├── Unit/
    └── Feature/
```

## Files

### Arquivos a Criar

1. **`.claude/prompts/model.md`**
   - Template para gerar Models Laravel
   - Include contexto de Enums, migrations e factories

2. **`.claude/prompts/controller.md`**
   - Template para gerar Controllers Laravel
   - Include padrões de validação e retornos

3. **`.claude/prompts/test.md`**
   - Template para gerar testes Pest
   - Include padrões de teste (unitário, feature)

4. **`.github/hooks/prepare-commit-msg`**
   - Hook para validar mensagens de commit
   - Mínimo de 10 caracteres

5. **`.claude/memory/`**
   - Diretório para contexto persistente (criar se não existir)

### Arquivos a Verificar/Atualizar

1. **`CLAUDE.md`**
   - Verificar se está otimizado (<500 caracteres nas seções principais)
   - Confirir se segue as convenções do projeto

2. **`package.json`**
   - Verificar scripts úteis (já tem: code:fix, code:check, test)

### Arquivos a Criar (Opcionais)

1. **`docs/prd.md`**
   - Template de PRD para especificação

2. **`docs/api.md`**
   - Template de documentação de API

## Functions

Não há funções de código a implementar nesta etapa. Esta é uma etapa de configuração de ambiente.

## Classes

Não há classes de código a implementar nesta etapa. Esta é uma etapa de configuração de ambiente.

## Dependencies

### Dependências Existentes

O projeto já possui todas as dependências necessárias:

- **Laravel 11.x**: Framework principal
- **Pest 4.x**: Framework de testes
- **Alpine.js 3.x**: Frontend
- **Laravel Pint**: Formatação de código

### Novas Dependências

Nenhuma nova dependência necessária.

## Testing

### Validação Manual

1. **Teste de criação de Model**
   ```bash
   /claude "Crie model Category com migration e factory. Fields: name, slug, active boolean"
   ```
   - Verificar: Migration tem foreign keys?
   - Verificar: Model tem type hints?
   - Verificar: Factory usa dados realistas?

2. **Teste de hook de commit**
   ```bash
   git commit -m "x"
   ```
   - Esperar: Erro "Commit message muito curta"

3. **Teste de autocompletar**
   ```bash
   # Começar a digitar "Category::" e ver se sugere scopes
   ```
   - Verificar: Autocompletar funciona

### Checklist de Validação

- [ ] IDE configurada com IA
- [ ] CLAUDE.md criado e otimizado
- [ ] Estrutura de pastas definida
- [ ] Prompts templates salvos
- [ ] Primeira geração testada com sucesso
- [ ] Hook de commit funcionando
- [ ] Scripts úteis configurados

## Implementation Order

1. **Criar estrutura de diretórios**
   - Criar `.github/hooks/`
   - Criar `.claude/memory/` (se não existir)
   - Verificar estrutura `docs/`

2. **Criar prompts reutilizáveis**
   - Criar `.claude/prompts/model.md`
   - Criar `.claude/prompts/controller.md`
   - Criar `.claude/prompts/test.md`

3. **Criar hook de commit**
   - Criar `.github/hooks/prepare-commit-msg`
   - Dar permissão de execução
   - Configurar Git para usar hooks locais

4. **Criar templates opcionais**
   - Criar `docs/prd.md` (template)
   - Criar `docs/api.md` (template)

5. **Validação**
   - Testar criação de Model via IA
   - Testar hook de commit
   - Verificar autocompletar
   - Confirmar todos os itens da checklist

6. **Documentação**
   - Atualizar `docs/etapas/01-preparacao.md` com status de conclusão
   - Criar README em `.claude/` se necessário