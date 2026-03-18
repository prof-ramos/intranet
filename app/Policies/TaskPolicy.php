<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

/**
 * Policy de autorização para tarefas.
 */
class TaskPolicy
{
    /**
     * Determina se o usuário pode visualizar a tarefa.
     */
    public function view(User $user, Task $task): bool
    {
        return $task->team?->members->contains($user)
            || $task->assignedTo === $user->id
            || $task->createdBy === $user->id;
    }

    /**
     * Determina se o usuário pode criar tarefas.
     */
    public function create(User $user): bool
    {
        return true; // Qualquer usuários autenticados podem criar
    }

    /**
     * Determina se o usuário pode atualizar a tarefa.
     */
    public function update(User $user, Task $task): bool
    {
        return $task->created_by === $user->id
            || $task->assignedTo === $user->id;
    }

    /**
     * Determina se o usuário pode excluir a tarefa.
     */
    public function delete(User $user, Task $task): bool
    {
        return $task->created_by === $user->id;
    }

    /**
     * Determina se o usuário pode completar a tarefa.
     */
    public function complete(User $user, Task $task): bool
    {
        return $task->assignedTo === $user->id;
    }

    /**
     * Determina se o usuário pode reatribuir a tarefa.
     */
    public function reassign(User $user, Task $task): bool
    {
        return $task->created_by === $user->id;
    }
}
