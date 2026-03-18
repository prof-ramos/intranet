<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

/**
 * Exceção base para operações de tarefas.
 */
class TaskException extends Exception
{
    /**
     * Reporta exceção como resposta JSON.
     */
    public function render($request): JsonResponse
    {
        return response()->json([
            'error' => 'task_error',
            'message' => $this->getMessage(),
        ], $this->getCode() ?: 422);
    }
}
