<?php

namespace App\Observers;

use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\TaskHistory;
use Illuminate\Support\Facades\Auth;

/**
 * Observer para registrar histórico de mudanças nas tarefas.
 */
class TaskObserver
{
    /**
     * Escuta quando a tarefa está sendo criada.
     */
    public function creating(Task $task): void
    {
        // Define o criador automaticamente se não estiver definido
        if (empty($task->created_by) && Auth::check()) {
            $task->created_by = Auth::id();
        }
    }

    /**
     * Escuta quando a tarefa é atualizada.
     */
    public function updating(Task $task): void
    {
        // Se mudou de status, registra o histórico
        if ($task->isDirty('status') && Auth::check()) {
            $this->logStatusChange($task);
        }

        // Se foi concluída, registra data de conclusão
        if ($task->isDirty('status') && $task->status === TaskStatus::Done) {
            $task->completed_at = now();
        }
    }

    /**
     * Registra a mudança de status no histórico.
     */
    protected function logStatusChange(Task $task): void
    {
        TaskHistory::create([
            'task_id' => $task->id,
            'user_id' => Auth::id(),
            'from_status' => $task->getOriginal('status'),
            'to_status' => $task->status->value,
        ]);
    }
}
