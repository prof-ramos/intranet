/**
 * Bootstrap 5 + Alpine.js
 * Intranet ASOF
 */

// Bootstrap 5 (CSS já importado no app.css)
import * as bootstrap from 'bootstrap/dist/js/bootstrap.esm.js';
window.bootstrap = bootstrap;

// SortableJS (para Kanban drag-and-drop)
import Sortable from 'sortablejs';
window.Sortable = Sortable;

// Alpine.js
import Alpine from 'alpinejs';

// ============================================
// Componentes Alpine
// ============================================

// Store de notificações
Alpine.store('notification', () => ({
    notifications: [],

    show(message, type = 'info') {
        const id = Date.now();
        this.notifications.push({ id, message, type });

        // Auto-remove após 5 segundos
        setTimeout(() => this.remove(id), 5000);
    },

    remove(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
    },

    success(message) {
        this.show(message, 'success');
    },

    error(message) {
        this.show(message, 'danger');
    },

    warning(message) {
        this.show(message, 'warning');
    },

    info(message) {
        this.show(message, 'info');
    }
}));

// Store de modal
Alpine.store('modal', () => ({
    isOpen: false,
    title: '',
    content: '',
    props: {},

    open(options = {}) {
        this.isOpen = true;
        this.title = options.title || '';
        this.content = options.content || '';
        this.props = options.props || {};

        // Abre o modal Bootstrap
        const modalEl = document.getElementById('dynamicModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    },

    close() {
        this.isOpen = false;
        const modalEl = document.getElementById('dynamicModal');
        if (modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        }
    }
}));

// Componente: Task Card
Alpine.data('taskCard', (taskId = null) => ({
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
            if (response.ok) {
                this.task = await response.json();
            }
        } catch (error) {
            console.error('Erro ao carregar tarefa:', error);
        } finally {
            this.loading = false;
        }
    },

    get priorityClass() {
        if (!this.task) return '';
        return {
            'low': 'border-start border-4 border-success',
            'normal': 'border-start border-4 border-info',
            'high': 'border-start border-4 border-warning',
            'urgent': 'border-start border-4 border-danger',
        }[this.task.priority] || '';
    },

    get statusBadge() {
        if (!this.task) return '';
        return {
            'todo': 'status-todo',
            'progress': 'status-progress',
            'review': 'status-review',
            'done': 'status-done',
            'blocked': 'status-blocked',
        }[this.task.status] || '';
    }
}));

// Componente: Task List (com filtros)
Alpine.data('taskList', (initialTasks = []) => ({
    tasks: initialTasks,
    filters: {
        status: '',
        priority: '',
        assignedTo: ''
    },
    loading: false,

    get filteredTasks() {
        return this.tasks.filter(task => {
            if (this.filters.status && task.status !== this.filters.status) return false;
            if (this.filters.priority && task.priority !== this.filters.priority) return false;
            if (this.filters.assignedTo && task.assigned_to?.id != this.filters.assignedTo) return false;
            return true;
        });
    },

    async refresh() {
        this.loading = true;
        try {
            const response = await fetch('/api/tasks');
            this.tasks = await response.json();
        } finally {
            this.loading = false;
        }
    },

    applyFilters() {
        // Os computed getters lidam com isso automaticamente
    }
}));

