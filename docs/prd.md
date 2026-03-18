# Template de PRD (Product Requirements Document)

## Instruções

Use este template para criar PRDs detalhados para novas funcionalidades do projeto Intranet ASOF.

## Estrutura do PRD

```markdown
# [Nome da Funcionalidade]

## Visão Geral
- **Status**: [Planejamento/Em Desenvolvimento/Em Teste/Concluída]
- **Prioridade**: [Alta/Média/Baixa]
- **Responsável**: [Nome do desenvolvedor]
- **Data Prevista**: [DD/MM/AAAA]
- **Versão**: 1.0

## Contexto e Justificativa

### Problema
Descreva o problema que esta funcionalidade resolve.

### Objetivos
Liste os objetivos específicos desta funcionalidade.

### Benefícios Esperados
- Benefício 1
- Benefício 2
- Benefício 3

## Requisitos Funcionais

### RF-001: [Título do Requisito]
**Descrição**: Detalhe o requisito funcional.

**Critérios de Aceite**:
- [ ] Critério 1
- [ ] Critério 2
- [ ] Critério 3

**Prioridade**: Alta/Média/Baixa

### RF-002: [Título do Requisito]
**Descrição**: Detalhe o requisito funcional.

**Critérios de Aceite**:
- [ ] Critério 1
- [ ] Critério 2

**Prioridade**: Alta/Média/Baixa

## Requisitos Não-Funcionais

### RNF-001: Performance
- Tempo de resposta máximo: [X]ms
- Usuários simultâneos: [X]

### RNF-002: Segurança
- Autenticação obrigatória: Sim/Não
- Autorização: [Descreva as permissões]

### RNF-003: Usabilidade
- Acessibilidade: WCAG 2.1 AA
- Dispositivos: Desktop/Mobile/Tablet

## Casos de Uso

### UC-001: [Título do Caso de Uso]

**Ator Principal**: [Tipo de usuário]

**Pré-condições**:
1. Usuário autenticado
2. Sistema online

**Fluxo Principal**:
1. Usuário acessa [página]
2. Usuário clica em [botão/ação]
3. Sistema [ação executada]
4. Sistema exibe [resultado]

**Pós-condições**:
- [Condição 1]
- [Condição 2]

**Fluxos Alternativos**:
- [Fluxo alternativo 1]
- [Fluxo alternativo 2]

## Requisitos de Interface (UI)

### Layout Geral
- Descreva o layout esperado
- Include wireframes ou mockups se disponíveis

### Componentes Necessários
- [ ] Componente 1
- [ ] Componente 2
- [ ] Componente 3

### Interações
- Descreva as interações esperadas
- Animations/transições necessárias

## Requisitos de Dados

### Entidades Envolvidas
**EntityName**:
- campo1 (tipo)
- campo2 (tipo)
- campo3 (tipo)

### Relacionamentos
- Entity1 tem muitos Entity2
- Entity3 pertence a Entity1
- [Descreva outros relacionamentos]

### Regras de Negócio
- Regra 1
- Regra 2
- Regra 3

## APIs Necessárias

### Endpoint 1: [Nome do Endpoint]
- **Método**: GET/POST/PUT/DELETE
- **URL**: `/api/resource`
- **Descrição**: Breve descrição
- **Autenticação**: Sim/Não
- **Body**: [Exemplo de request]
- **Response**: [Exemplo de response]

## Requisitos de Teste

### Testes Unitários
- [ ] Teste 1
- [ ] Teste 2
- [ ] Teste 3

### Testes de Integração
- [ ] Teste 1
- [ ] Teste 2

### Testes E2E
- [ ] Teste 1
- [ ] Teste 2

## Riscos e Dependências

### Riscos
| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|------------|
| Risco 1 | Alto/Médio/Baixo | Alta/Média/Baixa | [Mitigação] |
| Risco 2 | Alto/Médio/Baixo | Alta/Média/Baixa | [Mitigação] |

### Dependências
- Dependência externa 1
- Dependência externa 2
- Serviço interno X

## Cronograma

| Fase | Data Início | Data Fim | Status |
|-------|-------------|-----------|---------|
| Planejamento | DD/MM/AAAA | DD/MM/AAAA | [ ] |
| Desenvolvimento | DD/MM/AAAA | DD/MM/AAAA | [ ] |
| Testes | DD/MM/AAAA | DD/MM/AAAA | [ ] |
| Deploy | DD/MM/AAAA | DD/MM/AAAA | [ ] |

## Métricas de Sucesso

- [ ] Métrica 1: [Valor esperado]
- [ ] Métrica 2: [Valor esperado]
- [ ] Métrica 3: [Valor esperado]

## Anexos e Referências

- [Link para documentação relacionada]
- [Link para design/mockups]
- [Link para tickets/issues]
- [Outros anexos]

## Histórico de Mudanças

| Data | Versão | Alteração | Autor |
|-------|---------|-----------|--------|
| DD/MM/AAAA | 1.0 | Criação do documento | [Nome] |
| DD/MM/AAAA | 1.1 | [Descrição] | [Nome] |
```

