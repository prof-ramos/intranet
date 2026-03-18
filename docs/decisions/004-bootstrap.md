# Decision 004: Bootstrap 5 + Alpine.js

> **Data**: 2026-03-18
> **Status**: Aceito
> **Contexto**: Etapa 3 - Arquitetura Frontend

---

## Decisão

Adotar **Bootstrap 5 (vanilla JS)** + **Alpine.js** como stack frontend para a Intranet ASOF.

---

## Drivers

1. **Compatibilidade com Laravel Breeze** - Já instalado no projeto
2. **Curva de aprendizado** - Equipe conhece Bootstrap
3. **Templates disponíveis** - Ampl oferta de templates gratuitos MIT
4. **Performance** - Alpine.js é leve (~15KB)
5. **Zero dependências complexas** - Sem jQuery, sem React/Vue

---

## Alternativas Consideradas

| Opção | Prós | Contras | Veredito |
|-------|------|---------|----------|
| **Bootstrap 5 + Alpine** | Simples, templates grátis, MIT | Menos "moderno" | ✅ **Escolhido** |
| Tailwind + Alpine | Mais customizável | Curva maior, menos templates | ❌ Descartado |
| React + Laravel | SPA completo | Complexidade alta | ❌ Over-engineering |
| Livewire 3 | PHP-only, curva baixa | Novo para equipe | ⏳ Futuro |

---

## Implementação

### Pacotes Instalados

```json
{
  "bootstrap": "^5.3.0",
  "alpinejs": "^3.4.2",
  "sortablejs": "^1.15.0",
  "@fullcalendar/*": "^6.1.0"
}
```

### Estrutura de Arquivos

```
resources/
├── css/
│   └── app.css          # Bootstrap CSS + custom styles
├── js/
│   ├── app.js           # Bootstrap JS + Alpine components
│   └── alpine/          # (futuro) componentes modulares
└── views/
    ├── layouts/
    │   └── app.blade.php   # Layout inspirado Sneat/Materio
    └── components/
        ├── button.blade.php
        ├── card.blade.php
        └── modal.blade.php
```

### Layout Inspirado

Baseado em templates do [awesome-bootstrap](https://github.com/awesome-bootstrap-org/awesome-bootstrap):

| Template | Feature utilizada |
|----------|-------------------|
| **Sneat Free** | Layout sidebar + navbar |
| **Materio Free** | Card design, color scheme |
| **Modernize Free** | Kanban board pattern |

---

## Componentes Alpine

### Stores Globais

```javascript
// notificationStore
Alpine.store('notification', {
    show(message, type),
    success(message),
    error(message),
    warning(message),
    info(message)
});

// modalStore
Alpine.store('modal', {
    open({ title, content, props }),
    close()
});
```

### Componentes Disponíveis

| Componente | Uso |
|------------|-----|
| `taskCard(id)` | Card de tarefa individual |
| `taskList(tasks)` | Lista com filtros |
| `kanbanBoard()` | Quadro Kanban drag-and-drop |
| `taskForm()` | Formulário de criação |
| `sidebarToggle()` | Toggle sidebar mobile |
| `dropdown()` | Dropdown genérico |
| `confirmDialog()` | Diálogo de confirmação |

---

## Consequências

### Positivas

- ✅ Layout funcional instalado
- ✅ Sistema de notificações working
- ✅ Modal system working
- ✅ Kanban pronto para implementação

### Negativas

- ⚠️ Bootstrap CSS pesado (~231KB gzipped)
- ⚠️ Customização requer override de variáveis

### Mitigações

- Usar apenas CSS necessário (tree-shaking no futuro)
- Manter custom styles em arquivo separado

---

## Próximos Passos

1. ✅ Instalar Bootstrap 5 + Alpine.js
2. ⏳ Criar componentes Blade base
3. ⏳ Implementar Kanban board
4. ⏳ Implementar Dashboard com métricas

---

**Referências**:
- [awesome-bootstrap/awesome-bootstrap](https://github.com/awesome-bootstrap-org/awesome-bootstrap)
- [Bootstrap 5 Docs](https://getbootstrap.com/docs/5.3/)
- [Alpine.js Docs](https://alpinejs.dev/)
