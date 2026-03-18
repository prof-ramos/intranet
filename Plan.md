# Planejamento Intranet ASOF — Versão 2.2

> **Atualização**: Versão alinhada com Laravel 11, PHP 8.1+ e documentação oficial das bibliotecas.

---

## Decisão de Arquitetura

- **AdminKitPro** (ou template equivalente) como camada visual
- **Laravel 11** como backend enxuto
- **Google Workspace** como repositório documental e operacional
- **Login por último**, restringindo primeiro apenas a área administrativa

---

## 1. Escopo Consolidado da Versão 1

A Versão 1 é um **painel operacional administrativo** com:

- Dashboard inicial
- Kanban de tarefas
- Calendário de prazos
- CRM de contatos internos e institucionais
- Avisos
- Links rápidos
- Biblioteca de documentos
- Registros de reunião
- Métricas operacionais básicas

---

## 2. Dashboard Inicial

### Blocos Principais

| Componente | Descrição |
|------------|-----------|
| **Kanban administrativo** | Colunas por status com drag-and-drop |
| **Calendário de prazos** | Visão semanal e mensal |
| **KPIs de tarefas** | Indicadores em tempo real |
| **Avisos recentes** | Últimos 5 avisos ativos |
| **Links rápidos** | Atalhos para Drive/Docs/Sheets |
| **Pendências prioritárias** | Tarefas urgentes e atrasadas |
| **Últimos registros de reunião** | Últimas 3 reuniões |

### KPIs Mínimos

```
- Total de tarefas abertas
- Total de tarefas concluídas na semana
- Total de tarefas atrasadas
- Taxa de cumprimento de prazo (%)
- Tempo médio de conclusão (dias)
- Ranking por responsável
- Tarefas vencendo nos próximos 7 dias
```

---

## 3. Modelagem de Dados

### Separação de Responsabilidades

```
users       → Pessoas com acesso operacional (sistema)
contacts    → Base relacional/institucional (CRM)
tasks       → Tarefas operacionais
```

### Tabela: `users`

```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password');
    $table->string('role')->default('user'); // admin, user
    $table->boolean('active')->default(true);
    $table->rememberToken();
    $table->timestamps();
    $table->softDeletes();
});
```

### Tabela: `tasks`

```php
Schema::create('tasks', function (Blueprint $table) {
    $table->id();
    $table->string('title');
    $table->text('description')->nullable();

    // Foreign keys com constraints explícitas
    $table->foreignId('assigned_to')
        ->nullable()
        ->constrained('users')
        ->nullOnDelete();

    $table->foreignId('created_by')
        ->constrained('users')
        ->cascadeOnDelete();

    $table->foreignId('related_contact_id')
        ->nullable()
        ->constrained('contacts')
        ->nullOnDelete();

    $table->dateTime('deadline');
    $table->dateTime('completed_at')->nullable();

    // Usar string para compatibilidade; cast para Enum no model
    $table->string('status')->default('todo');
    $table->string('priority')->default('normal');

    $table->timestamps();
    $table->softDeletes();

    // Índices para performance
    $table->index(['status', 'deadline']);
    $table->index('assigned_to');
});
```

### PHP Backed Enums (Laravel 11 + PHP 8.1+)

```php
// app/Enums/TaskStatus.php
namespace App\Enums;

enum TaskStatus: string
{
    case Todo = 'todo';
    case InProgress = 'progress';
    case Review = 'review';
    case Done = 'done';
    case Blocked = 'blocked';
}

// app/Enums/TaskPriority.php
namespace App\Enums;

enum TaskPriority: string
{
    case Low = 'low';
    case Normal = 'normal';
    case High = 'high';
    case Urgent = 'urgent';
}
```

### Model Task com Enum Casting

