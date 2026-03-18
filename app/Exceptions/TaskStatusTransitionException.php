<?php

namespace App\Exceptions;

use App\Enums\TaskStatus;

/**
 * Exceção lançada quando uma transição de status é inválida.
 */
class TaskStatusTransitionException extends TaskException
{
    public function __construct(
        private readonly TaskStatus $from,
        private readonly TaskStatus $to,
    ) {
        parent::__construct(
            "Não é possível mudar de {$from->label()} para {$to->label()}"
        );
    }

    public function getFrom(): TaskStatus
    {
        return $this->from;
    }

    public function getTo(): TaskStatus
    {
        return $this->to;
    }
}
