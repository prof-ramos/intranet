# Custo de Evolução — Slim Architecture

> **Etapa 2 — Suplemento de Arquitetura**
> **Quando refatorar de Slim para abstrações maiores**

---

## Matriz de Refatoração

| Refatoração | Gatilho | Estimativa | Testes Impactados | Risco |
|-------------|---------|------------|-------------------|------|
| **+Repository Pattern** | Queries com 3+ joins repetidas | 2-3 dias | ~30% | Baixo |
| **+Service Layer** | Controller method >20 linhas | 1-2 dias | ~15% | Baixo |
| **+Action Class** | Operação em ≥3 Models | 0.5-1 dia | ~5% | Muito Baixo |
| **+DTOs** | Respostas complexas reutilizadas | 1 dia | ~10% | Baixo |
| **+Events/Listeners** | Side effects em ≥2 lugares | 1-2 dias | ~20% | Médio |

**Total acumulado**: 5.5 a 9 dias para refatorização completa

---

## Cenário 1: Adicionando Repository

### Gatilho
Query com 3+ joins reutilizada em ≥3 lugares

### ANTES (Slim)
```php
// Repetido em TaskController, DashboardController, MetricsController
$tasks = Task::with('assignedTo', 'createdBy', 'relatedContact')
    ->where('status', '!=', TaskStatus::Done)
    ->where('deadline', '>', now())
    ->whereHas('assignedTo', fn($q) => $q->where('active', true))
    ->orderBy('deadline')
    ->get();
```

### DEPOIS (Repository)
```php
// 1. Criar Interface (1 dia)
// app/Contracts/Repositories/TaskRepositoryInterface.php
interface TaskRepositoryInterface
{
    public function getPendingActive(): Collection;
}

// 2. Criar Implementação (1 dia)
// app/Repositories/TaskRepository.php
class TaskRepository implements TaskRepositoryInterface
{
    public function getPendingActive(): Collection
    {
        return Task::with('assignedTo', 'createdBy', 'relatedContact')
            ->where('status', '!=', TaskStatus::Done)
            ->where('deadline', '>', now())
            ->whereHas('assignedTo', fn($q) => $q->where('active', true))
            ->orderBy('deadline')
            ->get();
    }
}

// 3. Atualizar Controller (0.5 dia)
class TaskController extends Controller
{
    public function __construct(
        private TaskRepositoryInterface $repository
    ) {}

    public function index()
    {
        return view('tasks.index', [
            'tasks' => $this->repository->getPendingActive()
        ]);
    }
}

// 4. Atualizar Service Provider (0.5 dia)
// app/Providers/AppServiceProvider.php
public function register()
{
    $this->app->bind(TaskRepositoryInterface::class, TaskRepository::class);
}
```

### Testes Impactados
```php
// ❌ Antes (Database)
test('dashboard mostra tarefas pendentes', function () {
    Task::factory()->count(5);
    actingAs(User::factory()->create())
        ->get('/dashboard')
        ->assertViewHas('tasks');
});

// ✅ Depois (Mock de Repository)
test('dashboard mostra tarefas pendentes', function () {
    $mockRepo = Mockery::mock(TaskRepositoryInterface::class);
    $mockRepo->shouldReceive('getPendingActive')
        ->once()
        ->andReturn(collect([Task::factory()->make()]));

    app()->instance(TaskRepositoryInterface::class, $mockRepo);

    actingAs(User::factory()->create())
        ->get('/dashboard')
        ->assertViewHas('tasks');
});
```

**Custo**: 2-3 dias
**Benefício**: Queries centralizadas, mais fáceis de testar isoladamente

---

## Cenário 2: Adicionando Service Layer

### Gatilho
Controller method >20 linhas com lógica complexa

### ANTES (Slim)
```php
// TaskController@store — 25 linhas
public function store(Request $request)
{
    $validated = $request->validate([
        'title' => 'required|string|max:255',
        'deadline' => 'required|date|after:now',
        // ... mais 10 linhas de validação
    ]);

    // Verifica duplicidade (3 linhas)
    if (Task::where('title', $validated['title'])->where('status', '!=', TaskStatus::Done)->exists()) {
        return back()->with('error', 'Já existe tarefa com este título.');
    }

    // Encontra usuário menos ocupado (5 linhas)
    $assigneeId = User::withCount('tasks')
        ->having('tasks_count', '<', 5)
        ->inRandomOrder()
        ->value('id');

    // Cria tarefa (3 linhas)
    $task = Task::create([
        ...$validated,
        'status' => TaskStatus::Todo,
        'created_by' => auth()->id(),
        'assigned_to' => $assigneeId,
    ]);

    // Cria histórico (4 linhas)
    TaskHistory::create([...]);

    // Notifica (3 linhas)
    $task->assignee->notify(new TaskAssignedNotification($task));

    return redirect()->route('tasks.index');
}
```

