# Etapa 5 — Refino e Polimento

> **Tempo estimado**: 2-4 horas
> **Saída**: Código polido, otimizado, production-ready

---

## Objetivo

Transformar código funcional em **código de qualidade** que você tem orgulho de manter.

---

## 1. Refatoração de Código

### Prompt para Refatoração

```
/claude "Refatore este código:

[COLAR CÓDIGO]

Foque em:
1. Extrair métodos (máximo 10 linhas)
2. Números mágicos → constantes
3. Condicionais complexas → early returns
4. Parâmetros demais → value objects
5. Comentários óbvios → remover

Mantenha funcionalidade idêntica."
```

### Técnicas Comuns

#### Early Return

```php
// ❅ Aninhado
public function update(Request $request, $id)
{
    if ($request->user()) {
        if ($request->user()->can('update', Task::class)) {
            $task = Task::find($id);
            if ($task) {
                // update...
            }
        }
    }
}

// ✅ Early return
public function update(Request $request, $id)
{
    if (!$request->user()) {
        abort(401);
    }

    if (!$request->user()->can('update', Task::class)) {
        abort(403);
    }

    $task = Task::findOrFail($id);
    // update...
}
```

#### Value Objects

```php
// ❅ Primitivos
public function createTask($title, $description, $status, $priority, $deadline)
{
    // 6 parâmetros...
}

// ✅ Value Object
public function createTask(CreateTaskData $data)
{
    // 1 parâmetro com tudo
}
```

---

## 2. Otimização de Queries

### Prompt para Performance

```
/claude "Otimize as queries do projeto:

1. Substituir N+1 com eager loading
2. Usar select() apenas com campos necessários
3. Adicionar indexes em campos de busca
4. Usar chunk() para processamentos grandes
5. Caching de queries frequentes

Gere migrations para indexes quando necessário."
```

### Exemplos

```php
// ❅ N+1
$tasks = Task::all();
foreach ($tasks as $task) {
    echo $task->user->name;  // Query a cada iteração
}

// ✅ Eager loading
$tasks = Task::with('user')->get();
foreach ($tasks as $task) {
    echo $task->user->name;  // Já carregado
}

// ❅ Campos desnecessários
$tasks = Task::select('*')->get();

// ✅ Apenas necessário
$tasks = Task::select('id', 'title', 'status', 'deadline')->get();

// ❅ Sem cache
public function getMetrics()
{
    return DB::table('tasks')->selectRaw('...')->get();
}

// ✅ Com cache
public function getMetrics()
{
    return Cache::remember('metrics', now()->addHour(), function () {
        return DB::table('tasks')->selectRaw('...')->get();
    });
}
```

---

## 3. Melhorias de UX

### Feedback Visual

```
/claude "Adicione feedback visual em:

1. Loading states durante requisições
2. Toast notifications para sucesso/erro
3. Confirmação para ações destrutivas
4. Indicadores de progresso
5. Mensagens de erro claras e acionáveis

Use Alpine + Tailwind."
```

### Exemplo Alpine

```html
<div x-data="{
    loading: false,
    message: '',
    messageType: '',

    async save() {
        this.loading = true;
        try {
            await $refs.form.submit();
            this.showMessage('Salvo com sucesso!', 'success');
        } catch (e) {
            this.showMessage('Erro ao salvar', 'error');
        } finally {
            this.loading = false;
        }
    },

    showMessage(msg, type) {
        this.message = msg;
        this.messageType = type;
        setTimeout(() => this.message = '', 3000);
    }
}">
    <!-- Form aqui -->
</div>
```

---

## 4. Accessibilidade (a11y)

### Prompt para a11y

```
/claude "Audite acessibilidade:

1. Atributos ARIA em componentes interativos
2. Labels em todos os inputs
3. Navegação por teclado (tabindex)
4. Contraste de cores (WCAG AA)
5. Screen reader friendly

Use recursos do Alpine e Tailwind."
```

### Checklist

```html
<!-- ✅ Acessível -->
<button
    type="button"
    aria-label="Fechar modal"
    @click="close"
    class="p-2 hover:bg-gray-100"
>
    <span aria-hidden="true">&times;</span>
</button>

<!-- ❅ Inacessível -->
<div @click="close" class="close-x">&times;</div>
```

---

## 5. Internacionalização (i18n)

### Preparação

```
/claude "Prepare o projeto para i18n:

1. Extrair strings para lang/
2. Usar __('key') ou @lang('key')
3. Criar pt_BR como default
4. Preparar estrutura para en_US
5. Datas com formatos locais"
```

