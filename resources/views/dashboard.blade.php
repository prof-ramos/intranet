@extends('layouts.app')

@section('title', 'Dashboard - Intranet ASOF')

@section('breadcrumb')
    <li class="breadcrumb-item active" aria-current="page">Dashboard</li>
@endsection

@section('content')
<!-- Page Header -->
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h4 class="mb-1">Dashboard</h4>
        <p class="text-muted mb-0">Bem-vindo, {{ Auth::user()->name }}!</p>
    </div>
    <button type="button" class="btn btn-primary" @click="Alpine.store('notification').success('Teste de notificação!')">
        <svg class="me-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        Nova Tarefa
    </button>
</div>

<!-- KPIs -->
<div class="row g-4 mb-4">
    <div class="col-xl-3 col-md-6">
        <div class="card">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <div class="bg-primary bg-opacity-10 p-3 rounded me-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                            <path d="M9 11l3 3L22 4"/>
                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                    </div>
                    <div>
                        <h6 class="text-muted mb-1">Tarefas Abertas</h6>
                        <h3 class="mb-0">12</h3>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-xl-3 col-md-6">
        <div class="card">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <div class="bg-danger bg-opacity-10 p-3 rounded me-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-danger">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div>
                        <h6 class="text-muted mb-1">Tarefas Atrasadas</h6>
                        <h3 class="mb-0">3</h3>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-xl-3 col-md-6">
        <div class="card">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <div class="bg-success bg-opacity-10 p-3 rounded me-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-success">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                    </div>
                    <div>
                        <h6 class="text-muted mb-1">Concluídas (Mês)</h6>
                        <h3 class="mb-0">28</h3>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-xl-3 col-md-6">
        <div class="card">
            <div class="card-body">
                <div class="d-flex align-items-center">
                    <div class="bg-info bg-opacity-10 p-3 rounded me-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-info">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                        </svg>
                    </div>
                    <div>
                        <h6 class="text-muted mb-1">Cumprimento Prazo</h6>
                        <h3 class="mb-0">85%</h3>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Content Grid -->
<div class="row g-4">
    <!-- Tarefas Recentes -->
    <div class="col-lg-8">
        <div class="card h-100">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Tarefas Recentes</h5>
                <a href="{{ route('tasks.index') }}" class="btn btn-sm btn-outline-primary">
                    Ver Todas
                </a>
            </div>
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover mb-0">
                        <thead class="bg-light">
                            <tr>
                                <th class="ps-4">Tarefa</th>
                                <th>Status</th>
                                <th>Prioridade</th>
                                <th>Prazo</th>
                                <th class="pe-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td class="ps-4">
                                    <div class="fw-semibold">Preparar relatório mensal</div>
                                    <small class="text-muted">Diretoria</small>
                                </td>
                                <td>
                                    <span class="status-badge status-progress">Em Progresso</span>
                                </td>
                                <td>
                                    <span class="badge bg-warning text-dark">Alta</span>
                                </td>
                                <td>
                                    <small class="text-muted">Hoje, 18:00</small>
                                </td>
                                <td class="pe-4">
                                    <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="1"/>
                                            <circle cx="12" cy="5" r="1"/>
                                            <circle cx="12" cy="19" r="1"/>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td class="ps-4">
                                    <div class="fw-semibold">Revisar contratos</div>
                                    <small class="text-muted">Jurídico</small>
                                </td>
                                <td>
                                    <span class="status-badge status-review">Em Revisão</span>
                                </td>
                                <td>
                                    <span class="badge bg-info">Normal</span>
                                </td>
                                <td>
                                    <small class="text-muted">Amanhã</small>
                                </td>
                                <td class="pe-4">
                                    <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="1"/>
                                            <circle cx="12" cy="5" r="1"/>
                                            <circle cx="12" cy="19" r="1"/>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                            <tr>
                                <td class="ps-4">
                                    <div class="fw-semibold">Atualizar agenda do diretor</div>
                                    <small class="text-muted">Secretaria</small>
                                </td>
                                <td>
                                    <span class="status-badge status-todo">A Fazer</span>
                                </td>
                                <td>
                                    <span class="badge bg-secondary">Baixa</span>
                                </td>
                                <td>
                                    <small class="text-muted">25/03</small>
                                </td>
                                <td class="pe-4">
                                    <button type="button" class="btn btn-sm btn-link p-0 text-decoration-none">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="1"/>
                                            <circle cx="12" cy="5" r="1"/>
                                            <circle cx="12" cy="19" r="1"/>
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Avisos e Links -->
    <div class="col-lg-4">
        <!-- Avisos Recentes -->
        <div class="card mb-4">
            <div class="card-header">
                <h5 class="mb-0">Avisos Recentes</h5>
            </div>
            <div class="card-body">
                <div class="d-flex mb-3">
                    <div class="bg-warning bg-opacity-10 p-2 rounded me-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-warning">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                            <line x1="12" y1="9" x2="12" y2="13"/>
                            <line x1="12" y1="17" x2="12.01" y2="17"/>
                        </svg>
                    </div>
                    <div>
                        <div class="fw-semibold">Revisão do PDI</div>
                        <small class="text-muted">Agendado para próxima semana</small>
                    </div>
                </div>
                <div class="d-flex mb-3">
                    <div class="bg-info bg-opacity-10 p-2 rounded me-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-info">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                    </div>
                    <div>
                        <div class="fw-semibold">Novos documentos</div>
                        <small class="text-muted">Adicionados no Google Drive</small>
                    </div>
                </div>
                <div class="d-flex">
                    <div class="bg-primary bg-opacity-10 p-2 rounded me-3">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                        </svg>
                    </div>
                    <div>
                        <div class="fw-semibold">Reunião de diretoria</div>
                        <small class="text-muted">Quinta-feira, 14h</small>
                    </div>
                </div>
            </div>
        </div>

        <!-- Links Rápidos -->
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">Links Rápidos</h5>
            </div>
            <div class="card-body">
                <div class="row g-2">
                    <div class="col-6">
                        <a href="#" class="btn btn-outline-primary w-100">
                            <svg class="me-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            Google Docs
                        </a>
                    </div>
                    <div class="col-6">
                        <a href="#" class="btn btn-outline-success w-100">
                            <svg class="me-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            Google Sheets
                        </a>
                    </div>
                    <div class="col-6">
                        <a href="#" class="btn btn-outline-danger w-100">
                            <svg class="me-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M23 7l-7 5 7 5V7z"/>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                            </svg>
                            Meet
                        </a>
                    </div>
                    <div class="col-6">
                        <a href="#" class="btn btn-outline-warning w-100">
                            <svg class="me-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                <polyline points="22,6 12,13 2,6"/>
                            </svg>
                            Email
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
