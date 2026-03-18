# Etapa 6 — Testes com IA

> **Tempo estimado**: 2-3 horas
> **Saída**: Suíte de testes (Unit, Feature, Browser)

---

## Filosofia

> **"Teste é o contrato que o código cumpre."**

Em vibe coding, IA gera testes, você valida cobertura.

---

## 1. Estrutura de Testes

```text
tests/
├── Unit/              # Testes de classe isolada
│   ├── Models/
│   ├── Services/
│   ├── Repositories/
│   └── Enums/
├── Feature/           # Testes de integração HTTP
│   ├── Tasks/
│   ├── Auth/
│   └── Api/
├── Browser/           # Testes E2E (Dusk/Pest)
│   └── KanbanTest.php
└── Pest.php           # Configuração
```

---

## 2. Configuração do Pest

### `phpunit.xml` → `pest.php`

````php
// pest.php
use Pest\Plugintest;

Plugintest::setPath([
    __DIR__.'/tests',
])->setTestCaseExtensions([
    'Test.php',
    'TestCase.php',
]);

// Plugins
Plugintest::use()->subset();
```text

---

## 3. Gerando Testes Unitários

### Prompt para Models

````

/claude "Gere testes unitários para Model [NOME]:

1. Teste de factory (criação)
2. Teste de scopes
3. Teste de relacionamentos
4. Teste de accessors/mutators
5. Teste de casts (enums)

Use Pest, arrange-act-assert."

````text

### Exemplo Gerado

```php
// tests/Unit/Models/TaskTest.php
use App\Models\Task;
use App\Enums\TaskStatus;
use App\Models\User;

test('can create task with factory', function () {
    $task = Task::factory()->create();

    expect($task->id)->toBeInt();
    expect($task->title)->toBeString();
});

test('todo scope returns only todo tasks', function () {
    Task::factory()->create(['status' => TaskStatus::Todo]);
    Task::factory()->create(['status' => TaskStatus::Done]);

    $todos = Task::where('status', TaskStatus::Todo)->get();

    expect($todos)->toHaveCount(1);
    expect($todos->first()->status)->toBe(TaskStatus::Todo);
});

test('task belongs to assigned user', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user, 'assignedTo')->create();

    expect($task->assignedTo->id)->toBe($user->id);
});

test('status cast to enum', function () {
    $task = Task::factory()->create(['status' => TaskStatus::InProgress]);

    expect($task->status)->toBeInstanceOf(TaskStatus::class);
    expect($task->status->value)->toBe('progress');
});
````

### Prompt para Services

```text
/claude "Gere testes para Service [NOME]:

1. Mock de repository
2. Teste de métodos principais
3. Teste de events dispatched
4. Teste de exceptions

Use Pest + Mockery."
```

### Exemplo

````php
// tests/Unit/Services/TaskServiceTest.php
use App\Services\TaskService;
use App\Repositories\Contracts\TaskRepositoryInterface;
use Illuminate\Support\Facades\Event;
use App\Events\TaskCreated;

beforeEach(function () {
    $this->repo = Mockery::mock(TaskRepositoryInterface::class);
    $this->service = new TaskService($this->repo);
});

test('creates task and dispatches event', function () {
    Event::fake();

    $data = ['title' => 'Test', 'status' => 'todo'];
    $task = Task::factory()->make($data);

    $this->repo->shouldReceive('create')
        ->with($data)
        ->once()
        ->andReturn($task);

    $result = $this->service->createTask(new Request($data));

    Event::assertDispatched(TaskCreated::class);
});
```text

---

## 4. Gerando Feature Tests

### Prompt para CRUD

````

/claude "Gere feature tests para CRUD de [RECURSO]:

1. GET index — lista com paginação
2. POST store — cria com sucesso
3. POST store — valida erro
4. GET show — retorna um recurso
5. PATCH update — atualiza
6. DELETE destroy — remove (soft delete)

Use actingAs para auth, JSON para API."

````text

### Exemplo

```php
// tests/Feature/TaskCrudTest.php
use App\Models\Task;
use App\Models\User;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

test('can list tasks', function () {
    Task::factory()->count(3)->for($this->user, 'createdBy')->create();

    $response = $this->getJson('/api/tasks');

    $response->assertStatus(200)
        ->assertJsonCount(3, 'data');
});

test('can create task', function () {
    $data = [
        'title' => 'Nova Tarefa',
        'status' => 'todo',
        'priority' => 'normal',
        'deadline' => now()->addWeek()->toDateString(),
    ];

    $response = $this->postJson('/api/tasks', $data);

    $response->assertStatus(201)
        ->assertJsonPath('data.title', 'Nova Tarefa');

    $this->assertDatabaseHas('tasks', ['title' => 'Nova Tarefa']);
});

test('validates required fields', function () {
    $response = $this->postJson('/api/tasks', []);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['title', 'deadline']);
});

