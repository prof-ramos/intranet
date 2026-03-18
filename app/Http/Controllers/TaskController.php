<?php

namespace App\Http\Controllers;

use App\Enums\TaskStatus;
use App\Http\Requests\TaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class TaskController extends Controller
{
    /**
     * Lista todas as tarefas com filtros opcionais.
     */
    public function index(TaskRequest $request): AnonymousResourceCollection
    {
        $query = Task::with(['assignedTo', 'createdBy', 'relatedContact']);

        // Filtros
        if ($request->has('status')) {
            $query->byStatus(TaskStatus::from($request->status));
        }

        if ($request->has('priority')) {
            $query->byPriority($request->priority);
        }

        if ($request->boolean('overdue', false)) {
            $query->overdue();
        }

        if ($request->boolean('due_this_week', false)) {
            $query->dueThisWeek();
        }

        // Apenas tarefas do usuário ou não atribuídas
        if (! $request->user()->isAdmin()) {
            $query->where(function ($q) {
                $q->where('assigned_to', Auth::id())
                    ->orWhere('created_by', Auth::id())
                    ->orWhereNull('assigned_to');
            });
        }

        $tasks = $query->orderByDesc('created_at')->paginate(15);

        return TaskResource::collection($tasks);
    }

    /**
     * Exibe os detalhes de uma tarefa específica.
     */
    public function show(Task $task): TaskResource
    {
        Gate::authorize('view', $task);

        return new TaskResource($task->load(['assignedTo', 'createdBy', 'relatedContact', 'history.user']));
    }

    /**
     * Cria uma nova tarefa.
     */
    public function store(TaskRequest $request): TaskResource
    {
        Gate::authorize('create', Task::class);

        $task = Task::create($request->validated() + [
            'created_by' => Auth::id(),
            'status' => TaskStatus::Todo,
        ]);

        return new TaskResource($task->load(['assignedTo', 'createdBy', 'relatedContact']));
    }

    /**
     * Atualiza uma tarefa existente.
     */
    public function update(TaskRequest $request, Task $task): TaskResource
    {
        Gate::authorize('update', $task);

        $task->update($request->validated());

        return new TaskResource($task->load(['assignedTo', 'createdBy', 'relatedContact']));
    }

    /**
     * Atualiza o status de uma tarefa.
     */
    public function updateStatus(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $validated = $request->validate([
            'status' => ['required', Rule::enum(TaskStatus::class)],
        ]);

        $task->update($validated);

        return response()->json([
            'message' => 'Status atualizado com sucesso.',
            'task' => new TaskResource($task->load(['assignedTo', 'createdBy', 'relatedContact'])),
        ]);
    }

    /**
     * Marca uma tarefa como concluída.
     */
    public function complete(Task $task): JsonResponse
    {
        Gate::authorize('complete', $task);

        $task->update(['status' => TaskStatus::Done]);

        return response()->json(['message' => 'Tarefa concluída com sucesso.']);
    }

    /**
     * Remove uma tarefa.
     */
    public function destroy(Task $task): JsonResponse
    {
        Gate::authorize('delete', $task);

        $task->delete();

        return response()->json(['message' => 'Tarefa removida com sucesso.']);
    }
}