### Exemplo

```php
// ❅ String hardcoded
return response()->json(['message' => 'Tarefa criada com sucesso']);

// ✅ i18n ready
return response()->json([
    'message' => __('tasks.created_success')
]);
```

```php
// lang/pt_BR/tasks.php
return [
    'created_success' => 'Tarefa criada com sucesso',
    'updated_success' => 'Tarefa atualizada',
    'deleted' => 'Tarefa removida',
];
```

---

## 6. Documentação de Código

### Prompt para Docblocks

```
/claude "Adicione docblocks PHPDoc:

1. Apenas em métodos públicos complexos
2. Descreva parâmetros com @param
3. Retornos com @return
4. Exceções com @throws
5. Não documente o óbvio

Siga PSR-5."
```

### Exemplo

```php
/**
 * Atualiza o status de uma tarefa com validações.
 *
 * @param  int  $taskId  ID da tarefa
 * @param  string  $newStatus  Novo status (deve ser válido)
 * @return TaskResource
 * @throws \Illuminate\Auth\Access\AuthorizationException
 * @throws \Illuminate\Database\Eloquent\ModelNotFoundException
 */
public function updateStatus(int $taskId, string $newStatus): TaskResource
{
    Gate::authorize('updateStatus', $this->task);

    $task = $this->repository->findOrFail($taskId);
    $task->status = TaskStatus::from($newStatus);
    $task->save();

    return new TaskResource($task);
}
```

---

## 7. Configuração e Ambientes

### Environment-Specific

```
/claude "Crie configurações:

1. config/project.php com settings customizados
2. Diferentes comportamentos por env
3. Valores defaults sensatos
4. Documentação no .env.example

Exemplo: limite de tarefas por página, timeout de cache, etc."
```

### Exemplo

```php
// config/project.php
return [
    'tasks' => [
        'per_page' => env('TASKS_PER_PAGE', 15),
        'max_per_page' => 100,
        'default_status' => 'todo',
    ],
    'cache' => [
        'metrics_ttl' => env('METRICS_CACHE_TTL', 3600),
    ],
];
```

---

## 8. Error Handling

### Custom Exceptions

```
/claude "Crie exceptions customizadas:

1. Domain exceptions (TaskAlreadyCompletedException)
2. Handlers específicos por tipo
3. Mensagens user-friendly
4. Log de debug em background

Renderize JSON para API, views para web."
```

### Exemplo

```php
// app/Exceptions/TaskException.php
class TaskAlreadyCompletedException extends \Exception
{
    public function report()
    {
        \Log::info('Task already completed', [
            'task_id' => $this->taskId,
            'user_id' => auth()->id(),
        ]);
    }

    public function render($request)
    {
        return $request->expectsJson()
            ? response()->json([
                'message' => 'Esta tarefa já foi concluída',
                'error' => 'task_already_completed'
            ], 422)
            : back()->with('error', 'Tarefa já concluída');
    }
}
```

---

## 9. Logging

### Estrutura de Logs

```
/claude "Adicione logging estratégico:

1. Events de domínio (TaskCreated, TaskCompleted)
2. Erros de negócio (não exceptions)
3. Performance de queries lentas
4. Auth/Authorization failures

Use channels apropriados (daily, stack)."
```

### Exemplo

```php
// App\Logging\TasksLogger
class TasksLogger
{
    public function logCreated(Task $task): void
    {
        Log::channel('tasks')->info('Task created', [
            'id' => $task->id,
            'title' => $task->title,
            'assigned_to' => $task->assigned_to,
            'created_by' => auth()->id(),
        ]);
    }
}
```

---

## 10. Validação Final

### Checklist de Produção

```bash
# 1. Limpar cache
php artisan config:clear
php artisan route:clear
php artisan view:clear

# 2. Otimizar
php artisan config:cache
php artisan route:cache
php artisan view:cache

# 3. Permissões
chmod -R 755 storage bootstrap/cache

# 4. Testar
php artisan test --parallel

# 5. Build assets (se Vite)
npm run build
```

---

## Saída Esperada

- [ ] Código refatorado
- [ ] Queries otimizadas
- [ ] UX melhorada
- [ ] Acessibilidade básica
- [ ] Logs estruturados
- [ ] Documentação essencial
- [ ] Pronto para testes

---

**Versão**: 1.0
**Data**: 2025-03-18

**Próxima**: [07-testes.md](./07-testes.md)
