# Template para Criar Model Laravel

## Instruções

Quando precisar criar um Model Laravel, use este template para garantir consistência e melhores práticas.

## Contexto do Projeto

- **Framework**: Laravel 11.x
- **Banco de Dados**: MySQL/PostgreSQL
- **Padrões de Nomes**: PascalCase para classes, snake_case para tabelas/migrations
- **Enums**: Use Enums do Laravel para status, prioridades, tipos
- **Testes**: Use Pest com Factories

## Estrutura de Criação

Ao criar um Model, sempre gere em ordem:

1. **Migration** primeiro (para definir estrutura)
2. **Factory** segundo (para dados de teste)
3. **Model** terceiro (para usar as estruturas definidas)

## Padrões de Migration

### Regras Obrigatórias

- Use `$table->id()` para primary keys
- Use `$table->timestamps()` para created_at/updated_at
- Use `$table->foreignId('user_id')->constrained()` para FKs
- Use `$table->softDeletes()` se necessário
- Adicione indexes em colunas usadas em queries frequentemente

### Exemplo de Migration

```php
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->boolean('active')->default(true);
            $table->timestamps();
            
            // Indexes para performance
            $table->index(['name', 'active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
```

## Padrões de Factory

### Regras Obrigatórias

- Use `$this->faker` para dados realistas
- Defina todos os campos required do Model
- Use arrays ou estados para variações de dados
- Valide relações com dados existentes

### Exemplo de Factory

```php
public function definition(): array
{
    return [
        'name' => $this->faker->unique()->word(),
        'slug' => str()->slug($this->faker->word()),
        'active' => $this->faker->boolean(80), // 80% de chance de ser true
    ];
}
```

## Padrões de Model

### Regras Obrigatórias

- Use type hints em todos os métodos e propriedades
- Defina `$fillable` para mass assignment
- Defina `$casts` para conversão automática de tipos
- Use Enums para campos de status/prioridade/tipo
- Defina relacionamentos com métodos tipados
- Use scopes para queries comuns

### Exemplo Completo de Model

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Enums\CategoryStatus;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
        'status' => CategoryStatus::class,
    ];

    // Relacionamentos
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    // Scopes
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('active', true);
    }

    public function scopeInactive(Builder $query): Builder
    {
        return $query->where('active', false);
    }

    // Helpers
    public function isActive(): bool
    {
        return $this->active;
    }
}
```

## Uso de Enums

Para campos de status/prioridade, use Enums do Laravel:

```php
<?php

namespace App\Enums;

enum CategoryStatus: string
{
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
    case ARCHIVED = 'archived';
}
```

## Comandos de Geração

```bash
# Migration
php artisan make:migration create_categories_table

# Model com migration
php artisan make:model Category -m

# Factory
php artisan make:factory CategoryFactory --model=Category
```

## Checklist de Validação

Após criar um Model, verifique:

- [ ] Migration criada com estrutura correta
- [ ] Factory criada com dados realistas
- [ ] Model tem type hints
- [ ] Model tem $fillable definido
- [ ] Model tem $casts definido
- [ ] Relacionamentos têm return types
- [ ] Enums usados para status/prioridade/tipo
- [ ] Scopes definidos para queries comuns
- [ ] Migration executada: `php artisan migrate`
- [ ] Teste unitário criado para o Model

## Exemplos de Uso

### Criar Category com Enum e Relacionamentos

```
Crie model Category com:
- Migration: name (string), slug (unique string), active (boolean, default true)
- Factory: dados realistas usando faker
- Model: com type hints, casts, scopes (active/inactive)
- Use Enum CategoryStatus se necessário
- Relacionamento: hasMany Task
```

### Criar Tag com Polymorphic Relation

```
Crie model Tag com:
- Migration: name (string), color (hex string)
- Factory: dados realistas
- Model: com morphs para polimorfismo
- Relacionamento: morphedByMany com Task