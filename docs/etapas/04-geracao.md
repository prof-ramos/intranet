# Etapa 3 — Geração de Código com IA

> **Tempo estimado**: 4-8 horas
> **Saída**: Código base funcional (gerado por IA, orquestrado por você)

---

## Filosofia

> **"Você é o maestro, a IA é a orquestra."**

Seu trabalho: pedir código certo, na ordem certa, validar o que chega.

---

## Estratégia de Geração

### Ordem Recomendada

```text
1. Database (Migrations)
2. Models (com Enums)
3. Repositories
4. Services
5. Controllers
6. Requests/Responses
7. Views (Blade)
8. Frontend (Alpine)
9. Testes
```text

**Por quê?** Cada passo depende do anterior. A IA mantém contexto se você gerar em sequência.

---

## 1. Database — Migrations

### Prompt Template

```text
/claude "Crie migration para [ENTIDADE].

Requisitos:
- Schema::create com Blueprint
- foreignId() com constrained()
- indexes para campos frequentemente consultados
-timestamps() e softDeletes() onde aplicável

Use a última sintaxe do Laravel 11."
```

### Exemplo Prático

```text
/claude "Crie as migrations na seguinte ordem:

1. users (estendida com role, active)
2. contacts
3. tasks
4. task_history
5. meeting_records
6. notices
7. quick_links

Para cada migration:
- Siga a ordem de dependências
- Use onDelete apropriado
- Adicione indexes compostos quando fizer sentido
- Inclua comentários inline explicando foreign keys

Execute php artisan migrate:fresh após criar."
```text

### Validação das Migrations

```bash
# Testar migrations
php artisan migrate:fresh

# Verificar estrutura
php artisan db:show --counts --views

# Conferir foreign keys
php artisan db:table tasks
```

---

## 2. Models e Enums

### Prompt para Enums

```text
/claude "Crie PHP 8.1 enums para:

1. TaskStatus (todo, progress, review, done, blocked)
2. TaskPriority (low, normal, high, urgent)
3. NoticeStatus (draft, active, archived)

Requisitos:
- Backed enums (string)
- Namespace: App\Enums
- Method labels() para exibição em pt_BR"
```text

### Exemplo de Enum Gerado

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

    public function label(): string
    {
        return match($this) {
            self::Todo => 'A Fazer',
            self::InProgress => 'Em Progresso',
            self::Review => 'Em Revisão',
            self::Done => 'Concluído',
            self::Blocked => 'Bloqueado',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::Todo => 'gray',
            self::InProgress => 'blue',
            self::Review => 'yellow',
            self::Done => 'green',
            self::Blocked => 'red',
        };
    }
}
```

### Prompt para Models

```text
/claude "Crie model [NOME] com:

1. Propriedades: fillable, casts (com enum casting)
2. Relacionamentos: belongsTo, hasMany, etc.
3. Scopes úteis (active, overdue, etc.)
4. Accessors/Mutators se necessário
5. Método de busca com filter()

Use type hints, return types, e PHP 8.2 features."
```text

### Validação dos Models

```php
// Testar rapidamente
$t = Task::factory()->create();
$t->status = TaskStatus::Done;
$t->save();
dd($t->status); // Deve mostrar enum
```

---

## 3. Repositories

### Prompt Padrão

```text
/claude "Crie [Nome]Repository:

1. Implemente [Nome]RepositoryInterface
2. Use construtor com Model injetado
3. Implemente todos os métodos da interface
4. Adicione métodos de busca com filtros dinâmicos

Use Eloquent, não Query Builder direto."
```text

### Validação do Repository

```php
// Teste rápido
$repo = app(TaskRepositoryInterface::class);
$tasks = $repo->getOverdue();
dd($tasks);
```

---

## 4. Services

### Prompt para Services

```text
/claude "Crie [Nome]Service:

1. Injete RepositoryInterface no construtor
2. Métodos ORQUESTRAM múltiplas chamadas
3. Dispatch Events quando apropriado
4. Retornem Resources, não models crus

Exemplo: createTask() deve:
- validar
- criar via repository
- dispatch TaskCreated
- retornar TaskResource"
```text

---

## 5. Controllers

### Prompt para Controllers

```text
/claude "Crie [Nome]Controller:

1. Type hint de Service no construtor
2. Métodos REST padrão: index, store, show, update, destroy
3. FormRequest validation
4. JSON responses com Resources
5. Tratamento de exceções

Siga convenções Laravel 11."
```

### Exemplo de Controller Gerado

```php
class TaskController extends Controller
{
    public function __construct(
        private TaskService $service
    ) {}

