# Frontend Architecture — Blade + Alpine.js

> **Etapa 2 — Suplemento de Arquitetura**

---

## 1. Estrutura de Diretórios

```
resources/
├── views/
│   ├── layouts/
│   │   ├── app.blade.php           # Layout principal
│   │   └── guest.blade.php         # Layout sem autenticação
│   ├── components/                  # Blade Components globais
│   │   ├── alert.blade.php         # @props(['type', 'message'])
│   │   ├── button.blade.php        # @props(['variant', 'size'])
│   │   ├── card.blade.php          # @props(['title', 'footer'])
│   │   ├── input.blade.php         # @props(['name', 'label', 'type'])
│   │   ├── modal.blade.php         # @props(['id', 'title'])
│   │   └── select.blade.php        # @props(['name', 'options'])
│   └── pages/
│       ├── dashboard/
│       │   └── index.blade.php
│       ├── tasks/
│       │   ├── index.blade.php     # Listagem
│       │   ├── show.blade.php      # Detalhes
│       │   ├── create.blade.php    # Formulário
│       │   └── partials/
│       │       ├── task-card.blade.php
│       │       └── task-filters.blade.php
│       └── kanban/
│           └── board.blade.php     # Kanban interativo
│
└── js/
    └── alpine/
        ├── components/              # Componentes Alpine reutilizáveis
        │   ├── dropdown.js
        │   ├── modal.js
        │   └── confirm.js
        ├── task-card.js             # Lógica do card de tarefa
        ├── task-filters.js          # Filtros reativos
        ├── kanban-board.js          # Drag-and-drop
        └── calendar.js               # FullCalendar wrapper
```

---

## 2. Padrão de Comunicação Blade → Alpine

### Regra de Ouro

**Controller retorna array → Blade serializa com `@json()` → Alpine consome**

### Exemplo Completo

#### Controller
```php
// app/Http/Controllers/TaskController.php
public function index(Request $request)
{
    $tasks = Task::with('assignedTo', 'createdBy')
        ->where('status', '!=', TaskStatus::Done)
        ->orderBy('deadline')
        ->get();

    return view('tasks.index', [
        'tasks' => $tasks,                 // Collection serializada
        'statuses' => TaskStatus::cases(), // Array de enums
        'priorities' => TaskPriority::cases(),
    ]);
}
```

#### Blade View
```blade
{{-- resources/views/tasks/index.blade.php --}}
@extends('layouts.app')

@section('content')
<div x-data="taskList()" x-init="init({{ json_encode($tasks) }})">
    {{-- Filtros --}}
    <div class="filters">
        <select x-model="filters.status" @change="applyFilters()">
            <option value="">Todos os status</option>
            @foreach($statuses as $status)
                <option value="{{ $status->value }}">{{ $status->label() }}</option>
            @endforeach
        </select>
    </div>

    {{-- Lista --}}
    <div class="task-list">
        <template x-for="task in filteredTasks" :key="task.id">
            @include('tasks.partials.task-card', ['task' => null])
        </template>
    </div>
</div>
@endsection
```

#### Task Card Component
```blade
{{-- resources/views/tasks/partials/task-card.blade.php --}}
@props([
    'task' => null, // Quando via Alpine, não é passado
])

<div x-data="taskCard({{ $task?->id ?? $task?.id ?? '' }})"
     x-show="task"
     class="task-card"
     :class="task.priority_class">
    <h3 x-text="task.title"></h3>
    <p x-text="task.assigned_to?.name"></p>
    <span x-text="task.deadline"></span>
</div>
```

#### Alpine Component
```javascript
// resources/js/alpine/task-card.js
export default (taskId = null) => ({
    task: null,
    loading: false,

    init() {
        if (taskId) {
            this.fetchTask(taskId);
        }
    },

    async fetchTask(id) {
        this.loading = true;
        try {
            const response = await fetch(`/api/tasks/${id}`);
            this.task = await response.json();
        } finally {
            this.loading = false;
        }
    },

    get priorityClass() {
        if (!this.task) return '';
        return {
            'low': 'border-l-4 border-gray',
            'normal': 'border-l-4 border-blue',
            'high': 'border-l-4 border-orange',
            'urgent': 'border-l-4 border-red',
        }[this.task.priority] || '';
    }
});
```

---

## 3. Padrão de Componentes Blade

### Componente Button
```blade
{{-- resources/views/components/button.blade.php --}}
@props(['variant' => 'primary', 'size' => 'md', 'type' => 'button'])

@php
$variants = [
    'primary' => 'bg-blue-600 hover:bg-blue-700 text-white',
    'secondary' => 'bg-gray-600 hover:bg-gray-700 text-white',
    'danger' => 'bg-red-600 hover:bg-red-700 text-white',
];

$sizes = [
    'sm' => 'px-3 py-1.5 text-sm',
    'md' => 'px-4 py-2 text-base',
    'lg' => 'px-6 py-3 text-lg',
];
@endphp

<button {{ $attributes->merge(['type' => $type]) }}
        class="rounded font-medium {{ $sizes[$size] }} {{ $variants[$variant] }}">
    {{ $slot }}
</button>
```

