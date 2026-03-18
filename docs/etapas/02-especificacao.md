# Etapa 1 — Especificação com IA

> **Tempo estimado**: 2-4 horas
> **Saída**: PRD + Contexto estruturado pronto para geração

---

## Filosofia

> **"A qualidade da especificação determina a qualidade do código gerado."**

Especificação vibe coded ≠ documento tradicional. É **contexto estruturado** que a IA pode consumir diretamente.

---

## Estrutura do PRD Vibe Coded

### Template `docs/prd.md`

````markdown
# [Nome do Projeto] — PRD

## 1. Visão Geral

- **Objetivo**: [Uma frase clara]
- **Usuários**: [Quem vai usar]
- **Valor**: [O problema que resolve]

## 2. Funcionalidades (Backlog)

### Prioridade ALTA

- [ ] [Feature 1] — Descrição em 1 linha
- [ ] [Feature 2] — Descrição em 1 linha

### Prioridade MÉDIA

- [ ] [Feature 3] — Descrição em 1 linha

### Prioridade BAIXA

- [ ] [Feature 4] — Nice to have

## 3. Tech Stack

```toml
backend = "Laravel 11"
frontend = "Blade + Alpine.js"
database = "MySQL 8"
auth = "Laravel Breeze"
```text

## 4. Modelagem de Dados

### Entidades Principais

```text
User { id, name, email, role }
Task { id, title, status, assigned_to }
```

## 5. Regras de Negócio

1. Tarefa só pode ser atribuída a usuário ativo
2. Status só pode progredir: todo → progress → review → done
3. ...

## 6. APIs Principais

| Método | Endpoint   | Descrição     |
| ------ | ---------- | ------------- |
| GET    | /api/tasks | Lista tarefas |
| POST   | /api/tasks | Cria tarefa   |

## 7. Não-Requisitos (O que NÃO fazer)

- [ ] Autenticação social
- [ ] Upload de arquivos (V1)
- [ ] Notificações em tempo real
````

---

## Prompt de Especificação

### Prompt Base para Gerar PRD

```text
Você é um Product Expert especializado em [domínio].

Baseado na seguinte ideia informal:

"[IDEIA DO PROJETO]"

Crie um PRD estruturado seguindo este formato:

1. Visão Geral (1 parágrafo)
2. Usuários e Personas
3. Funcionalidades Core (máximo 7)
4. Tech Stack Recomendado (justifique)
5. Modelagem de Dados (entidades e relacionamentos)
6. Regras de Negócio (máximo 5)
7. APIs/Endpoints principais
8. Critérios de Sucesso (quando está pronto?)

Seja ESPECÍFICO e CONCRETO. Evite generalidades.
```text

---

## Refinamento com IA

### Iteração 1 — Draft

```text
/claude "Baseado no PRD draft, pergunte-me 5 perguntas críticas
para clarificar requisitos ambiguos."
```

### Iteração 2 — Detalhamento

```text
/claude "Para cada feature do PRD, liste:
- Casos de borda
- Validações necessárias
- Possíveis erros"
```text

### Iteração 3 — Priorização

```text
/claude "Reorganize as features em must-have, should-have e nice-to-have.
Justifique cada categorização."
```

---

## ADRs (Architecture Decision Records)

### Template `docs/decisions/001-laravel.md`

```markdown
# ADR 001 — Por que Laravel?

## Contexto

Precisamos de um framework PHP para backend administrativo.

## Decisão

Usar Laravel 11 como framework principal.

## Justificativa

- Ecossistema maduro
- Breeze para auth rápida
- Eloquent ORM poderoso
- Fácil integração com Google APIs

## Consequências

- Positivo: Desenvolvimento rápido
- Positivo: Grande comunidade
- Negativo: Curva de aprendizado para团队
- Negativo: "Opiniated" pode limitar flexibilidade

## Alternativas Consideradas

- Symfony — Mais flexível, mais complexo
- Slim — Leve, menos recursos
```text

### Prompt para ADR

```text
/claude "Crie um ADR para a decisão de usar [TECNOLOGIA].
Siga o template em docs/decisions/TEMPLATE.md.
Inclua pelo menos 3 alternativas consideradas."
```

---

## Diagramas com IA

### Mermaid para Arquitetura

```text
/claude "Crie um diagrama Mermaid mostrando:
- Frontend (Blade/Alpine)
- Backend (Laravel/Controllers)
- Services (TaskService, CalendarService)
- Repositories (TaskRepository)
- Database (MySQL)

Use o diagrama de fluxo C4 simplificado."
```text

### Mermaid para Dados

```text
/claude "Crie um diagrama ER (Entity Relationship) em Mermaid
com as entidades do PRD. Inclua:
- Cardinalidades (1:N, N:N)
- Foreign keys
- Índices sugeridos"
```

---

## Validação do PRD

### Checklist

- [ ] Objetivo claro em 1 frase?
- [ ] Máximo 7 features core?
- [ ] Tech stack definido?
- [ ] Modelagem de dados esboçada?
- [ ] Regras de negócio listadas?
- [ ] Não-requisitos explícitos?
- [ ] ADRs criados para decisões grandes?
- [ ] Diagramas gerados?

---

## Prompt de Revisão Final

```text
/claude "Revise este PRD e aponte:
1. Contradições ou ambiguidades
2. Features faltando (óbvias)
3. Riscos técnicos não mencionados
4. Dependências externas não citadas

Seja crítico e construtivo."
```text

---

## Saída Esperada

- [ ] `docs/prd.md` completo
- [ ] `docs/decisions/*.md` para decisões técnicas
- [ ] `docs/architecture.mmd` (diagrama)
- [ ] `docs/data-model.mmd` (diagrama)
- [ ] Checklist de validação preenchido

---

## Dicas

### Especificação Boa

- Features descritas em **1 frase** cada
- Tech stack com **versões**
- Regras de negócio **testáveis** (verdadeiro/falso)
- Não-requisitos explícitos

### Especificação Ruim

- Parágrafos longos e confusos
- "Depende" ou "talvez"
- Tech stack vago ("frontend moderno")
- Tudo é prioridade alta

---

**Versão**: 1.0
**Data**: 2025-03-18

**Próxima**: [03-arquitetura.md](./03-arquitetura.md)
