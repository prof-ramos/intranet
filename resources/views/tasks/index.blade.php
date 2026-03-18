@extends('layouts.app')

@section('title', 'Tarefas - Intranet ASOF')

@section('breadcrumb')
    <li class="breadcrumb-item active" aria-current="page">Tarefas</li>
@endsection

@section('content')
<div x-data="taskList()">
    <!-- Header -->
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="mb-1">Tarefas</h4>
            <p class="text-muted mb-0">Gerencie todas as tarefas da organização</p>
        </div>
        <a href="{{ route('tasks.create') }}" class="btn btn-primary">
            <svg class="me-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova Tarefa
        </a>
    </div>

    <!-- Filters -->
    <div class="card mb-4">
        <div class="card-body">
            <div class="row g-3">
                <div class="col-md-3">
                    <label class="form-label small">Status</label>
                    <select x-model="filters.status" @change="applyFilters()" class="form-select">
                        <option value="">Todos os status</option>
                        <option value="todo">A Fazer</option>
                        <option value="progress">Em Progresso</option>
                        <option value="review">Em Revisão</option>
                        <option value="done">Concluídas</option>
                        <option value="blocked">Bloqueadas</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small">Prioridade</label>
                    <select x-model="filters.priority" @change="applyFilters()" class="form-select">
                        <option value="">Todas as prioridades</option>
                        <option value="low">Baixa</option>
                        <option value="normal">Normal</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small">Responsável</label>
                    <select x-model="filters.assignedTo" @change="applyFilters()" class="form-select">
                        <option value="">Todos os responsáveis</option>
                        <option value="1">Usuário 1</option>
                        <option value="2">Usuário 2</option>
                    </select>
                </div>
                <div class="col-md-3 d-flex align-items-end">
                    <button type="button" @click="filters = {status: '', priority: '', assignedTo: ''}" class="btn btn-outline-secondary w-100">
                        Limpar Filtros
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Tasks List -->
    <div class="card">
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-hover mb-0">
                    <thead class="bg-light">
                        <tr>
                            <th class="ps-4">Tarefa</th>
                            <th>Status</th>
                            <th>Prioridade</th>
                            <th>Responsável</th>
                            <th>Prazo</th>
                            <th class="pe-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr x-show="filteredTasks.length === 0">
                            <td colspan="6" class="text-center py-5 text-muted">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mb-2">
                                    <path d="M9 11l3 3L22 4"/>
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                                </svg>
                                <p class="mb-0">Nenhuma tarefa encontrada</p>
                            </td>
                        </tr>
                        <template x-for="task in filteredTasks" :key="task.id">
                            <tr>
                                <td class="ps-4">
                                    <div class="fw-semibold" x-text="task.title"></div>
                                    <small class="text-muted" x-show="task.description" x-text="task.description?.substring(0, 60) + '...'"></small>
                                </td>
                                <td>
                                    <span class="status-badge"
                                          :class="'status-' + task.status"
                                          x-text="task.status_label"></span>
                                </td>
                                <td>
                                    <span class="badge"
                                          :class="{
                                              'bg-success': task.priority === 'low',
                                              'bg-info': task.priority === 'normal',
                                              'bg-warning text-dark': task.priority === 'high',
                                              'bg-danger': task.priority === 'urgent'
                                          }"
                                          x-text="task.priority_label"></span>
                                </td>
                                <td>
                                    <div class="d-flex align-items-center gap-2" x-show="task.assigned_to">
                                        <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold"
                                             style="width: 28px; height: 28px; font-size: 0.75rem;"
                                             x-text="task.assigned_to?.name?.charAt(0) || '?'"></div>
                                        <small x-text="task.assigned_to?.name"></small>
                                    </div>
                                    <span x-show="!task.assigned_to" class="text-muted small">Não atribuído</span>
                                </td>
                                <td>
                                    <small :class="task.is_overdue ? 'text-danger' : 'text-muted'" x-text="task.deadline"></small>
                                </td>
                                <td class="pe-4">
                                    <div class="btn-group">
                                        <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                                <circle cx="12" cy="12" r="3"/>
                                            </svg>
                                        </button>
                                        <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </svg>
                                        </button>
                                        <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none text-danger">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="3 6 5 6 21 6"/>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
@endsection
