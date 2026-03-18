<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $task_id
 * @property int $user_id
 * @property string $from_status
 * @property string $to_status
 * @property string|null $note
 * @property Carbon $created_at
 * @property-read Task $task
 * @property-read User $user
 */
class TaskHistory extends Model
{
    protected $table = 'task_history';

    protected $fillable = ['task_id', 'user_id', 'from_status', 'to_status', 'note'];

    /**
     * Tarefa relacionada a este histórico.
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * Usuário que fez a mudança.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Escopo para filtrar histórico de uma tarefa específica.
     */
    public function scopeForTask($query, int $taskId)
    {
        return $query->where('task_id', $taskId)->orderByDesc('created_at');
    }
}
