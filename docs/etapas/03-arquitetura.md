# Etapa 2 — Arquitetura com IA

> **Tempo estimado**: 1-2 horas
> **Saída**: Estrutura técnica detalhada, diretórios criados

---

## Objetivo

Transformar o PRD em **estrutura técnica concreta** que a IA possa seguir ao gerar código.

---

## 1. Estrutura de Diretórios

### Prompt para Gerar Estrutura

```text
/claude "Baseado no PRD, gere a estrutura de diretórios Laravel.

Requisitos:
- Seguir convenções Laravel 11
- Separar concerns (Models, Services, Repositories)
- Preparar para Livewire (se aplicável)

Saída formatada como árvore."
```

### Estrutura Recomendada (Laravel 11)

```text
app/
├── Actions/              # Single-purpose actions
├── Contracts/            # Interfaces
├── Enums/                # PHP Enums
├── Events/               # Domain events
├── Exceptions/           # Custom exceptions
├── Helpers/              # Global helpers
├── Http/
│   ├── Controllers/
│   ├── Middleware/
│   ├── Requests/         # FormRequest
│   └── Resources/        # API Resources
├── Listeners/            # Event listeners
├── Models/               # Eloquent models
├── Observers/            # Model observers
├── Repositories/         # Data access
├── Services/             # Business logic
└── Traits/
```

---

## 2. Contratos e Interfaces

### Prompt para Definir Interfaces

```text
/claude "Para cada entidade do PRD, defina:

1. Interface Repository com métodos CRUD
2. Interface Service com métodos de negócio
3. FormRequest com validações
4. API Resource com transformações

Use type hints e return types. Siga PSR-12."
```

### Exemplo: `app/Repositories/Contracts/TaskRepositoryInterface.php`

```php
<?php

namespace App\Repositories\Contracts;

use App\Models\Task;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

interface TaskRepositoryInterface
{
    public function all(): Collection;
    public function find(int $id): ?Task;
    public function create(array $data): Task;
    public function update(int $id, array $data): Task;
    public function delete(int $id): bool;
    public function paginate(int $perPage = 15): LengthAwarePaginator;
    public function getOverdue(): Collection;
    public function getByStatus(string $status): Collection;
    public function getByAssignee(int $userId): Collection;
}
```text

---

## 3. Service Layer

### Prompt para Services

```

/claude "Crie services para lógica de negócio.

Requisitos:

- Um service por contexto (TaskService, CalendarService)
- Métodos que ORCHESTRAM, não implementam
- Delegar para repositories
- Retornar DTOs ou Resources

Exemplo de método:

- createTask(array) → TaskResource
- assignTask(int $taskId, int $userId) → TaskResource
- completeTask(int $taskId) → TaskResource"

```text

### Exemplo: `app/Services/TaskService.php`

```php
<?php

namespace App\Services;

use App\Repositories\Contracts\TaskRepositoryInterface;
use App\Http\Requests\CreateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Events\TaskCreated;
use App\Events\TaskCompleted;

class TaskService
{
    public function __construct(
        private TaskRepositoryInterface $repository
    ) {}

    public function createTask(CreateTaskRequest $request): TaskResource
    {
        $task = $this->repository->create($request->validated());
        TaskCreated::dispatch($task);
        return new TaskResource($task);
    }

    public function completeTask(int $taskId): TaskResource
    {
        $task = $this->repository->find($taskId);
        $task->status = TaskStatus::Done;
        $task->completed_at = now();
        $task = $this->repository->update($taskId, $task->toArray());
        TaskCompleted::dispatch($task);
        return new TaskResource($task);
    }
}
```

---

## 4. Eventos e Listeners

### Prompt para Eventos

```text
/claude "Liste eventos de domínio baseados no PRD.

Formato:
- Evento: Nome em passado (TaskCreated)
- Quando dispara: Condição clara
- Dados: Payload necessário
- Listeners: Quem escuta"
```

### Exemplo de Mapeamento

