<?php

namespace App\Events;

use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Evento disparado quando o status de uma tarefa é alterado.
 */
class TaskStatusChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Cria uma nova instância do evento.
     */
    public function __construct(
        public Task $task,
        public TaskStatus $fromStatus,
        public TaskStatus $toStatus,
        public ?User $user = null
    ) {}
}
