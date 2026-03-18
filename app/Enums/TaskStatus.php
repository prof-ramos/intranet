<?php

namespace App\Enums;

enum TaskStatus: string
{
    case Todo = 'todo';
    case InProgress = 'progress';
    case Review = 'review';
    case Done = 'done';
    case Blocked = 'blocked';

    /**
     * Retorna o rótulo traduzido para exibição na UI.
     */
    public function label(): string
    {
        return match ($this) {
            self::Todo => 'A Fazer',
            self::InProgress => 'Em Progresso',
            self::Review => 'Em Revisão',
            self::Done => 'Concluída',
            self::Blocked => 'Bloqueada',
        };
    }
}