### Uso
```blade
<x-button variant="danger" size="sm" onclick="confirmDelete()">
    Excluir
</x-button>
```

---

## 4. Padrão de Estado Global (Alpine Store)

```javascript
// resources/js/alpine/stores/notification.js
export default () => ({
    notifications: [],
    timeout: null,

    show(message, type = 'info') {
        this.notifications.push({ message, type });

        // Auto-remove após 5 segundos
        setTimeout(() => {
            this.remove(0);
        }, 5000);
    },

    remove(index) {
        this.notifications.splice(index, 1);
    }
});
```

```blade
{{-- No layout --}}
<div x-data="notificationStore" class="fixed top-4 right-4">
    <template x-for="(notif, index) in notifications" :key="index">
        <div :class="`alert alert-${notif.type}`">
            <span x-text="notif.message"></span>
            <button @click="remove(index)">×</button>
        </div>
    </template>
</div>
```

---

## 5. Integração FullCalendar

```javascript
// resources/js/alpine/calendar.js
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default () => ({
    calendar: null,

    init() {
        const calendarEl = document.getElementById('calendar');

        this.calendar = new Calendar(calendarEl, {
            plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
            initialView: 'dayGridMonth',
            locale: 'pt-BR',
            headerToolbar: {
                left: 'prev,next',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
            },
            events: '/api/calendar-events',
            selectable: true,
            select: (info) => {
                this.openCreateModal(info.start, info.end);
            },
            eventClick: (info) => {
                info.jsEvent.preventDefault();
                window.location.href = `/tasks/${info.event.id}`;
            }
        });

        this.calendar.render();
    },

    openCreateModal(start, end) {
        // Abre modal para criar tarefa
        Alpine.store('modal').open({
            title: 'Nova Tarefa',
            component: 'task-form',
            props: { deadline: start }
        });
    },

    refresh() {
        this.calendar.refetchEvents();
    }
});
```

---

## 6. Drag-and-Drop Kanban (SortableJS)

```javascript
// resources/js/alpine/kanban-board.js
import Sortable from 'sortablejs';

export default () => ({
    columns: {
        todo: [],
        progress: [],
        review: [],
        done: []
    },

    init() {
        this.fetchTasks();
        this.setupSortable();
    },

    async fetchTasks() {
        const response = await fetch('/api/tasks');
        const tasks = await response.json();

        // Distribui pelas colunas
        this.columns = tasks.reduce((acc, task) => {
            acc[task.status].push(task);
            return acc;
        }, { todo: [], progress: [], review: [], done: [] });
    },

    setupSortable() {
        Object.keys(this.columns).forEach(status => {
            const el = document.getElementById(`column-${status}`);

            new Sortable(el, {
                group: 'kanban',
                animation: 150,
                ghostClass: 'opacity-50',
                onEnd: async (evt) => {
                    const taskId = evt.item.dataset.taskId;
                    const newStatus = evt.to.id.replace('column-', '');

                    await this.updateStatus(taskId, newStatus);
                }
            });
        });
    },

    async updateStatus(taskId, newStatus) {
        await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
    }
});
```

---

## 7. Validação em Tempo Real

```javascript
// resources/js/alpine/task-form.js
export default () => ({
    form: {
        title: '',
        description: '',
        deadline: '',
        priority: 'normal'
    },
    errors: {},

    async submit() {
        this.errors = {};

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.form)
            });

            if (response.status === 422) {
                const data = await response.json();
                this.errors = data.errors;
            } else {
                window.location.href = '/tasks';
            }
        } catch (e) {
            console.error('Erro ao submeter:', e);
        }
    },

    get hasErrors() {
        return Object.keys(this.errors).length > 0;
    }
});
```

---

## 8. Boas Práticas

### ✅ Faça

- **Use `@json($data)`** para passar dados do Controller para Alpine
- **Componentes Alpine isolados** — um arquivo por componente
- **Slots do Blade** para conteúdo dinâmico
- **Loading states** com `<template x-if="loading">`
- **Classes Tailwind condicionais** com `:class`

### ❌ Evite

- **Lógica complexa no Blade** — mova para Alpine
- **Chamadas API repetitivas** — use cache ou Alpine stores
- **Estado global excessivo** — prefira componentes isolados
- **Mix `x-data` e `@Entangle`** — escolha um padrão
- **Event listeners inline** — use métodos do componente Alpine

---

## 9. Registro de Componentes Alpine

```javascript
// resources/js/app.js (criado pelo Laravel Breeze)
import './alpine/task-card';
import './alpine/task-filters';
import './alpine/kanban-board';
import './alpine/calendar';

document.addEventListener('alpine:init', () => {
    Alpine.store('notification', notificationStore());
    Alpine.store('modal', modalStore());
});
```

```bash
# Para registrar novo componente
echo "import './alpine/seu-componente';" >> resources/js/app.js
npm run build
```
