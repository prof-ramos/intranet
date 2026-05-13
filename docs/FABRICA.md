# Fábrica de Software ASOF

Sistema de orquestração de agentes de IA para desenvolvimento paralelo do ASOF Intranet usando git worktrees e o canvas Maestri.

---

## Visão Geral

A fábrica de software é uma infraestrutura de desenvolvimento que permite múltiplos agentes de IA trabalharem em paralelo em diferentes estações (worktrees git), cada uma especializada em um tipo de tarefa, coordenados pelo Maestro (agente líder).

**Princípios:**
- **Isolação:** Cada agente trabalha em seu próprio worktree git isolado
- **Especialização:** Cada estação tem um propósito específico e um agente especializado
- **Paralelismo:** Tarefas independentes executam simultaneamente
- **Qualidade:** Duas etapas de revisão (spec compliance + code quality) antes da integração
- **Rastreabilidade:** Todas as ações são logadas e versionadas

---

## Arquitetura da Fábrica

```text
┌─────────────────────────────────────────────────────────────────┐
│                         MAESTRO (Líder)                        │
│              Coordenação, Autorização, Integração               │
└────────────────────┬──────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┬────────────┐
        │            │            │            │            │
   ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
   │  DEV    │  │ REVIEW  │  │  TEST   │  │  DOCS   │  │  HOTFIX │
   │Estação  │  │Estação  │  │Estação  │  │Estação  │  │Estação  │
   │         │  │         │  │         │  │         │  │         │
   │Developer│  │Reviewer │  │Tester   │  │Doc Writer│  │Developer│
   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
        │            │            │            │            │
        └────────────┴────────────┴────────────┴────────────┘
                                    │
                     ┌───────────────▼───────────────┐
                     │         INTEGRAÇÃO           │
                     │   Merge → Review → Deploy    │
                     └───────────────────────────────┘
```

---

## Estações de Trabalho (Worktrees)

Todas as estações ficam em `.claude/worktrees/fabrica-*`.

### 1. Estação de Desenvolvimento (`fabrica-dev`)
- **Propósito:** Desenvolvimento de novas features
- **Branch padrão:** `fabrica/dev`
- **Agente:** Developer
- **Tarefas:** Implementação de features, refatorações, novos módulos
- **Worktree existente:** `dev-feature` (será renomeado/reutilizado)

### 2. Estação de Revisão (`fabrica-review`)
- **Propósito:** Code review e análise de qualidade
- **Branch padrão:** `fabrica/review`
- **Agente:** Reviewer
- **Tarefas:** Revisão de código, análise de spec compliance, code quality review
- **Worktree existente:** `review-feature` (será renomeado/reutilizado)

### 3. Estação de Testes (`fabrica-test`)
- **Propósito:** Escrita e execução de testes
- **Branch padrão:** `fabrica/test`
- **Agente:** Tester
- **Tarefas:** Testes unitários, testes de integração, testes E2E
- **Worktree existente:** `test-feature` (será renomeado/reutilizado)

### 4. Estação de Documentação (`fabrica-docs`)
- **Propósito:** Documentação técnica e de produto
- **Branch padrão:** `fabrica/docs`
- **Agente:** Documenter
- **Tarefas:** Atualização de README, ARCHITECTURE.md, CLAUDE.md, DESIGN.md
- **Worktree existente:** `docs-feature` (será renomeado/reutilizado)

### 5. Estação de Hotfix (`fabrica-hotfix`)
- **Propósito:** Correções urgentes de bugs em produção
- **Branch padrão:** `fabrica/hotfix`
- **Agente:** Developer (prioridade máxima)
- **Tarefas:** Correções críticas, patches de segurança
- **Worktree:** Novo

### 6. Estação de Arquitetura (`fabrica-arch`)
- **Propósito:** Prototipagem e análise arquitetural
- **Branch padrão:** `fabrica/arch`
- **Agente:** Architect
- **Tarefas:** Análise de desempenho, prototipagem, decisões de design
- **Worktree:** Novo

---

## Fluxo de Trabalho

### Ciclo de Desenvolvimento de Feature

```
1. Maestro recebe demanda de feature
   │
2. Maestro cria branch `feature/nome` a partir de main
   │
3. Maestro delega para Estação DEV:
   │   Developer implementa a feature
   │   ├── Implementa código
   │   ├── Escreve testes unitários
   │   ├── Roda lint + typecheck
   │   └── Commita no worktree
   │
4. Maestro delega para Estação REVIEW:
   │   Reviewer faz spec compliance review
   │   └── Se aprovado → code quality review
   │       └── Se aprovado → aprovado para merge
   │       └── Se rejeitado → volta para DEV
   │   └── Se rejeitado → volta para DEV
   │
5. Maestro delega para Estação TEST:
   │   Tester escreve testes de integração/E2E
   │   └── Se aprovado → pronto para merge
   │   └── Se rejeitado → volta para DEV
   │
6. Maestro integra na main via merge
   │
7. Maestro delega para Estação DOCS:
   │   Documenter atualiza documentação
   │
8. Maestro faz deploy
```

### Ciclo de Hotfix

```
1. Maestro recebe alerta de bug crítico
   │
2. Maestro cria branch `hotfix/nome` a partir de main
   │
3. Maestro delega para Estação HOTFIX (prioridade máxima)
   │   Developer implementa correção
   │   └── Commita no worktree
   │
4. Maestro delega para Estação REVIEW (fast-track)
   │   Reviewer faz review acelerado
   │   └── Se aprovado → merge direto
   │
5. Maestro faz deploy imediato
   │
6. Maestro delega para Estação DOCS (atualização de changelog)
```

---

## Papéis dos Agentes