```php
// app/Models/Task.php
namespace App\Models;

use App\Enums\TaskStatus;
use App\Enums\TaskPriority;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'assigned_to',
        'created_by',
        'related_contact_id',
        'deadline',
        'completed_at',
        'status',
        'priority',
    ];

    protected $casts = [
        'deadline' => 'datetime',
        'completed_at' => 'datetime',
        'status' => TaskStatus::class,  // Enum casting automático
        'priority' => TaskPriority::class,
    ];

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function relatedContact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    // Scopes úteis
    public function scopeOverdue($query)
    {
        return $query->where('deadline', '<', now())
            ->where('status', '!=', TaskStatus::Done);
    }

    public function scopeDueThisWeek($query)
    {
        return $query->whereBetween('deadline', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }
}
```

### Model User

```php
// app/Models/User.php
namespace App\Models;

use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'password', 'role', 'active'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'active' => 'boolean',
    ];

    public function assignedTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'assigned_to');
    }

    public function createdTasks(): HasMany
    {
        return $this->hasMany(Task::class, 'created_by');
    }
}
```

---

## 4. Histórico de Tarefas (task_history)

### Observer para Auditoria

```php
// database/migrations/xxxx_create_task_history_table.php
Schema::create('task_history', function (Blueprint $table) {
    $table->id();
    $table->foreignId('task_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->restrictOnDelete();
    $table->string('from_status')->nullable();
    $table->string('to_status');
    $table->text('note')->nullable();
    $table->timestamps();

    $table->index(['task_id', 'created_at']);
});
```

### Task Observer

```php
// app/Observers/TaskObserver.php
namespace App\Observers;

use App\Models\Task;
use App\Models\TaskHistory;
use Illuminate\Support\Facades\Auth;

class TaskObserver
{
    public function updated(Task $task): void
    {
        if ($task->isDirty('status') && Auth::check()) {
            TaskHistory::create([
                'task_id' => $task->id,
                'user_id' => Auth::id(),
                'from_status' => $task->getOriginal('status'),
                'to_status' => $task->status,
            ]);
        }
    }
}

// Registrar no model
// app/Models/Task.php
use Illuminate\Database\Eloquent\Attributes\ObservedBy;

#[ObservedBy([TaskObserver::class])]
class Task extends Model
{
    // ...
}
```

---

## 5. Kanban Administrativo

### Requisitos Mínimos

- Arrastar e soltar entre colunas (SortableJS / Alpine.js)
- Modal de detalhes da tarefa
- Indicadores visuais de prioridade
- Badge de responsável
- Data limite com destaque para vencidas
- Filtros por responsável, prioridade e status

### Campos Visíveis no Card

```
┌─────────────────────────────┐
│ [URGENTE] Título da tarefa  │
│ Responsável: João           │
│ Prazo: 15/03               │
│ [Reunião #123]              │
└─────────────────────────────┘
```

### Regras Visuais

| Prioridade | Visual |
|-----------|--------|
| Urgente | Vermelho / borda sólida |
| Alta | Laranja / borda tracejada |
| Normal | Padrão |
| Baixa | Cinza / opaco |
| Vencida | Ícone + badge vermelho |
| Concluída | Verde + opacidade reduzida |

### Stack Recomendada

- **Backend**: Laravel + Livewire 3 (opcional, para reatividade)
- **Frontend**: Alpine.js + SortableJS (drag-and-drop)
- **Atualização**: PATCH endpoint para mudança de status

### Endpoint de Atualização de Status

```php
// routes/api.php
Route::patch('/tasks/{task}/status', TaskStatusController::class);

// app/Http/Controllers/TaskStatusController.php
public function __invoke(Request $request, Task $task)
{
    $request->validate([
        'status' => ['required', Rule::enum(TaskStatus::class)],
    ]);

    $task->update(['status' => $request->status]);

    return response()->json($task->load('assignedTo', 'createdBy'));
}
```

---

## 6. Calendário de Prazos

### Biblioteca

**FullCalendar v6** — Plugin JavaScript para calendários interativos.

### Integração com Laravel

