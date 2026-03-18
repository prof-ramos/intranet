@extends('layouts.app')

@section('title', 'Contatos - Intranet ASOF')

@section('breadcrumb')
    <li class="breadcrumb-item active" aria-current="page">Contatos</li>
@endsection

@section('content')
<!-- Header -->
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h4 class="mb-1">Contatos</h4>
        <p class="text-muted mb-0">Gerencie contatos institucionais e externos</p>
    </div>
    <a href="{{ route('contacts.create') }}" class="btn btn-primary">
        <svg class="me-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Novo Contato
    </a>
</div>

<!-- Search & Filters -->
<div class="card mb-4">
    <div class="card-body">
        <div class="row g-3">
            <div class="col-md-6">
                <input type="text" class="form-control" placeholder="Buscar por nome, email ou instituição...">
            </div>
            <div class="col-md-3">
                <select class="form-select">
                    <option value="">Todas as categorias</option>
                    <option value="institutional">Institucional</option>
                    <option value="internal">Interno</option>
                    <option value="external">Externo</option>
                </select>
            </div>
            <div class="col-md-3">
                <select class="form-select">
                    <option value="">Todos os status</option>
                    <option value="1">Ativos</option>
                    <option value="0">Inativos</option>
                </select>
            </div>
        </div>
    </div>
</div>

<!-- Contacts Grid -->
<div class="card">
    <div class="card-body p-0">
        <div class="table-responsive">
            <table class="table table-hover mb-0">
                <thead class="bg-light">
                    <tr>
                        <th class="ps-4">Nome</th>
                        <th>Categoria</th>
                        <th>Instituição</th>
                        <th>Contato</th>
                        <th>Status</th>
                        <th class="pe-4">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Exemplo de contato -->
                    <tr>
                        <td class="ps-4">
                            <div class="d-flex align-items-center gap-3">
                                <div class="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold"
                                     style="width: 40px; height: 40px;">J</div>
                                <div>
                                    <div class="fw-semibold">João Silva</div>
                                    <small class="text-muted">Desde 15/01/2024</small>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="badge bg-info">Institucional</span>
                        </td>
                        <td>ASOF</td>
                        <td>
                            <div class="small">
                                <div>joao@asof.org.br</div>
                                <small class="text-muted">(11) 99999-9999</small>
                            </div>
                        </td>
                        <td>
                            <span class="badge bg-success">Ativo</span>
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
                            </div>
                        </td>
                    </tr>
                    <!-- Placeholder para mais contatos -->
                    <tr>
                        <td colspan="6" class="text-center py-4 text-muted">
                            <p class="mb-0">Nenhum contato cadastrado</p>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
