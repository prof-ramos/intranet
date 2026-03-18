# Template para Criar Testes Pest Laravel

## Instruções

Quando precisar criar testes com Pest, use este template para garantir consistência e melhores práticas.

## Contexto do Projeto

- **Framework de Teste**: Pest 4.x
- **Tipos de Teste**: Unit e Feature
- **Banco de Dados**: SQLite em memória para testes
- **Faker**: Use para dados realistas
- **Factories**: Use factories para criar dados de teste
- **RefreshDatabase**: Limpa banco após cada teste

## Padrões de Testes

### Regras Obrigatórias

- Use type hints em todos os métodos e propriedades
- Use factories para criar dados de teste
- Use `actingAs()` para autenticação quando necessário
- Use `refreshDatabase` para testes de feature
- Use arrange-act-assert pattern (AAA)
- Use descritivos nomes para testes
- Teste cenários de sucesso e falha
- Use `expect()` ao invés de `assert()`

### Estrutura Base de Teste

```php
<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use function Pest\Laravel\actingAs;
use function Pest\Laravel\get;
use function Pest\Laravel\post;

uses(RefreshDatabase::class);

beforeEach(function () {
    // Setup antes de cada teste
});

test('pode criar tarefa', function () {
    // Arrange
    $user = User::factory()->create();
    $taskData = [
        'title' => 'Nova tarefa',
        'description' => 'Descrição da tarefa',
        'status' => 'pending',
        'priority' => 'medium',
    ];

    // Act
    $response = actingAs($user)
        ->post(route('tasks.store'), $taskData);

    // Assert
    expect($response->status())->toBe(201);
    $response->assertJson([
        'success' => true,
        'data' => [
            'title' => 'Nova tarefa',
        ],
    ]);

    $this->assertDatabaseHas('tasks', [
        'title' => 'Nova tarefa',
        'user_id' => $user->id,
    ]);
});
```

## Testes Unitários

### Quando Usar

- Testar lógica de negócio isolada do Model
- Testar métodos helper do Model
- Testar scopes
- Testar mutators/accessors

### Exemplo de Teste Unitário

```php
<?php

use App\Models\Task;
use App\Enums\TaskStatus;
use App\Enums\TaskPriority;

test('pode marcar tarefa como concluída', function () {
    $task = Task::factory()->create([
        'status' => TaskStatus::PENDING,
    ]);

    $task->markAsCompleted();

    expect($task->status)->toBe(TaskStatus::COMPLETED);
    expect($task->isCompleted())->toBeTrue();
});

test('scope active retorna apenas tarefas ativas', function () {
    Task::factory()->create(['active' => false]);
    $activeTask = Task::factory()->create(['active' => true]);

    $activeTasks = Task::query()->active()->get();

    expect($activeTasks)->toHaveCount(1);
    expect($activeTasks->first()->id)->toBe($activeTask->id);
});
```

## Testes de Feature

### Quando Usar

- Testar endpoints HTTP
- Testar controllers completos
- Testar autorização
- Testar validação de input
- Testar integrações com banco

### Exemplo de Teste de Feature - Index

```php
test('pode listar tarefas', function () {
    $user = User::factory()->create();
    Task::factory()->count(3)->for($user)->create();

    actingAs($user)
        ->get(route('tasks.index'))
        ->assertOk()
        ->assertJsonCount(3, 'data');
});

test('tarefas são paginadas', function () {
    $user = User::factory()->create();
    Task::factory()->count(20)->for($user)->create();

    actingAs($user)
        ->get(route('tasks.index'))
        ->assertOk()
        ->assertJsonStructure([
            'data' => [],
            'links' => [],
            'meta' => [],
        ]);
});
```

### Exemplo de Teste de Feature - Store

```php
test('pode criar tarefa', function () {
    $user = User::factory()->create();
    $taskData = [
        'title' => 'Nova tarefa',
        'status' => 'pending',
        'priority' => 'medium',
    ];

    actingAs($user)
        ->post(route('tasks.store'), $taskData)
        ->assertCreated();

    $this->assertDatabaseHas('tasks', [
        'title' => 'Nova tarefa',
        'user_id' => $user->id,
    ]);
});

test('não pode criar tarefa sem título', function () {
    $user = User::factory()->create();
    $taskData = [
        'status' => 'pending',
        'priority' => 'medium',
    ];

    actingAs($user)
        ->post(route('tasks.store'), $taskData)
        ->assertStatus(422)
        ->assertJsonValidationErrors(['title']);
});

test('não autenticado não pode criar tarefa', function () {
    $taskData = [
        'title' => 'Nova tarefa',
        'status' => 'pending',
        'priority' => 'medium',
    ];

    post(route('tasks.store'), $taskData)
        ->assertRedirectToRoute('login');
});
```

### Exemplo de Teste de Feature - Update