### DEPOIS (Service)
```php
// 1. Criar Service (1 dia)
// app/Services/CreateTaskService.php
class CreateTaskService
{
    public function __construct(
        private TaskRepository $repository,
        private NotificationService $notifications
    ) {}

    public function execute(array $data, int $userId): Task
    {
        // Verifica duplicidade
        if ($this->repository->existsByTitle($data['title'])) {
            throw new TaskDuplicateException($data['title']);
        }

        // Encontra assignee
        $assignee = $this->repository->findLeastLoadedUser();

        // Cria tarefa
        $task = $this->repository->create([
            ...$data,
            'created_by' => $userId,
            'assigned_to' => $assignee->id,
        ]);

        // Dispara evento (notificação será executada pelo listener)
        TaskCreated::dispatch($task, $userId);

        return $task;
    }
}

// 2. Controller simplificado
class TaskController extends Controller
{
    public function store(CreateTaskRequest $request, CreateTaskService $service)
    {
        $task = $service->execute($request->validated(), auth()->id());
        return redirect()->route('tasks.show', $task);
    }
}

// 3. Event + Listener (já existe no plano)
TaskCreated::dispatch($task, $userId);
// Listener envia notificação
```

**Custo**: 1-2 dias
**Benefício**: Lógica reutilizável, teste isolado, controller magro

---

## Cenário 3: Adicionando Action Class

### Gatilho
Operação envolvendo ≥3 Models

### ANTES (Slim)
```php
// TaskController@complete — 15 linhas
public function complete(Request $request, Task $task)
{
    // Valida
    if ($task->assigned_to !== auth()->id()) {
        abort(403);
    }

    // Atualiza
    $task->update([
        'status' => TaskStatus::Done,
        'completed_at' => now(),
    ]);

    // Histórico
    TaskHistory::create([...]);

    // Notifica criador
    $task->createdBy->notify(new TaskCompletedNotification($task));

    // Métrica
    Cache::forget('metrics.overview');

    return back()->with('success', 'Tarefa concluída!');
}
```

### DEPOIS (Action)
```php
// 1. Criar Action (0.5 dia)
// app/Actions/CompleteTaskAction.php
class CompleteTaskAction
{
    public function execute(Task $task, User $user): Task
    {
        // Autorização
        abort_if($task->assigned_to !== $user->id, 403);

        // Executa
        $task->update([
            'status' => TaskStatus::Done,
            'completed_at' => now(),
        ]);

        // Side effects
        TaskHistory::create([...]);
        $task->createdBy->notify(new TaskCompletedNotification($task));
        Cache::forget('metrics.overview');

        return $task;
    }
}

// 2. Controller invocando
class TaskController extends Controller
{
    public function complete(Request $request, Task $task)
    {
        $task = app(CompleteTaskAction::class)->execute($task, auth()->user());
        return back()->with('success', 'Tarefa concluída!');
    }
}
```

**Custo**: 0.5-1 dia
**Benefício**: Lógica encapsulada, reutilizável em outros controllers

---

## Cronograma de Evolução Típica

### Mês 1-2: Slim MVP
- 6 arquivos por entidade
- Desenvolvimento rápido
- Iterações em horas

### Mês 3: Primeira Refatoração
**Sinais**: Controller crescendo, queries se repetindo
- +1 Repository (Tasks) — 2 dias
- +2 Actions — 1 dia
- **Total**: 3 dias de refatoração

### Mês 4-5: Segunda Refatorização
**Sinais**: Lógica de negócio complexa
- +1 Service (Metrics) — 2 dias
- +DTOs para API — 1 dia
- **Total**: 3 dias de refatorização

### Mês 6+: Arquitetura Maduro
- Repositories para todas entidades
- Services para orquestração complexa
- **Total**: Tempo de manutenção reduzido

---

## Mitigação de Risco

### Risco: "Falsa Simplicidade"

O código Slim pode se tornar uma bagunça se não refatorizado a tempo.

**Mitigações**:
1. **Code Review mensal** — Buscar métodos >20 linhas
2. **SonarQube/Pint** — Detectar complexidade ciclomática
3. **Test Coverage** — Se teste >50 linhas, provavelmente precisa refatorar
4. **Documentar "tech debt"** — Issues GitHub taggadas como `refactor`

### Risco: Resiste à Mudança

Equipe pode resistir refatoração "porque está funcionando".

**Mitigações**:
1. **Timebox refatorações** — Máximo 1 semana por ciclo
2. **Feature flag** — Refator em branch, merge via PR
3. **Métricas antes/depois** — Mostrar melhoria de performance

---

## Conclusão

**Custo total de evolução**: ~5.5-9 dias para refatorização completa (dependendo do momento)

**Investimento que se paga em**:
- Velocidade de iteração (MVP: semanas → Manutenção: dias)
- Onboarding de novos devs (Slim: 2 horas → Full: 4 horas)
- Debuggabilidade (Slim: 2 camadas → Full: 4 camadas)

**Regra de ouro**: Refatorar quando a DOR (dor) da equipe aumentar, não antes.
