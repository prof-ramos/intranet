@extends('layouts.app')

@section('title', 'Kanban - Intranet ASOF')

@section('breadcrumb')
    <li class="breadcrumb-item active" aria-current="page">Kanban</li>
@endsection

@section('content')
<div x-data="kanbanBoard()">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="mb-1">Kanban de Tarefas</h4>
            <p class="text-muted mb-0">Arraste os cards entre as colunas para alterar o status</p>
        </div>
        <button type="button" class="btn btn-primary" @click="openCreateModal()">
            <svg class="me-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova Tarefa
        </button>
    </div>

    <!-- Loading state -->
    <div x-show="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Carregando...</span>
        </div>
    </div>

    <!-- Kanban Board -->
    <div x-show="!loading" class="kanban-board custom-scrollbar">
        <template x-for="column in tasksByStatus" :key="column.status">
            <div class="kanban-column">
                <!-- Column Header -->
                <div class="kanban-column-header">
                    <h5 class="kanban-column-title" x-text="columnLabel[column.status]"></h5>
                    <span class="kanban-column-count" x-text="column.tasks.length"></span>
                </div>

                <!-- Column Body -->
                <div :id="'kanban-column-' + column.status" class="kanban-tasks">
                    <template x-for="task in column.tasks" :key="task.id">
                        <div class="kanban-card position-relative"
                             :data-task-id="task.id"
                             :class="priorityClass(task.priority)">
                            <!-- Priority Indicator -->
                            <div class="priority-indicator"
                                 :class="'priority-' + task.priority"></div>

                            <!-- Card Content -->
                            <div class="ps-2">
                                <h6 class="mb-1 fw-semibold text-truncate" x-text="task.title"></h6>

                                <p class="small text-muted mb-2 text-truncate-2" x-show="task.description"
                                   x-text="task.description"></p>

                                <!-- Meta info -->
                                <div class="d-flex justify-content-between align-items-center">
                                    <div class="d-flex align-items-center gap-2">
                                        <!-- Assignee avatar -->
                                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold"
                                             style="width: 28px; height: 28px; font-size: 0.75rem;"
                                             x-show="task.assigned_to"
                                             x-text="task.assigned_to?.name?.charAt(0) || '?'"></div>

                                        <!-- Deadline -->
                                        <small class="text-muted" x-show="task.deadline">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="me-1">
                                                <circle cx="12" cy="12" r="10"/>
                                                <polyline points="12 6 12 12 16 14"/>
                                            </svg>
                                            <span x-text="task.deadline"></span>
                                        </small>
                                    </div>

                                    <!-- Priority badge -->
                                    <span class="badge"
                                          :class="{
                                              'bg-success': task.priority === 'low',
                                              'bg-info': task.priority === 'normal',
                                              'bg-warning text-dark': task.priority === 'high',
                                              'bg-danger': task.priority === 'urgent'
                                          }"
                                          x-text="task.priority"></span>
                                </div>
                            </div>
                        </div>
                    </template>

                    <!-- Empty state -->
                    <div x-show="column.tasks.length === 0"
                         class="text-center py-4 text-muted">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-2">
                            <path d="M9 11l3 3L22 4"/>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                        <p class="small mb-0">Nenhuma tarefa</p>
                    </div>
                </div>
            </div>
        </template>
    </div>
</div>

<!-- Helper method for priority class (inline) -->
<script>
function priorityClass(priority) {
    const classes = {
        'low': 'border-start border-4 border-success',
        'normal': 'border-start border-4 border-info',
        'high': 'border-start border-4 border-warning',
        'urgent': 'border-start border-4 border-danger',
    };
    return classes[priority] || '';
}
</script>
@endsection
