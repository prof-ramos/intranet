<?php

namespace App\Listeners;

use App\Events\TaskCompleted;
use App\Events\TaskStatusChanged;
use App\Models\TaskHistory;
use Illuminate\Support\Facades\Auth;

/**
 * Registra mudanças de status no histórico da tarefa.
 */
class LogTaskHistory
{
    /**
     * Handle the event.
     */
    public function handle(TaskStatusChanged|TaskCompleted $event): void
    {
        $fromStatus = $event instanceof TaskStatusChanged
            ? $event->fromStatus->value
            : $event->task->getOriginal('status');

        $toStatus = $event->task->status->value;

        TaskHistory::create([
            'task_id' => $event->task->id,
            'user_id' => Auth::id() ?? $event->task->created_by,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
        ]);
    }
}