```javascript
// resources/js/calendar.js
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';

const calendar = new Calendar(calendarEl, {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    initialView: 'listWeek',
    locale: 'pt-BR',
    events: '/api/calendar-events', // Endpoint Laravel
    editable: false, // Edição via modal, não drag
    selectable: true,
    select: function(info) {
        // Abrir modal de nova tarefa
    },
    eventClick: function(info) {
        // Abrir modal de detalhes
    }
});

calendar.render();
```

### Endpoint de Eventos

```php
// app/Http/Controllers/CalendarController.php
public function index()
{
    $tasks = Task::query()
        ->whereNotNull('deadline')
        ->where('status', '!=', TaskStatus::Done)
        ->get()
        ->map(function ($task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'start' => $task->deadline->format('Y-m-d'),
                'backgroundColor' => $this->getColorByPriority($task->priority),
                'borderColor' => $this->getBorderByStatus($task->status),
                'url' => route('tasks.show', $task->id),
            ];
        });

    return response()->json($tasks);
}
```

---

## 7. Métricas e KPIs

### Abordagem: Query Builder (Portável)

**Prefira Query Builder em vez de Views SQL** para máxima portabilidade entre bancos (MySQL, PostgreSQL, SQLite).

### Repository de Métricas

```php
// app/Repositories/TaskMetricsRepository.php
class TaskMetricsRepository
{
    public function getOverview(): array
    {
        return [
            'total_open' => Task::where('status', '!=', TaskStatus::Done)->count(),
            'completed_week' => Task::where('status', TaskStatus::Done)
                ->where('completed_at', '>=', now()->subWeek())
                ->count(),
            'overdue_open' => Task::overdue()->count(),
            'due_this_week' => Task::dueThisWeek()->count(),
            'completion_rate' => $this->calculateCompletionRate(),
            'avg_completion_days' => $this->calculateAvgCompletionDays(),
            'by_assignee' => $this->getByAssignee(),
        ];
    }

    private function calculateCompletionRate(): float
    {
        $total = Task::whereNotNull('completed_at')->count();
        if ($total === 0) return 0;

        $onTime = Task::whereNotNull('completed_at')
            ->whereColumn('completed_at', '<=', 'deadline')
            ->count();

        return round(($onTime / $total) * 100, 1);
    }

    private function calculateAvgCompletionDays(): float
    {
        return Task::whereNotNull('completed_at')
            ->selectRaw('AVG(DATEDIFF(completed_at, created_at)) as avg_days')
            ->value('avg_days') ?? 0;
    }

    private function getByAssignee(): array
    {
        return User::has('assignedTasks')
            ->withCount(['assignedTasks as pending' => function ($q) {
                $q->where('status', '!=', TaskStatus::Done);
            }])
            ->withCount(['assignedTasks as completed' => function ($q) {
                $q->where('status', TaskStatus::Done)
                  ->where('completed_at', '>=', now()->subWeek());
            }])
            ->get()
            ->toArray();
    }
}
```

### API Endpoint

```php
// routes/api.php
Route::get('/metrics', [MetricsController::class, 'index']);

// app/Http/Controllers/MetricsController.php
public function __invoke(TaskMetricsRepository $repository)
{
    return response()->json($repository->getOverview());
}
```

---

## 8. Integração com Google Workspace

### Estratégia em Camadas

#### Camada 1 (V1) — Links Organizados
- Botões para abrir pastas/arquivos específicos
- Categorização manual de links
- Sem autenticação OAuth necessária

#### Camada 2 (V2) — Leitura de Metadados
- Listagem de arquivos de pastas específicas
- Leitura de planilhas via Sheets API
- OAuth 2.0 com service account

#### Camada 3 (V3) — Automação Pontual
- Criação de pastas/documentos
- Sincronização bidirecional
- Webhooks para mudanças

### Configuração Google API (Camada 2)

```bash
composer require google/apiclient:^2.15
```

