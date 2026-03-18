<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Evento disparado quando uma tarefa é criada.
 */
class TaskCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Cria uma nova instância do evento.
     */
    public function __construct(
        public Task $task
    ) {}
}
