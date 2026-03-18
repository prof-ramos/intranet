<?php

namespace App\Exceptions;

/**
 * Exceção lançada quando uma tarefa não é encontrada.
 */
class TaskNotFoundException extends TaskException
{
    public function __construct(int $taskId)
    {
        parent::__construct("Tarefa #{$taskId} não encontrada.");
    }
}