### Maestro (Líder)
- **Responsabilidades:**
  - Receber e interpretar demandas
  - Delegar tarefas para agentes especializados
  - Autorizar ou negar decisões importantes
  - Integrar trabalho dos agentes
  - Fazer deploy
- **Localização:** Terminal principal no Maestri
- **Modelo:** Opus (capacidade máxima de raciocínio)

### Developer
- **Responsabilidades:**
  - Implementar código conforme especificação
  - Escrever testes unitários
  - Garantir qualidade do código (lint, typecheck)
  - Fazer self-review antes de entregar
- **Estação:** `fabrica-dev` ou `fabrica-hotfix`
- **Modelo:** Sonnet (padrão)

### Reviewer
- **Responsabilidades:**
  - Revisar código para spec compliance
  - Revisar código para qualidade (padrões, segurança, performance)
  - Identificar bugs, edge cases, problemas de arquitetura
  - Aprovar ou rejeitar com feedback detalhado
- **Estação:** `fabrica-review`
- **Modelo:** Sonnet (análise profunda)

### Tester
- **Responsabilidades:**
  - Escrever testes de integração e E2E
  - Executar testes e reportar falhas
  - Validar cobertura de testes
  - Garantir que features funcionam em cenários reais
- **Estação:** `fabrica-test`
- **Modelo:** Sonnet

### Documenter
- **Responsabilidades:**
  - Atualizar documentação técnica
  - Manter CLAUDE.md, ARCHITECTURE.md, DESIGN.md sincronizados
  - Escrever guias de uso e onboarding
  - Documentar APIs e interfaces
- **Estação:** `fabrica-docs`
- **Modelo:** Haiku (rápido, eficiente)

### Architect
- **Responsabilidades:**
  - Analisar decisões arquiteturais
  - Prototipar soluções
  - Avaliar trade-offs técnicos
  - Revisar design de novos módulos
- **Estação:** `fabrica-arch`
- **Modelo:** Opus (raciocínio arquitetural)

---

## Comandos de Orquestração

### Criar nova estação
```bash
# Criar worktree para nova feature
git worktree add .claude/worktrees/fabrica-dev -b fabrica/dev

# Instalar dependências
cd .claude/worktrees/fabrica-dev && npm install
```

### Delegar tarefa para agente
```bash
# Via Maestri CLI
maestri ask "Developer" "Implementar feature X conforme especificação Y"
maestri ask "Reviewer" "Revisar branch fabrica/dev para spec compliance"
maestri ask "Tester" "Escrever testes E2E para feature X"
```

### Verificar status de agente
```bash
maestri check "Developer"
maestri check "Reviewer"
```

### Criar nota de coordenação
```bash
maestri note create "## Sprint 42
- Feature X: em desenvolvimento (Developer)
- Feature Y: em revisão (Reviewer)
- Bug Z: corrigido, aguardando testes"
```

### Integrar trabalho
```bash
# Merge de feature para main
cd /Users/gabrielramos/projetos/ASOF/intranet
git merge fabrica/dev

# Após merge, atualizar estações
git worktree prune
```

---

## Convenções de Branch

| Prefixo | Uso | Exemplo |
|---------|-----|---------|
| `feature/` | Novas funcionalidades | `feature/financeiro-dashboard` |
| `hotfix/` | Correções urgentes | `hotfix/login-rate-limit` |
| `refactor/` | Refatorações | `refactor/juridico-queries` |
| `docs/` | Documentação | `docs/api-spec` |
| `test/` | Testes | `test/e2e-playwright` |
| `fabrica/` | Branches da fábrica | `fabrica/dev`, `fabrica/review` |

---

## Checklist de Qualidade

Antes de integrar qualquer trabalho na main:

- [ ] Código implementado e testado
- [ ] Spec compliance review aprovado
- [ ] Code quality review aprovado
- [ ] Testes unitários passando (`npm run test`)
- [ ] Testes E2E passando (`npm run test:e2e`)
- [ ] Lint passando (`npm run lint`)
- [ ] TypeScript sem erros (`npm run typecheck`)
- [ ] Build de produção passando (`npm run build`)
- [ ] Documentação atualizada (se aplicável)
- [ ] Migrações de banco aplicadas (se aplicável)

---

## Escalonamento

### Quando um agente fica BLOCKED
1. Maestro avalia o blocker
2. Se problema de contexto → fornece mais contexto e re-delega
3. Se tarefa muito complexa → divide em subtarefas menores
4. Se plano está errado → escala para usuário humano

### Quando reviewer rejeita
1. Implementer corrige os problemas
2. Reviewer re-revisa
3. Repete até aprovação

### Quando testes falham
1. Tester reporta falhas detalhadamente
2. Maestro delega correção para Developer
3. Tester re-executa testes

---

## Métricas da Fábrica

- **Tempo médio de desenvolvimento:** por feature
- **Taxa de rejeição do reviewer:** por agente
- **Cobertura de testes:** por módulo
- **Tempo de integração:** desde delegação até merge
- **Incidentes de produção:** por sprint

---

## Segurança

- Service-role keys nunca em worktrees
- Cada worktree usa seu próprio `.env.local`
- RLS habilitado em todas as conexões
- Audit trail para todas as ações administrativas
- Worktrees de hotfix são destruídos após merge

---

## Manutenção da Fábrica

### Semanal
- Verificar worktrees obsoletos (`git worktree list`)
- Limpar branches mergeadas
- Atualizar dependências em todas as estações

### Mensal
- Revisar arquitetura da fábrica
- Avaliar eficiência dos agentes
- Atualizar este documento

---

*Documento versionado. Última atualização: 2026-05-13*