## Exemplo de Uso

### Criar PRD para Sistema de Categorias

```markdown
# Sistema de Categorização de Tarefas

## Visão Geral
- **Status**: Planejamento
- **Prioridade**: Alta
- **Responsável**: João Silva
- **Data Prevista**: 20/03/2026
- **Versão**: 1.0

## Contexto e Justificativa

### Problema
Usuários estão tendo dificuldade em organizar tarefas devido à quantidade grande de itens não categorizados.

### Objetivos
- Permitir que usuários criem categorias personalizadas
- Associar tarefas a categorias
- Filtrar tarefas por categoria

### Benefícios Esperados
- Melhor organização de tarefas
- Maior produtividade dos usuários
- Redução de tempo gasto buscando tarefas específicas

## Requisitos Funcionais

### RF-001: Criar Categoria
**Descrição**: Usuário deve poder criar novas categorias com nome e cor.

**Critérios de Aceite**:
- [ ] Usuário acessa página de categorias
- [ ] Clica em "Nova Categoria"
- [ ] Preenche nome (máx 255 caracteres) e cor
- [ ] Sistema salva categoria
- [ ] Categoria aparece na lista

**Prioridade**: Alta

### RF-002: Listar Categorias
**Descrição**: Usuário deve ver todas as categorias criadas.

**Critérios de Aceite**:
- [ ] Lista todas as categorias
- [ ] Mostra nome e cor de cada categoria
- [ ] Permite editar/excluir cada categoria
- [ ] Paginação se mais de 20 categorias

**Prioridade**: Alta

### RF-003: Associar Tarefa a Categoria
**Descrição**: Usuário deve poder vincular uma categoria a uma tarefa.

**Critérios de Aceite**:
- [ ] Ao criar/editar tarefa, usuário seleciona categoria
- [ ] Tarefa salva com categoria associada
- [ ] Categoria aparece na visualização da tarefa

**Prioridade**: Alta

## Requisitos de Dados

### Entidades Envolvidas

**Category**:
- id (bigint, PK)
- name (string, 255)
- slug (string, unique)
- color (string, hex)
- active (boolean, default true)
- user_id (bigint, FK)
- created_at (timestamp)
- updated_at (timestamp)

**Task** (modificado):
- Adicionar campo category_id (nullable bigint, FK)

### Relacionamentos
- Category belongsTo User
- Category hasMany Task
- Task belongsTo Category (opcional)

## APIs Necessárias

### Endpoint 1: Listar Categorias
- **Método**: GET
- **URL**: `/api/categories`
- **Descrição**: Lista todas as categorias do usuário autenticado
- **Autenticação**: Sim
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Trabalho",
      "slug": "trabalho",
      "color": "#FF5733",
      "active": true,
      "tasks_count": 5
    }
  ]
}
```

### Endpoint 2: Criar Categoria
- **Método**: POST
- **URL**: `/api/categories`
- **Descrição**: Cria nova categoria
- **Autenticação**: Sim
- **Body**:
```json
{
  "name": "Pessoal",
  "color": "#4CAF50"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Categoria criada com sucesso",
  "data": {
      "id": 2,
      "name": "Pessoal",
      "slug": "pessoal",
      "color": "#4CAF50",
      "active": true
  }
}
```
```

## Checklist de Validação

Ao criar um PRD, verifique:

- [ ] Todos os campos obrigatórios preenchidos
- [ ] Requisitos funcionais claros e mensuráveis
- [ ] Critérios de aceite bem definidos
- [ ] Casos de uso cobrem cenários principais
- [ ] Riscos identificados e mitigados
- [ ] Cronograma realista
- [ ] Métricas de sucesso definidas
- [ ] Referências e anexos incluídos

## Dicas Adicionais

- Seja específico e evite ambiguidades
- Inclua exemplos sempre que possível
- Priorize requisitos por impacto no negócio
- Considere edge cases nos requisitos
- Mantenha o documento atualizado conforme mudanças