// Componente: Kanban Board
Alpine.data('kanbanBoard', () => ({
    tasks: [],
    columns: ['todo', 'progress', 'review', 'done'],
    loading: false,

    init() {
        this.fetchTasks();
        this.setupSortable();
    },

    async fetchTasks() {
        this.loading = true;
        try {
            const response = await fetch('/api/tasks');
            this.tasks = await response.json();
        } catch (error) {
            Alpine.store('notification').error('Erro ao carregar tarefas');
        } finally {
            this.loading = false;
        }
    },

    get tasksByStatus() {
        return this.columns.map(status => ({
            status,
            tasks: this.tasks.filter(t => t.status === status)
        }));
    },

    get columnLabel() {
        return {
            todo: 'A Fazer',
            progress: 'Em Progresso',
            review: 'Em Revisão',
            done: 'Concluídas'
        };
    },

    setupSortable() {
        // Inicializa após o DOM ser renderizado
        setTimeout(() => {
            this.columns.forEach(status => {
                const el = document.getElementById(`kanban-column-${status}`);
                if (el && typeof Sortable !== 'undefined') {
                    Sortable.create(el, {
                        group: 'kanban',
                        animation: 150,
                        ghostClass: 'sortable-ghost',
                        onEnd: (evt) => this.onDrop(evt)
                    });
                }
            });
        }, 100);
    },

    async onDrop(evt) {
        const taskId = evt.item.dataset.taskId;
        const newStatus = evt.to.id.replace('kanban-column-', '');

        if (taskId && newStatus) {
            await this.updateStatus(taskId, newStatus);
        }
    },

    async updateStatus(taskId, newStatus) {
        try {
            const response = await fetch(`/api/tasks/${taskId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                // Atualiza localmente
                const task = this.tasks.find(t => t.id == taskId);
                if (task) {
                    task.status = newStatus;
                }
                Alpine.store('notification').success('Status atualizado');
            }
        } catch (error) {
            Alpine.store('notification').error('Erro ao atualizar status');
        }
    },

    openCreateModal() {
        Alpine.store('modal').open({
            title: 'Nova Tarefa',
            content: 'task-form'
        });
    }
}));

// Componente: Task Form
Alpine.data('taskForm', () => ({
    form: {
        title: '',
        description: '',
        assigned_to: '',
        deadline: '',
        priority: 'normal',
        status: 'todo',
        related_contact_id: ''
    },
    errors: {},
    submitting: false,

    reset() {
        this.form = {
            title: '',
            description: '',
            assigned_to: '',
            deadline: '',
            priority: 'normal',
            status: 'todo',
            related_contact_id: ''
        };
        this.errors = {};
    },

    async submit() {
        this.submitting = true;
        this.errors = {};

        try {
            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.form)
            });

            const data = await response.json();

            if (response.status === 422) {
                this.errors = data.errors;
            } else if (response.ok) {
                Alpine.store('notification').success('Tarefa criada com sucesso');
                Alpine.store('modal').close();
                window.dispatchEvent(new CustomEvent('task-created', { detail: data }));
            }
        } catch (error) {
            Alpine.store('notification').error('Erro ao criar tarefa');
        } finally {
            this.submitting = false;
        }
    },

    get hasErrors() {
        return Object.keys(this.errors).length > 0;
    }
}));

// Componente: Sidebar Toggle
Alpine.data('sidebarToggle', () => ({
    isOpen: false,

    toggle() {
        this.isOpen = !this.isOpen;
        const sidebar = document.querySelector('.layout-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('show', this.isOpen);
        }
    },

    close() {
        this.isOpen = false;
        const sidebar = document.querySelector('.layout-sidebar');
        if (sidebar) {
            sidebar.classList.remove('show');
        }
    }
}));

// Componente: Dropdown genérico
Alpine.data('dropdown', () => ({
    open: false,

    toggle() {
        this.open = !this.open;
    },

    close() {
        this.open = false;
    }
}));

// Componente: Confirm Dialog
Alpine.data('confirmDialog', (options = {}) => ({
    isOpen: false,
    title: options.title || 'Confirmação',
    message: options.message || 'Tem certeza?',
    confirmText: options.confirmText || 'Confirmar',
    cancelText: options.cancelText || 'Cancelar',
    onConfirm: options.onConfirm || (() => {}),
    onCancel: options.onCancel || (() => {}),

    open(optionsOverride = {}) {
        if (optionsOverride.title) this.title = optionsOverride.title;
        if (optionsOverride.message) this.message = optionsOverride.message;
        if (optionsOverride.confirmText) this.confirmText = optionsOverride.confirmText;
        if (optionsOverride.cancelText) this.cancelText = optionsOverride.cancelText;
        if (optionsOverride.onConfirm) this.onConfirm = optionsOverride.onConfirm;
        if (optionsOverride.onCancel) this.onCancel = optionsOverride.onCancel;
        this.isOpen = true;
    },

    confirm() {
        this.onConfirm();
        this.isOpen = false;
    },

    cancel() {
        this.onCancel();
        this.isOpen = false;
    }
}));

// Inicializa o Alpine
window.Alpine = Alpine;
Alpine.start();

// Exporta para uso em módulos
export default Alpine;
