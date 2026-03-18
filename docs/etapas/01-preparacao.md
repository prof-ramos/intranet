# Etapa 0 — Preparação do Ambiente

> **Tempo estimado**: 1-2 horas
> **Saída**: Ambiente configurado e otimizado para vibe coding

---

## Checklist Inicial

### 1. Escolha da IDE/Orquestrador

```
Claude Code (Recomendado)
├── Integração nativa Claude Opus
├── Comandos /commit, /review, /test
├── Contexto automático do repo
└── Hooks customizáveis

Cursor (Alternativa)
├── Composer + Chat
├── Integração Copilot
├── Cmd+K para edits
└── .cursorrules para estilo

VS Code + Extensões
├── Cline / Continue / Roo Code
├── Copilot / Copilot Chat
└── Configuração manual
```

### 2. Configuração do Repositório

#### `.claude/CLAUDE.md` (Instruções Globais)

```markdown
# Contexto do Projeto

## Tech Stack
- Laravel 11 + PHP 8.2
- Alpine.js + Tailwind
- MySQL 8

## Convenções
- Models em `app/Models/`
- Usar PHP Enums para status/prioridade
- Sempre criar migration + model + factory juntos
- Commits em português (pt_BR)

## O que EVITAR
- Não usar `DB::raw()` sem necessidade
- Não misturar lógica de negócio em controllers
- Não criar APIs sem validação (FormRequest)
```

#### `.cursorrules` (se usar Cursor)

```
Sempre escrever código em português (pt_BR) para comentários e nomes quando fizer sentido.
Usar PHP 8.2+ features: enums, readonly, constructor property promotion.
Seguir padrões PSR-12.
Preferir Eloquent sobre Query Builder.
```

### 3. Hooks de Automatização

#### `package.json` (scripts úteis)

```json
{
  "scripts": {
    "code:fix": "pint --fix",
    "code:check": "pint --test",
    "test": "pest",
    "test:coverage": "pest --coverage",
    "commit": "git add . && git commit -m",
    "vibe:review": "echo 'Execute /review no Claude Code'"
  }
}
```

#### `.github/hooks/prepare-commit-msg`

```bash
#!/bin/sh
# Previne commits sem mensagem descritiva
msg=$(cat $1)
if [ ${#msg} -lt 10 ]; then
    echo "Commit message muito curta. Mínimo 10 caracteres."
    exit 1
fi
```

### 4. Estrutura de Diretórios

```
project/
├── .claude/
│   ├── CLAUDE.md           # Instruções globais
│   ├── prompts/            # Prompts reutilizáveis
│   │   ├── model.md
│   │   ├── controller.md
│ │   └── test.md
│   └── memory/             # Contexto persistente
├── docs/
│   ├── prd.md
│   ├── api.md
│   └── decisions/
├── prompts/                # Seus prompts específicos
└── tests/
    ├── Unit/
    └── Feature/
```

### 5. Template de Prompt Reutilizável

#### `prompts/model.md`

```markdown
# Gerar Model Laravel

## Contexto
- Nome do Model: {{name}}
- Tabela: {{table}}
- Campos: {{fields}}
- Relacionamentos: {{relationships}}

## Requisitos
1. Migration com foreign keys e indexes
2. Model com PHP Enums para status
3. Factory com dados realistas
4. Observer para histórico (se aplicável)
5. Scopes úteis

## Convenções
- Usar atributos promovidos no construtor
- Type hints em tudo
- Docblocks apenas em métodos públicos complexos
```

---

## Validação

### Teste Rápido do Ambiente

```bash
# 1. Criar um model simples via IA
/claude "Crie model Category com migration e factory. Fields: name, slug, active boolean"

# 2. Verificar qualidade
- Migration tem foreign keys?
- Model tem type hints?
- Factory usa dados realistas?

# 3. Testar autocompletar
# Começar a digitar "Category::" e ver se sugere scopes
```

---

## Dicas de Otimização

### Para Maximizar Contexto Útil

1. **Arquivos pequenos** — <300 linhas por arquivo
2. **Separação de concerns** — Um arquivo, uma responsabilidade
3. **Documentação leve** — Código autoexplicativo > comentários
4. **CLAUDE.md enxuto** — <500 caracteres, direto ao ponto

### Para Minimizar Alucinações

1. **Sempre pedir código completo** — Não snippets parciais
2. **Revisar antes de aceitar** — IA erra, você valida
3. **Versionar frequentemente** — Reverte fácil se der ruim
4. **Testar incrementalmente** — Não espere o fim para testar

---

## Saída Esperada

- [ ] IDE configurada com IA
- [ ] CLAUDE.md (ou equivalente) criado
- [ ] Estrutura de pastas definida
- [ ] Prompts templates salvos
- [ ] Primeira geração testada com sucesso

---

**Versão**: 1.0
**Data**: 2025-03-18

**Próxima**: [02-especificacao.md](./02-especificacao.md)
