@extends('layouts.app')

@section('title', 'Nova Tarefa - Intranet ASOF')

@section('breadcrumb')
    <li class="breadcrumb-item">
        <a href="{{ route('tasks.index') }}" class="text-decoration-none">Tarefas</a>
    </li>
    <li class="breadcrumb-item active" aria-current="page">Nova</li>
@endsection

@section('content')
<div x-data="taskForm()">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <div>
            <h4 class="mb-1">Nova Tarefa</h4>
            <p class="text-muted mb-0">Preencha os dados para criar uma nova tarefa</p>
        </div>
    </div>

    <div class="card">
        <div class="card-body">
            <form @submit.prevent="submit()">
                <div class="row g-3">
                    <!-- Título -->
                    <div class="col-md-12">
                        <label class="form-label">Título <span class="text-danger">*</span></label>
                        <input type="text"
                               x-model="form.title"
                               class="form-control"
                               :class="{'is-invalid': errors.title}"
                               placeholder="Digite o título da tarefa">
                        <div class="invalid-feedback" x-show="errors.title" x-text="errors.title?.[0]"></div>
                    </div>

                    <!-- Descrição -->
                    <div class="col-md-12">
                        <label class="form-label">Descrição</label>
                        <textarea x-model="form.description"
                                  class="form-control"
                                  rows="3"
                                  placeholder="Descreva os detalhes da tarefa"></textarea>
                    </div>

                    <!-- Responsável -->
                    <div class="col-md-6">
                        <label class="form-label">Responsável</label>
                        <select x-model="form.assigned_to" class="form-select">
                            <option value="">Selecione um responsável</option>
                            <option value="1">Usuário 1</option>
                            <option value="2">Usuário 2</option>
                        </select>
                    </div>

                    <!-- Prazo -->
                    <div class="col-md-6">
                        <label class="form-label">Prazo <span class="text-danger">*</span></label>
                        <input type="datetime-local"
                               x-model="form.deadline"
                               class="form-control"
                               :class="{'is-invalid': errors.deadline}">
                        <div class="invalid-feedback" x-text="errors.deadline?.[0]"></div>
                    </div>

                    <!-- Prioridade -->
                    <div class="col-md-4">
                        <label class="form-label">Prioridade</label>
                        <select x-model="form.priority" class="form-select">
                            <option value="low">Baixa</option>
                            <option value="normal">Normal</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                        </select>
                    </div>

                    <!-- Status -->
                    <div class="col-md-4">
                        <label class="form-label">Status Inicial</label>
                        <select x-model="form.status" class="form-select">
                            <option value="todo">A Fazer</option>
                            <option value="progress">Em Progresso</option>
                            <option value="review">Em Revisão</option>
                        </select>
                    </div>

                    <!-- Contato Relacionado -->
                    <div class="col-md-4">
                        <label class="form-label">Contato Relacionado</label>
                        <select x-model="form.related_contact_id" class="form-select">
                            <option value="">Nenhum</option>
                            <option value="1">Contato 1</option>
                            <option value="2">Contato 2</option>
                        </select>
                    </div>

                    <!-- Actions -->
                    <div class="col-12 pt-3">
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-primary" :disabled="submitting">
                                <span x-show="submitting">
                                    <span class="spinner-border spinner-border-sm me-1"></span>
                                    Salvando...
                                </span>
                                <span x-show="!submitting">
                                    <svg class="me-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                                        <polyline points="17 21 17 13 7 13 7 21"/>
                                        <polyline points="7 3 7 8 15 8"/>
                                    </svg>
                                    Salvar Tarefa
                                </span>
                            </button>
                            <a href="{{ route('tasks.index') }}" class="btn btn-outline-secondary">
                                Cancelar
                            </a>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    </div>
</div>
@endsection
