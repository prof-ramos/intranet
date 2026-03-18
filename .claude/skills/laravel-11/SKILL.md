# Laravel 11 Development Assistant

You are specialized in Laravel 11 development with PHP 8.2+, Alpine.js, and Pest testing.

## Tech Stack

- **Backend**: Laravel 11.x
- **PHP**: 8.2+ (with 8.1+ features: enums, attributes, readonly)
- **Frontend**: Blade + Alpine.js 3.x
- **Testing**: Pest (NOT PHPUnit)
- **Database**: MySQL 8.0+ / PostgreSQL 13+

---

## Key Patterns

### Enum Casting

Always use PHP 8.1+ enums for status/priority fields:

```php
// app/Enums/TaskStatus.php
enum TaskStatus: string
{
    case Todo = 'todo';
    case InProgress = 'progress';
    case Review = 'review';
    case Done = 'done';
    case Blocked = 'blocked';
}

// In Model
protected $casts = [
    'status' => TaskStatus::class,
    'priority' => TaskPriority::class,
];
```

### Observer Registration

Use PHP 8 attributes (no provider registration needed):

```php
use Illuminate\Database\Eloquent\Attributes\ObservedBy;

#[ObservedBy([TaskObserver::class])]
class Task extends Model
{
    // ...
}
```

### Validation

Use inline validation for simple cases:

```php
public function store(Request $request)
{
    $validated = $request->validate([
        'title' => 'required|string|max:255',
        'status' => ['required', Rule::enum(TaskStatus::class)],
        'deadline' => 'required|date|after:now',
    ]);

    return Task::create($validated);
}
```

### Pest Testing

Always use Pest syntax:

```php
use App\Enums\TaskStatus;

test('task can be created', function () {
    $task = Task::factory()->create([
        'status' => TaskStatus::Todo,
    ]);

    expect($task->status)->toBe(TaskStatus::Todo)
        ->and($task->title)->not->toBeEmpty();
});

test('overdue scope returns only overdue tasks', function () {
    Task::factory()->create([
        'deadline' => now()->subDay(),
        'status' => TaskStatus::Todo,
    ]);

    Task::factory()->create([
        'deadline' => now()->addWeek(),
        'status' => TaskStatus::Todo,
    ]);

    expect(Task::overdue()->count())->toBe(1);
});
```

### Query Scopes

Use scopes for common queries:

```php
// In Model
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

// Usage
$overdueTasks = Task::overdue()->get();
```

### Foreign Keys

Always use constrained() for proper foreign keys:

```php
$table->foreignId('assigned_to')
    ->nullable()
    ->constrained('users')
    ->nullOnDelete();

$table->foreignId('created_by')
    ->constrained('users')
    ->cascadeOnDelete();
```

---

## Alpine.js + Blade

Component-based interactivity:

```javascript
// resources/js/alpine/task-kanban.js
export default () => ({
    tasks: [],
    loading: false,

    init() {
        this.fetchTasks();
    },

    async fetchTasks() {
        this.loading = true;
        const response = await fetch('/api/tasks');
        this.tasks = await response.json();
        this.loading = false;
    },

    async updateStatus(taskId, newStatus) {
        await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({status: newStatus})
        });
        this.fetchTasks();
    }
});
```

```blade
{{-- In Blade --}}
<div x-data="taskKanban">
    <template x-if="loading">
        <div>Loading...</div>
    </template>

    <template x-for="task in tasks" :key="task.id">
        <div x-text="task.title"></div>
    </template>
</div>
```

---

## Always Remember

1. **Use Pest NOT PHPUnit** - This project uses Pest testing framework
2. **Use PHP 8.1+ features** - Enums, attributes, readonly properties, constructor property promotion
3. **Follow Laravel 11 simplified structure** - No need for separate FormRequest for simple validation
4. **Use Query Builder over raw SQL** - For database portability (MySQL/PostgreSQL)
5. **Soft deletes are enabled** - Use `withTrashed()` when needed
6. **Observers use PHP 8 attributes** - No manual registration in AppServiceProvider
7. **Keep controllers thin** - Move business logic to Actions or Services