    public function index(IndexTaskRequest $request)
    {
        $tasks = $this->service->listTasks(
            status: $request->status,
            assignedTo: $request->assigned_to,
        );
        return TaskResource::collection($tasks);
    }

    public function store(StoreTaskRequest $request)
    {
        $task = $this->service->createTask($request);
        return TaskResource::make($task)
            ->additional(['message' => 'Tarefa criada']);
    }
}
```text

---

## 6. Views (Blade)

### Prompt para Layout

```text
/claude "Crie layout base:

1. Extends app.blade.php
2. Sections: title, content, scripts
3. Stack para scripts específicos
4. Diretivas personalizadas (@active, @selected)

Use Tailwind para estilização."
```

### Prompt para Componentes

```text
/claude "Crie componentes Blade:

1. components/task/card.blade.php
2. components/task/modal.blade.php
3. components/kanban/column.blade.php

Cada componente:
- Recebe props ($task, $status, etc.)
- Renderiza HTML + Alpine data
- Emite eventos Alpine $dispatch"
```text

---

## 7. Frontend (Alpine.js)

### Prompt para Alpine

```text
/claude "Crie componente Alpine para [FEATURE]:

1. data() com estado inicial
2. init() para carregar dados
3. Métodos para ações (save, delete, etc.)
4. Computed properties via getter
5. Watchers para reatividade

Use sintaxe moderna Alpine 3.x."
```

### Exemplo: Kanban Board

```javascript
// resources/js/kanban.js
document.addEventListener('alpine:init', () => {
  Alpine.data('kanban', () => ({
    tasks: [],
    columns: ['todo', 'progress', 'review', 'done'],

    async init() {
      const response = await fetch('/api/tasks')
      this.tasks = await response.json()
    },

    get tasksByStatus() {
      return this.columns.map((status) => ({
        status,
        tasks: this.tasks.filter((t) => t.status === status),
      }))
    },

    async onDrop(taskId, newStatus) {
      await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
    },
  }))
})
```text

---

## 8. Factories e Seeders

### Prompt para Factories

```text
/claude "Crie factory para [MODEL]:

1. Definition com dados realistas em pt_BR
2. Faker para lorem, names, dates
3. Estados (states) para diferentes cenários
4. Relacionamentos via callback

Use afterMaking() para lógica pós-criação."
```

### Validação das Factories

```bash
php artisan db:seed --class=TaskSeeder
php artisan tinker
>>> Task::count();
>>> Task::factory()->count(10)->create();
```text

---

## 9. Validação Incremental

### Teste Enquanto Gera

```bash
# Após cada bloco gerado:
1. Commit "feat: add migrations"
2. Teste: php artisan migrate:fresh
3. Commit "feat: add models"
4. Teste: php artisan tinker (criar instância)
5. Commit "feat: add repositories"
6. Teste: App::make(Repo::class)->all()
```

### Checklist por Entidade

- [ ] Migration criada e testada
- [ ] Enum criado
- [ ] Model com relacionamentos
- [ ] Factory funcionando
- [ ] Repository implementado
- [ ] Service criado
- [ ] Controller com requests
- [ ] Rotas funcionando
- [ ] View/component Blade
- [ ] Frontend Alpine (se aplicável)

---

## Comandos Úteis

### Batch Operations

```text
/claude "Crie tudo para ENTIDADE [nome]:

1. Migration + Model + Factory
2. Repository + Service + Controller
3. FormRequest (store/update)
4. API Resource
5. Routes

Gere arquivo por arquivo. Espere eu validar antes do próximo."
```text

### Iteração Rápida

```text
/claude "O erro foi: [COLAR ERRO]

Corrija:
1. O problema específico
2. Não reescreva tudo
3. Apenas o necessário"
```

---

## Saída Esperada

- [ ] Todas migrations executando
- [ ] Models com enums funcionando
- [ ] CRUD básico funcionando
- [ ] Ao menos 10 registros criados via factory
- [ ] Endpoint JSON retornando dados
- [ ] Página Blade renderizando

---

## Dicas de Ouro

### ✓ Faça

- Gere em blocos pequenos
- Commit após cada bloco funcionando
- Teste manualmente cada endpoint
- Use tinker para validar models
- Peça refatoração após gerar

### ✗ Evite

- Gerar tudo de uma vez
- Aceitar código sem testar
- Pular factories (essenciais para testes)
- Esquecer de commits intermediários
- Ignorar avisos da IA

---

**Versão**: 1.0
**Data**: 2025-03-18

**Próxima**: [05-revisao.md](./05-revisao.md)