```php
// config/google.php
return [
    'client_id' => env('GOOGLE_CLIENT_ID'),
    'client_secret' => env('GOOGLE_CLIENT_SECRET'),
    'redirect_uri' => env('GOOGLE_REDIRECT_URI'),
    'scopes' => [
        \Google\Service\Drive::DRIVE_METADATA_READONLY,
        \Google\Service\Drive::DRIVE_READONLY,
        \Google\Service\Sheets::SPREADSHEETS_READONLY,
    ],
];
```

### Exemplo: Listar Arquivos de uma Pasta

```php
// app/Services/GoogleDriveService.php
use Google\Client;
use Google\Service\Drive;

class GoogleDriveService
{
    protected Drive $service;

    public function __construct()
    {
        $client = new Client();
        $client->setAuthConfig([
            'client_id' => config('google.client_id'),
            'client_secret' => config('google.client_secret'),
        ]);
        $client->addScope(Drive::DRIVE_METADATA_READONLY);
        $client->setAccessToken(session('google_token'));

        $this->service = new Drive($client);
    }

    public function listFilesInFolder(string $folderId): array
    {
        $results = $this->service->files->listFiles([
            'q' => "'{$folderId}' in parents",
            'fields' => 'files(id,name,webViewLink,createdTime)',
        ]);

        return $results->getFiles() ?? [];
    }
}
```

---

## 9. Banco de Dados Consolidado

### Tabelas Principais (V1)

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários do sistema |
| `contacts` | CRM de contatos |
| `tasks` | Tarefas operacionais |
| `task_comments` | Comentários em tarefas |
| `task_history` | Histórico de mudanças |
| `meeting_records` | Registros de reunião |
| `notices` | Avisos e comunicados |
| `quick_links` | Links rápidos |
| `documents_index` | Índice de documentos |
| `categories` | Categorias genéricas |
| `settings` | Configurações do sistema |

### Tabelas Opcionais (Evolução)

| Tabela | Quando Implementar |
|--------|-------------------|
| `contact_interactions` | V2 — CRM avançado |
| `task_labels` | V2 — Organização por tags |
| `attachments` | V2 — Upload de arquivos |

---

## 10. CRUD de Tarefas

### Campos Obrigatórios

| Campo | Tipo | Observação |
|-------|------|------------|
| title | string | Obrigatório |
| description | text | Opcional |
| assigned_to | foreignId | Usuário responsável |
| deadline | dateTime | Data/hora limite |
| priority | string | Enum: low, normal, high, urgent |
| status | string | Enum: todo, progress, review, done, blocked |
| related_contact_id | foreignId | Opcional — vinculado ao CRM |
| notes | text | Observações internas |

### Ações Mínimas

- `store` — Criar nova tarefa
- `update` — Editar existente
- `destroy` — Excluir (soft delete)
- `changeStatus` — Mover entre colunas
- `complete` — Marcar como concluída
- `reopen` — Reabrir tarefa concluída

### Recursos Adicionais Úteis

- Duplicar tarefa
- Converter reunião em tarefa
- Gerar tarefa a partir de aviso
- Upload de anexos

---

## 11. Ordem de Implantação

### Fase 0 — Preparação (1-2 dias)
- [ ] Limpar template AdminKitPro
- [ ] Definir layout institucional (cores, logo)
- [ ] Mapear conteúdos existentes
- [ ] Definir estrutura de migrations

### Fase 1 — Painel Operacional Aberto (5-7 dias)
- [ ] Dashboard com KPIs estáticos
- [ ] Kanban visual (sem backend)
- [ ] Calendário com eventos mock
- [ ] Avisos e links estáticos
- [ ] Documentos indexados manualmente

### Fase 2 — Backend e CRUD (3-5 dias)
- [ ] Implementar migrations
- [ ] Models com enums e relacionamentos
- [ ] CRUD completo de tarefas
- [ ] CRUD de contatos (básico)
- [ ] CRUD de avisos e links
- [ ] Observers para histórico

### Fase 3 — Métricas Dinâmicas (2-3 dias)
- [ ] Repository de métricas
- [ ] API endpoints
- [ ] Dashboard com dados reais
- [ ] Ranking por responsável

