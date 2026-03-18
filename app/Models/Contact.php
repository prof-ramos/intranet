<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property string $name
 * @property string|null $email
 * @property string|null $phone
 * @property string $category
 * @property string|null $institution
 * @property string|null $notes
 * @property bool $active
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 *
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Task> $tasks
 */
class Contact extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'category',
        'institution',
        'notes',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Tarefas relacionadas a este contato.
     */
    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'related_contact_id');
    }

    /**
     * Escopo para contatos ativos.
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Escopo para filtrar por categoria.
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Escopo para busca por nome.
     */
    public function scopeSearch($query, string $term)
    {
        return $query->where('name', 'like', "%{$term}%");
    }
}
