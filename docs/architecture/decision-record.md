# Arquitetura Intranet ASOF — Slim Architecture (Aprovada)

> **Versão**: 2.1 | **Status**: Aprovado | **Data**: 2025-03-18

---

## ADR (Architecture Decision Record)

### Decisão
Adotar **Slim Architecture** (Option C) para o desenvolvimento da Intranet ASOF.

### Drivers
1. **Velocidade de MVP** — Time-to-market prioritário
2. **Equipe pequena** — 3-5 desenvolvedores
3. **Domínio moderado** — 3 entidades principais

### Alternativas Rejeitadas

| Alternativa | Por que Rejeitada |
|-------------|-------------------|
| Full DDD (Services + Repositories) | Over-engineering para 3 entidades |
| Fat Models (tudo no Model) | Dificulta testes, lógica vaza para controllers |

### Consequências

**Positivas**:
- MVP em semanas (não meses)
- Onboarding rápido (2 horas vs 4 horas)
- Debugging simples (2 camadas vs 4)

**Negativas**:
- Refatoração necessária quando domínio crescer
- Custo de evolução: 5.5-9 dias total

---

## Estrutura de Arquivos (6 por Entidade)

### Task (Tarefa)
```
1. app/Enums/TaskStatus.php           ✅ Já existe
2. app/Enums/TaskPriority.php         ✅ Já existe
3. app/Models/Task.php                ✅ Já existe (adicionar scopes)
4. app/Models/TaskHistory.php         ⬜ Criar
5. app/Http/Controllers/TaskController.php  ⬜ Criar
6. app/Http/Requests/TaskRequest.php  ⬜ Criar
```

### Contact (CRM)
```
1. app/Models/Contact.php             ⬜ Criar
2. app/Http/Controllers/ContactController.php  ⬜ Criar
3. app/Http/Requests/ContactRequest.php  ⬜ Criar
```

### Shared
```
1. app/Policies/TaskPolicy.php         ⬜ Criar
2. app/Exceptions/TaskException.php    ⬜ Criar
3. app/Observers/TaskObserver.php     ⬜ Criar
```

---

## Gatilhos de Evolução

| Gatilho | Ação | Estimativa |
|---------|------|------------|
| Controller method >20 linhas | Extract Action | 0.5-1 dia |
| Query repetida ≥3 vezes | Add Scope | 1 dia |
| Model method >15 linhas | Add Service | 1-2 dias |
| Teste exige >3 mocks | Consider Repository | 2-3 dias |
| Operação em ≥3 Models | Create Action | 0.5-1 dia |

---

## Próximos Passos

1. **Etapa 3** — Geração de código base (migrations, models, controllers)
2. **Etapa 4** — Revisão sistemática
3. **Etapa 5** — Refino e testes

---

**Documentos Relacionados**:
- [Frontend Architecture](./frontend.md)
- [Custo de Evolução](./evolution-cost.md)
- [Data Model](../data-model.mmd)
