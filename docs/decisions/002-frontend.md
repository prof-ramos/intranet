# ADR 002 — Por que Blade + Alpine.js?

## Status

Aceito | 2025-03-18

---

## Contexto

Precisamos decidir a estratégia de frontend para a intranet:
- Painel administrativo com formulários e tabelas
- Drag-and-drop de tarefas (Kanban)
- Calendário interativo
- Dashboard com KPIs atualizados
- Equipe familiarizada com HTML/CSS básico

---

## Decisão

Usar **Blade (templates Laravel) + Alpine.js 3.x** para interatividade.

---

## Justificativa

### Por que Blade?

| Fator | Benefício |
|-------|-----------|
| **Server-side rendering** | SEO-friendly (mesmo que seja intranet) |
| **Zero build step** | Funciona sem Node.js tooling complexo |
| **Herança de templates** | `@extends`, `@section`, `@yield` DRY |
| **Diretivas nativas** | `@auth`, `@foreach`, `@csrf` embutidos |
| **Laravel integrado** | Acesso direto a `$task`, `$users` da view |
| **Cache compilandado** | Performance de PHP puro |

### Por que Alpine.js?

| Fator | Benefício |
|-------|-----------|
| **Leve** | ~15KB minified (vs React 130KB+) |
| **Sintaxe declarativa** | `x-data`, `@click`, `x-show` no HTML |
| **Sem build step** | CDN ou `<script>` tag funciona |
| **Reativo o suficiente** | Para painel admin, não precisa de estado complexo |
| **Curva de aprendizado** | Desenvolvedores frontend conhecem JS padrão |

### Casos de Uso Específicos

```javascript
// Kanban drag-and-drop (Alpine + SortableJS)
<div x-data="kanban()">
    <div x-sortable>
        <template x-for="task in tasks">
            <div @click="editTask(task)">{{ task.title }}</div>
        </template>
    </div>
</div>

// Toggle de modal
<div x-data="{ open: false }">
    <button @click="open = true">Abrir</button>
    <div x-show="open" @click.away="open = false">...</div>
</div>
```

---

## Consequências

### Positivas

- Desenvolvimento rápido: sem `npm run dev` constante
- Deploy simples: `git pull` funciona
- Debug fácil: HTML inspecionável diretamente
- Performance: primeiro paint instantâneo (server-side)

### Negativas

- Estado não compartilhado entre componentes (sem "lift up" fácil)
- Para SPA complexa, React/Vue seria melhor
- Menos ferramentas de dev (Redux DevTools, etc.)

---

## Alternativas Consideradas

### React + Inertia.js

- **Pros**: Ecossistema enorme, componentes reutilizáveis
- **Cons**: Build step obrigatório, curva de aprendizado maior
- **Veredito**: Overkill para intranet simples

### Vue.js 3

- **Pros**: Balance bom entre peso e poder
- **Cons**: Ainda mais complexo que Alpine para casos simples
- **Veredito**: V2 se UX crescer

### Livewire 3

- **Pros**: Reatividade server-side, sem JS front
- **Cons**: Round-trips ao servidor, Latência sentida
- **Veredito**: V2 se formos full server-side

### Blade Puro (sem Alpine)

- **Pros**: Máxima simplicidade
- **Cons**: Formulários sem AJAX cansam, UX ruim
- **Veredito**: Insuficiente para UX moderna

---

## Quando Reconsiderar

Migrar para React/Vue se:
- Múltiplas views com estado compartilhado complexo
- Necessidade de otimizações avançadas (memo, lazy loading)
- Time frontend dedicado querendo usar stack moderna

---

## Referências

- [Alpine.js Documentation](https://alpinejs.dev/)
- [Laravel Blade Documentation](https://laravel.com/docs/11.x/blade)
- [SortableJS](https://sortablejs.github.io/Sortable/)

---

**Decidido por**: Equipe Técnica ASOF
**Revisão**: V1 — Decisão inicial
