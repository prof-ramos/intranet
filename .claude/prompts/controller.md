# Template para Criar Controller Laravel

## Instruções

Quando precisar criar um Controller Laravel, use este template para garantir consistência e melhores práticas.

## Contexto do Projeto

- **Framework**: Laravel 11.x
- **API/Resource Controllers**: Padrão RESTful
- **Validação**: Form Request Classes
- **Autorização**: Gates/Polícies via middleware
- **Retornos**: JSON responses com mensagens padrão
- **Testes**: Pest com feature tests

## Padrões de Controller

### Regras Obrigatórias

- Use type hints em todos os métodos e parâmetros
- Use Form Request Classes para validação
- Use JSON responses com status codes HTTP adequados
- Implemente autorização antes de lógica de negócio
- Use resource injection via type hint no método
- Trate exceções apropriadamente
- Retorne mensagens de erro padronizadas

### Estrutura Base

```php
<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    /**
     * Listar todos os registros
     */
    public function index(): JsonResponse
    {
        $tasks = Task::query()->latest()->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $tasks,
        ], 200);
    }

    /**
     * Criar novo registro
     */
    public function store(StoreTaskRequest $request): JsonResponse
    {
        $task = Task::query()->create($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Tarefa criada com sucesso',
            'data' => $task,
        ], 201);
    }

    /**
     * Exibir registro específico
     */
    public function show(Task $task): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $task,
        ], 200);
    }

    /**
     * Atualizar registro existente
     */
    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $task->update($request->validated());

        return response()->json([
            'success' => true,
            'message' => 'Tarefa atualizada com sucesso',
            'data' => $task->fresh(),
        ], 200);
    }

    /**
     * Remover registro
     */
    public function destroy(Task $task): JsonResponse
    {
        $task->delete();

        return response()->json([
            'success' => true,
            'message' => 'Tarefa removida com sucesso',
        ], 204);
    }
}
```

## Form Request Classes

### Regras Obrigatórias

- Use type hints em métodos
- Valide campos com regras apropriadamente
- Use mensagens de erro customizadas se necessário
- Retorne arrays de validação

### Exemplo de Store Request

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['required', 'in:pending,in_progress,completed'],
            'priority' => ['required', 'in:low,medium,high'],
            'category_id' => ['nullable', 'exists:categories,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'title.required' => 'O título é obrigatório',
            'title.max' => 'O título não pode ter mais de 255 caracteres',
            'category_id.exists' => 'A categoria selecionada não existe',
        ];
    }
}
```

### Exemplo de Update Request

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && $this->task->user_id === auth()->id();
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['sometimes', 'in:pending,in_progress,completed'],
            'priority' => ['sometimes', 'in:low,medium,high'],
            'category_id' => ['nullable', 'exists:categories,id'],
        ];
    }
}
```

## Padrões de Retorno JSON

### Sucesso

```php
return response()->json([
    'success' => true,
    'message' => 'Operação realizada com sucesso',
    'data' => $resource,
], 200);
```

### Criação (201)

```php
return response()->json([
    'success' => true,
    'message' => 'Recurso criado com sucesso',
    'data' => $resource,
], 201);
```

### Erro de Validação (422)

```php
return response()->json([
    'success' => false,
    'message' => 'Erro de validação',
    'errors' => $validator->errors(),
], 422);
```

### Erro de Autorização (403)

```php
return response()->json([
    'success' => false,
    'message' => 'Você não tem permissão para realizar esta ação',
], 403);
```

### Erro de Recurso Não Encontrado (404)

```php
return response()->json([
    'success' => false,
    'message' => 'Recurso não encontrado',
], 404);
```

### Remoção (204)

```php
return response()->json([
    'success' => true,
    'message' => 'Recurso removido com sucesso',
], 204);
```

## Métodos Helper

### Buscar com Filtros

```php
public function index(Request $request): JsonResponse
{
    $query = Task::query();

    // Filtros
    if ($request->filled('status')) {
        $query->where('status', $request->status);
    }

    if ($request->filled('priority')) {
        $query->where('priority', $request->priority);
    }

    if ($request->filled('search')) {
        $query->where('title', 'like', '%' . $request->search . '%');
    }

    // Ordenação
    $query->orderBy(
        $request->get('sort_by', 'created_at'),
        $request->get('sort_order', 'desc')
    );

    $tasks = $query->paginate(15);

    return response()->json([
        'success' => true,
        'data' => $tasks,
    ], 200);
}
```

### Ações Customizadas

```php
/**
 * Marcar tarefa como concluída
 */
public function complete(Task $task): JsonResponse
{
    $this->authorize('update', $task);

    $task->update(['status' => 'completed']);

    return response()->json([
        'success' => true,
        'message' => 'Tarefa marcada como concluída',
        'data' => $task->fresh(),
    ], 200);
}

/**
 * Arquivar tarefa
 */
public function archive(Task $task): JsonResponse
{
    $this->authorize('update', $task);

    $task->delete(); // Soft delete

    return response()->json([
        'success' => true,
        'message' => 'Tarefa arquivada com sucesso',
    ], 200);
}
```

## Rotas

### Resource Route

```php
// routes/web.php ou routes/api.php
use App\Http\Controllers\TaskController;

Route::apiResource('tasks', TaskController::class);

// Ações customizadas
Route::post('/tasks/{task}/complete', [TaskController::class, 'complete']);
Route::post('/tasks/{task}/archive', [TaskController::class, 'archive']);
```

## Comandos de Geração

```bash
# Controller
php artisan make:controller TaskController

# Resource Controller
php artisan make:controller TaskController --resource

# API Resource Controller
php artisan make:controller TaskController --api

# Form Request
php artisan make:request StoreTaskRequest
php artisan make:request UpdateTaskRequest
```

## Checklist de Validação

Após criar um Controller, verifique:

- [ ] Todos os métodos têm type hints
- [ ] Form Request Classes criadas para validação
- [ ] Métodos de autorização implementados
- [ ] Retornos JSON padronizados
- [ ] Status codes HTTP corretos
- [ ] Mensagens de erro claras
- [ ] Exceções tratadas apropriadamente
- [ ] Rotas definidas corretamente
- [ ] Teste feature criado para o Controller
- [ ] Autenticação/autorização testada

## Exemplos de Uso

### Criar Resource Controller Padrão

```
Crie um ResourceController para Category com:
- StoreRequest: validar name (required, string, max:255), slug (unique)
- UpdateRequest: validar os mesmos campos (sometimes)
- Autorização: apenas usuários autenticados
- Retornos JSON padronizados
- Filtros: por name e status (active/inactive)
```

### Criar Controller com Ações Customizadas

```
Crie um Controller para Task com:
- Métodos padrão: index, store, show, update, destroy
- Ações customizadas: complete, archive, restore
- Validação com Form Requests
- Autorização: usuário só pode modificar suas próprias tasks
- Filtros: por status, prioridade, search
```

### Criar API Controller

```
Crie um API Controller para Comment com:
- Validação de input
- Polimorfismo (morphTo/ToMany)
- Resposta JSON com recursos aninhados
- Paginação implementada
- Cache para endpoints de listagem