```php
test('pode atualizar tarefa', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create();

    $updateData = [
        'title' => 'Tarefa atualizada',
        'status' => 'in_progress',
    ];

    actingAs($user)
        ->put(route('tasks.update', $task), $updateData)
        ->assertOk();

    expect($task->fresh()->title)->toBe('Tarefa atualizada');
    expect($task->fresh()->status)->toBe('in_progress');
});

test('não pode atualizar tarefa de outro usuário', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $task = Task::factory()->for($otherUser)->create();

    actingAs($user)
        ->put(route('tasks.update', $task), [
            'title' => 'Tarefa atualizada',
        ])
        ->assertForbidden();
});
```

### Exemplo de Teste de Feature - Destroy

```php
test('pode deletar tarefa', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create();

    actingAs($user)
        ->delete(route('tasks.destroy', $task))
        ->assertNoContent();

    $this->assertDatabaseMissing('tasks', [
        'id' => $task->id,
    ]);
});
```

## Testes de Autorização

```php
test('convidado não pode acessar recursos protegidos', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create();

    actingAs($user)
        ->get(route('tasks.show', $task))
        ->assertForbidden();
});

test('administrador pode acessar todos os recursos', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $task = Task::factory()->create();

    actingAs($admin)
        ->get(route('tasks.show', $task))
        ->assertOk();
});
```

## Testes de Validação

```php
test('requer título para criar tarefa', function () {
    $user = User::factory()->create();

    actingAs($user)
        ->post(route('tasks.store'), [
            'status' => 'pending',
            'priority' => 'medium',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['title']);
});

test('requer status válido', function () {
    $user = User::factory()->create();

    actingAs($user)
        ->post(route('tasks.store'), [
            'title' => 'Nova tarefa',
            'status' => 'invalid_status',
            'priority' => 'medium',
        ])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['status']);
});
```

## Testes de Relacionamentos

```php
test('tarefa pertence a usuário', function () {
    $user = User::factory()->create();
    $task = Task::factory()->for($user)->create();

    expect($task->user->id)->toBe($user->id);
});

test('usuário tem múltiplas tarefas', function () {
    $user = User::factory()->create();
    Task::factory()->count(3)->for($user)->create();

    expect($user->tasks)->toHaveCount(3);
});
```

## Datasets

Para testar múltiplos cenários com dados diferentes:

```php
dataset('task_status', function () {
    return [
        'pending' => ['status' => 'pending'],
        'in_progress' => ['status' => 'in_progress'],
        'completed' => ['status' => 'completed'],
    ];
});

test('pode criar tarefa com qualquer status', function ($status) {
    $user = User::factory()->create();
    $taskData = array_merge([
        'title' => 'Nova tarefa',
        'priority' => 'medium',
    ], $status);

    actingAs($user)
        ->post(route('tasks.store'), $taskData)
        ->assertCreated();
})->with('task_status');
```

## Hooks do Pest

### beforeEach

```php
beforeEach(function () {
    // Executa antes de cada teste
    $this->user = User::factory()->create();
});
```

### afterEach

```php
afterEach(function () {
    // Executa após cada teste
    Storage::fake();
});
```

### beforeAll

```php
beforeAll(function () {
    // Executa uma vez antes de todos os testes
});
```

### afterAll

```php
afterAll(function () {
    // Executa uma vez após todos os testes
});
```

## Comandos

```bash
# Rodar todos os testes
./vendor/bin/pest

# Rodar testes específicos
./vendor/bin/pest tests/Feature/TaskTest.php

# Rodar com coverage
./vendor/bin/pest --coverage

# Rodar em modo paralelo
./vendor/bin/pest --parallel

# Rodar apenas testes de feature
./vendor/bin/pest --testsuite=Feature

# Rodar com filter
./vendor/bin/pest --filter="pode criar"

# Rodar com stop-on-failure
./vendor/bin/pest --stop-on-failure
```

## Checklist de Validação

Após criar testes, verifique:

- [ ] Testes têm descritivos nomes
- [ ] Padrão AAA (Arrange-Act-Assert) seguido
- [ ] Factories usadas para dados de teste
- [ ] Testes de sucesso e falha implementados
- [ ] Type hints em todos os métodos
- [ ] `actingAs()` usado para autenticação
- [ ] `refreshDatabase` usado para testes de feature
- [ ] Validação testada (campos required/invalidos)
- [ ] Autorização testada (usuário correto/errado)
- [ ] Edge cases testados (empty, null, limites)

## Exemplos de Uso

### Criar Teste Completo para CRUD

```
Crie testes de feature para TaskController:
- Index: listar tarefas, paginação, filtros
- Store: criar com sucesso, validação de campos, autenticação
- Show: visualizar tarefa própria, não ver de outros
- Update: atualizar com sucesso, validação, autorização
- Destroy: deletar com sucesso, autorização
```

### Criar Testes Unitários para Model

```
Crie testes unitários para Task:
- Testar métodos helper (isCompleted, isHighPriority)
- Testar scopes (active, completed, highPriority)
- Testar mutators/accessors
- Testar relacionamentos
```

### Criar Testes de Integração

```
Crie testes de integração para workflows:
- Criar tarefa com usuário autenticado
- Atualizar status da tarefa
- Deletar tarefa e verificar que foi removida do banco
- Testar que usuário não pode acessar dados de outros