```php
// app/Providers/EventServiceProvider.php

protected $listen = [
    TaskCreated::class => [
        SendNotificationListener::class,
        LogActivityListener::class,
    ],
    TaskCompleted::class => [
        UpdateMetricsListener::class,
        NotifyAssigneeListener::class,
    ],
];
```text

---

## 5. Configuração e Environment

### `.env.example`

```bash
# App
APP_NAME="Intranet ASOF"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=intranet_asof
DB_USERNAME=laravel
DB_PASSWORD=

# Google (Camada 2)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_DRIVE_FOLDER_ID=

# Mail
MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
```

### `config/app.php` — Customizações

```php
return [
    // ...
    'enums' => [
        'task_status' => \App\Enums\TaskStatus::class,
        'task_priority' => \App\Enums\TaskPriority::class,
    ],
];
```text

---

## 6. Roteamento

### Prompt para Definir Rotas

```

/claude "Baseado no PRD, defina:

1. Rotas web (para Blade views)
2. Rotas API (para JSON responses)
3. Middleware necessário (auth, throttle)
4. Namespacing correto

Use resource controllers onde aplicar."

```text

### `routes/web.php`

```php
Route::middleware(['auth'])
    ->group(function () {
        Route::resource('tasks', TaskController::class);
        Route::resource('contacts', ContactController::class);
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/calendar', [CalendarController::class, 'index'])->name('calendar');
    });
```

### `routes/api.php`

```php
Route::middleware(['auth:sanctum'])
    ->group(function () {
        Route::apiResource('tasks', Api\TaskController::class);
        Route::patch('/tasks/{task}/status', [TaskStatusController::class, 'update']);
        Route::get('/metrics', [MetricsController::class, 'index']);
        Route::get('/calendar-events', [CalendarController::class, 'events']);
    });
```text

---

## 7. Validações (FormRequest)

### Prompt para Requests

```

/claude "Para cada entidade, crie FormRequest:

- StoreRequest (criação)
- UpdateRequest (edição)

Inclua:

- Rules em array
- Custom messages em pt_BR
- Attributes aliases em pt_BR"

```text

### Exemplo: `app/Http/Requests/StoreTaskRequest.php`

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'deadline' => ['required', 'date', 'after:now'],
            'priority' => ['required', Rule::enum(TaskPriority::class)],
            'status' => ['nullable', Rule::enum(TaskStatus::class)],
            'related_contact_id' => ['nullable', 'exists:contacts,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'O título é obrigatório',
            'deadline.after' => 'O prazo deve ser futuro',
            'assigned_to.exists' => 'Usuário não encontrado',
        ];
    }
}
```

---

## 8. API Resources

### Prompt para Resources

```text
/claude "Crie API Resources para:

1. Collection (listagem)
2. Single (detalhe)
3. Minimal (para relacionamentos)

Inclua:
- Campos explícitos
- Formatação de datas
- Relacionamentos quando solicitados"
```

### Exemplo: `app/Http/Resources/TaskResource.php`

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->status->value,
            'priority' => $this->priority->value,
            'deadline' => $this->deadline->format('Y-m-d H:i'),
            'completed_at' => $this->completed_at?->format('Y-m-d H:i'),
            'is_overdue' => $this->deadline->isPast() && $this->status !== TaskStatus::Done,
            'assigned_to' => UserResource::make($this->whenLoaded('assignedTo')),
            'created_by' => UserResource::make($this->whenLoaded('createdBy')),
            'created_at' => $this->created_at->format('Y-m-d H:i'),
        ];
    }
}
```text

---

## Checklist de Validação

- [ ] Estrutura de diretórios definida
- [ ] Interfaces criadas
- [ ] Services esqueletados
- [ ] Eventos mapeados
- [ ] FormRequests criados
- [ ] API Resources definidos
- [ ] Rotas planejadas
- [ ] Configurações preparadas

---

## Saída Esperada

- [ ] `docs/architecture/structure.md`
- [ ] `docs/architecture/contracts.md`
- [ ] `docs/architecture/events.md`
- [ ] Interfaces, Services, Requests criados (esqueleto)

---

**Versão**: 1.0
**Data**: 2025-03-18

**Próxima**: [04-geracao.md](./04-geracao.md)
