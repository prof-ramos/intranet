<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>@yield('title', config('app.name', 'Intranet ASOF'))</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">

    <!-- Vite -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])

    @stack('styles')
</head>

<body>
    <div class="layout-wrapper" x-data="sidebarToggle()">
        <!-- Sidebar -->
        <aside class="layout-sidebar">
            <!-- Logo -->
            <div class="d-flex align-items-center justify-content-between px-3 py-2 border-bottom border-secondary border-opacity-25">
                <a href="{{ route('dashboard') }}" class="d-flex align-items-center gap-2 text-white text-decoration-none">
                    <span class="fw-bold fs-5">ASOF</span>
                    <span class="small text-muted">Intranet</span>
                </a>

                <!-- Mobile close button -->
                <button type="button" class="btn btn-link text-white d-lg-none p-0" @click="close()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>

            <!-- Menu -->
            <ul class="layout-menu">
                <!-- Dashboard -->
                <li class="layout-menu-item">
                    <a href="{{ route('dashboard') }}"
                       class="layout-menu-link {{ request()->routeIs('dashboard') ? 'active' : '' }}">
                        <span class="layout-menu-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="7" height="7"/>
                                <rect x="14" y="3" width="7" height="7"/>
                                <rect x="14" y="14" width="7" height="7"/>
                                <rect x="3" y="14" width="7" height="7"/>
                            </svg>
                        </span>
                        <span>Dashboard</span>
                    </a>
                </li>

                <!-- Tarefas -->
                <li class="layout-menu-item">
                    <a href="{{ route('tasks.index') }}"
                       class="layout-menu-link {{ request()->routeIs('tasks.*') ? 'active' : '' }}">
                        <span class="layout-menu-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 11l3 3L22 4"/>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                        </span>
                        <span>Tarefas</span>
                    </a>
                </li>

                <!-- Kanban -->
                <li class="layout-menu-item">
                    <a href="{{ route('kanban') }}"
                       class="layout-menu-link {{ request()->routeIs('kanban') ? 'active' : '' }}">
                        <span class="layout-menu-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <path d="M9 3v18"/>
                                <path d="M15 3v18"/>
                            </svg>
                        </span>
                        <span>Kanban</span>
                    </a>
                </li>

                <!-- Calendário -->
                <li class="layout-menu-item">
                    <a href="{{ route('calendar') }}"
                       class="layout-menu-link {{ request()->routeIs('calendar') ? 'active' : '' }}">
                        <span class="layout-menu-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                        </span>
                        <span>Calendário</span>
                    </a>
                </li>

                <!-- Contatos -->
                <li class="layout-menu-item">
                    <a href="{{ route('contacts.index') }}"
                       class="layout-menu-link {{ request()->routeIs('contacts.*') ? 'active' : '' }}">
                        <span class="layout-menu-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </span>
                        <span>Contatos</span>
                    </a>
                </li>

                <!-- Reuniões -->
                <li class="layout-menu-item">
                    <a href="#"
                       class="layout-menu-link {{ request()->routeIs('meetings.*') ? 'active' : '' }}">
                        <span class="layout-menu-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                <circle cx="9" cy="7" r="4"/>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                        </span>
                        <span>Reuniões</span>
                    </a>
                </li>

                <!-- Comunicados -->
                <li class="layout-menu-item">
                    <a href="#"
                       class="layout-menu-link {{ request()->routeIs('notices.*') ? 'active' : '' }}">
                        <span class="layout-menu-icon">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                        </span>
                        <span>Comunicados</span>
                    </a>
                </li>
            </ul>

            <!-- User info (bottom sidebar) -->
            <div class="mt-auto px-3 py-2 border-top border-secondary border-opacity-25">
                <div class="d-flex align-items-center gap-2">
                    <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                         style="width: 38px; height: 38px;">
                        {{ substr(Auth::user()->name, 0, 1) }}
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="text-white text-truncate small fw-semibold">{{ Auth::user()->name }}</div>
                        <div class="text-muted small text-truncate">{{ Auth::user()->email }}</div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <div class="layout-content w-100">
            <!-- Navbar -->
            <nav class="layout-navbar d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-3">
                    <!-- Sidebar toggle (mobile) -->
                    <button type="button" class="btn btn-link text-decoration-none p-0 d-lg-none"
                            @click="toggle()">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="3" y1="12" x2="21" y2="12"/>
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                    </button>

                    <!-- Breadcrumb -->
                    <nav class="breadcrumb" aria-label="breadcrumb">
                        <ol class="breadcrumb mb-0">
                            <li class="breadcrumb-item">
                                <a href="{{ route('dashboard') }}" class="text-decoration-none">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                    </svg>
                                </a>
                            </li>
                            @yield('breadcrumb')
                        </ol>
                    </nav>
                </div>

                <!-- Right side -->
                <div class="d-flex align-items-center gap-3">
                    <!-- Notifications -->
                    <div class="dropdown" x-data="dropdown">
                        <button type="button" class="btn btn-link text-decoration-none p-0 position-relative"
                                data-bs-toggle="dropdown" @click="toggle()">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                            <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light"
                                  style="transform: translate(-25%, -25%) !important;">
                                3
                            </span>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow">
                            <li><h6 class="dropdown-header">Notificações</h6></li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item d-flex align-items-start gap-2" href="#">
                                    <div class="bg-primary bg-opacity-10 text-primary rounded-circle p-1">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                            <circle cx="9" cy="7" r="4"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <div class="fw-semibold small">Nova tarefa atribuída</div>
                                        <div class="text-muted small">Há 5 minutos</div>
                                    </div>
                                </a>
                            </li>
                        </ul>
                    </div>

                    <!-- User dropdown -->
                    <div class="dropdown">
                        <button type="button" class="btn btn-link text-decoration-none d-flex align-items-center gap-2 p-0"
                                data-bs-toggle="dropdown">
                            <div class="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                                 style="width: 38px; height: 38px;">
                                {{ substr(Auth::user()->name, 0, 1) }}
                            </div>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow">
                            <li>
                                <div class="dropdown-item-text">
                                    <div class="fw-semibold">{{ Auth::user()->name }}</div>
                                    <div class="text-muted small">{{ Auth::user()->email }}</div>
                                </div>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item" href="{{ route('profile.edit') }}">
                                    <svg class="me-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                        <circle cx="12" cy="7" r="4"/>
                                    </svg>
                                    Perfil
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="#">
                                    <svg class="me-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="3"/>
                                        <path d="M12 1v6m0 6v6"/>
                                        <path d="M1 12h6m6 0h6"/>
                                    </svg>
                                    Configurações
                                </a>
                            </li>
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <form method="POST" action="{{ route('logout') }}">
                                    @csrf
                                    <button type="submit" class="dropdown-item text-danger d-flex align-items-center">
                                        <svg class="me-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                            <polyline points="16 17 21 12 16 7"/>
                                            <line x1="21" y1="12" x2="9" y2="12"/>
                                        </svg>
                                        Sair
                                    </button>
                                </form>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <!-- Page Content -->
            <main>
                @yield('content')
            </main>
        </div>
    </div>

    <!-- Notification Toast Container -->
    <div x-data="notificationStore"
         class="position-fixed top-0 end-0 p-3"
         style="z-index: 1100">
        <template x-for="notif in notifications" :key="notif.id">
            <div class="toast show align-items-center text-white bg-{{ notif.type }} border-0 mb-2"
                 :class="'bg-' + notif.type"
                 role="alert">
                <div class="d-flex">
                    <div class="toast-body" x-text="notif.message"></div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" @click="remove(notif.id)"></button>
                </div>
            </div>
        </template>
    </div>

    @stack('scripts')
</body>
</html>
