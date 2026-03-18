<?php

namespace App\Listeners;

use App\Events\TaskCompleted;
use App\Events\TaskCreated;
use App\Events\TaskStatusChanged;
use Illuminate\Support\Facades\Log;

/**
 * Envia notificações sobre eventos de tarefas.
 *
 * TODO: Implementar notificações reais via email/broadcast.
 */
class SendTaskNotification
{
    /**
     * Handle the event.
     */
    public function handle(TaskCreated|TaskStatusChanged|TaskCompleted $event): void
    {
        $task = $event->task;
        $eventType = $event::class;

        // Log inicial para demonstração
        Log::info("Task notification: {$eventType}", [
            'task_id' => $task->id,
            'title' => $task->title,
            'status' => $task->status->value,
            'assigned_to' => $task->assigned_to,
        ]);

        // TODO: Enviar notificação real quando houver canal definido
        // if ($task->assigned_to && $task->assignedTo) {
        //     $task->assignedTo->notify(new TaskNotification($event));
        // }
    }
}
