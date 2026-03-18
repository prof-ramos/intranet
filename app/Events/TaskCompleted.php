<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Evento disparado quando uma tarefa é marcada como concluída.
 */
class TaskCompleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Cria uma nova instância do evento.
     */
    public function __construct(
        public Task $task
    ) {}
}