### Fase 4 — Integração Google Leve (3-5 dias)
- [ ] Configurar OAuth
- [ ] Listar arquivos de pasta específica
- [ ] Ler planilha crítica
- [ ] Links dinâmicos para Drive

### Fase 5 — Autenticação (2-3 dias)
- [ ] Instalar Laravel Breeze
- [ ] Proteger área administrativa
- [ ] Roles e permissões básicas
- [ ] OAuth Google para usuários (opcional)

---

## 12. Cronograma Realista

### MVP Operacional (10 dias úteis)

**Viável:**
- Layout base funcional
- Dashboard com KPIs
- Kanban básico com drag-and-drop
- Calendário visual
- CRUD de tarefas
- Contatos básicos
- Avisos e links
- Deploy interno de teste

**Arriscado para 10 dias:**
- Métricas maduras e complexas
- CRM completo
- Integração Google estável
- Exportações PDF/XLSX
- Drag-and-drop muito refinado
- Mobile com swipe

### Estabilização (+5 a +10 dias)

- Refinamento de UX
- Integrações Google
- Ajustes de dados
- Testes e bug fixes
- Documentação

---

## 13. Prioridades Reais da ASOF

Ordem de valor prático:

1. Tarefas com responsável e prazo
2. Calendário de vencimentos
3. Avisos e links rápidos
4. Reuniões e encaminhamentos
5. Documentos indexados
6. Contatos institucionais
7. Métricas
8. Integrações avançadas
9. Login ampliado

---

## 14. Componentes do AdminKitPro a Reaproveitar

### Utilizar

- Layout principal e sidebar
- Cards e estatísticas
- Tabelas de dados
- Formulários e validações
- Modais
- Badges e alerts
- Responsividade e tema

### Não Priorizar

- Gráficos comerciais genéricos
- Mapas
- Widgets de receita
- Dashboards artificiais
- Excesso de plugins

---

## 15. Critérios de Sucesso da V1

A Versão 1 estará correta se:

- [ ] A equipe conseguir usar diariamente sem treinamento complexo
- [ ] Tarefas tiverem responsável, prazo e status claros
- [ ] Prazos forem visíveis no calendário
- [ ] Reuniões gerarem encaminhamentos rastreáveis
- [ ] Documentos relevantes forem encontrados rapidamente
- [ ] Manutenção de conteúdo puder ser feita sem editar código
- [ ] O login ainda não atrapalhar o acesso inicial

---

## 16. Stack Tecnológico Definitivo

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Backend | Laravel | 11.x |
| PHP | PHP | 8.2+ |
| Database | MySQL/PostgreSQL | 8.0+ / 13+ |
| Frontend | Blade + Alpine.js | 3.x |
| Drag & Drop | SortableJS | latest |
| Calendário | FullCalendar | 6.x |
| Auth | Laravel Breeze | 1.x |
| API Tokens | Laravel Sanctum | 4.x |
| Google API | google/apiclient | 2.15+ |
| Opcional | Livewire | 3.x |

---

## 17. Próximos Passos

1. **Validar** este planejamento com a equipe
2. **Criar** repositório Git
3. **Instalar** Laravel 11 + Breeze
4. **Configurar** AdminKitPro ou equivalente
5. **Executar** Fase 0 — Preparação
6. **Iniciar** Fase 1 — Painel Operacional

---

## Conclusão

A intranet da ASOF deve ser implantada como um **painel administrativo operacional leve**, focado em:

- **Tarefas** — Com responsáveis, prazos e status
- **Calendário** — Visualização de vencimentos
- **Contatos** — CRM institucional básico
- **Avisos** — Comunicação interna
- **Documentos** — Indexados com links para Google Workspace
- **Integração progressiva** — Em camadas, sem bloqueios

Sem transformar o projeto inicial em um sistema grande demais.

---

**Versão**: 2.2
**Atualizado em**: 2025-03-18
**Alinhado com**: Laravel 11, PHP 8.2+, FullCalendar 6