test('can update task', function () {
    $task = Task::factory()->create();

    $response = $this->putJson("/api/tasks/{$task->id}", [
        'title' => 'Atualizado'
    ]);

    $response->assertStatus(200);
    $this->assertDatabaseHas('tasks', [
        'id' => $task->id,
        'title' => 'Atualizado'
    ]);
});

test('can delete task', function () {
    $task = Task::factory()->create();

    $response = $this->deleteJson("/api/tasks/{$task->id}");

    $response->assertStatus(204);
    $this->assertSoftDeleted('tasks', ['id' => $task->id]);
});
````

---

## 5. Testes de API

### Prompt para API Tests

```text
/claude "Gere testes de API para endpoints:

1. Response structure (Resource)
2. Pagination links
3. Filtering works
4. Sorting works
5. 404 para não encontrado
6. 403 para não autorizado

Use assertJsonStructure."
```

### Exemplo Prático

````php
test('api returns correct structure', function () {
    Task::factory()->count(15)->create();

    $response = $this->getJson('/api/tasks?page=1');

    $response->assertStatus(200)
        ->assertJsonStructure([
            'data' => [
                '*' => ['id', 'title', 'status', 'priority', 'deadline']
            ],
            'links' => ['first', 'last', 'prev', 'next'],
            'meta' => ['current_page', 'total', 'per_page']
        ]);
});

test('can filter by status', function () {
    Task::factory()->create(['status' => 'todo']);
    Task::factory()->create(['status' => 'done']);

    $response = $this->getJson('/api/tasks?status=done');

    $response->assertJsonCount(1, 'data');
    $response->assertJsonPath('data.0.status', 'done');
});
```text

---

## 6. Testes de Browser (Opcional)

### Prompt para Dusk

````

/claude "Gere teste Dusk para [FEATURE]:

1. Login na aplicação
2. Navegação até página
3. Interação (click, fill)
4. Asserção visual (ver elemento)
5. Logout

Use data selectors (data-testid)."

````text

### Exemplo

```php
// tests/Browser/KanbanTest.php
use Laravel\Dusk\Browser;
use Tests\DuskTestCase;

class KanbanTest extends DuskTestCase
{
    public function test_can_drag_task_to_another_column()
    {
        $this->browse(function (Browser $browser) {
            $browser->loginAs(User::first())
                ->visit('/kanban')
                ->assertSee('Kanban')
                ->drag('@task-1', '@column-done')
                ->pause(500)
                ->assertScript(
                    'return [...document.querySelectorAll("@column-done .task")].length',
                    1
                );
        });
    }
}
````

---

## 7. Cobertura

### Medir Cobertura

````bash
# Instalar
composer require --dev phpunit/php-code-coverage

# Executar com cobertura
pest --coverage --min=80

# Gerar HTML
pest --coverage-html=coverage
```text

### Prompt para Cobertura Faltando

````

/claude "Analise cobertura de testes:

Cobertura atual: [X]%

Identifique:

1. Métodos sem teste
2. Branch conditions não cobertas
3. Exceptions não testadas

Gere testes para atingir 80%+ cobertura."

```text

---

## 8. Testes de Performance

### Load Testing Básico

```

/claude "Crie teste de performance:

1. 100 requests em /api/tasks
2. Medir tempo médio
3. Verificar <= 500ms por request
4. Sem memory leaks

Use Laravel benchmarks."

````text

### Exemplo

```php
// tests/Performance/TaskApiPerformanceTest.php
test('api responds under 500ms', function () {
    Task::factory()->count(50)->create();

    $start = microtime(true);

    for ($i = 0; $i < 100; $i++) {
        $this->getJson('/api/tasks');
    }

    $duration = (microtime(true) - $start) * 1000; // ms
    $avg = $duration / 100;

    expect($avg)->toBeLessThan(500);
});
````

---

## 9. CI/CD para Testes

### GitHub Actions

````yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: mbstring, pdo, pdo_mysql

      - name: Install Dependencies
        run: composer install --prefer-dist --no-progress

      - name: Run Tests
        run: vendor/bin/pest --coverage --min=80

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
```text

---

## Checklist de Testes

- [ ] Pest configurado
- [ ] Testes unitários (Models)
- [ ] Testes unitários (Services)
- [ ] Feature tests (CRUD completo)
- [ ] API tests (structure, filters)
- [ ] Auth tests (login, permissions)
- [ ] Cobertura ≥ 70%
- [ ] CI configurado
- [ ] Todos passando localmente

---

## Saída Esperada

- [ ] `tests/` completo e organizado
- [ ] Cobertura ≥ 70%
- [ ] CI passando
- [ ] Documentos testados
- [ ] Confiança para deploy

---

**Versão**: 1.0
**Data**: 2025-03-18

**Próxima**: [08-documentacao.md](./08-documentacao.md)
````
