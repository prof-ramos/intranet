<?php

use App\Http\Controllers\ContactController;
use App\Http\Controllers\TaskController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Rotas da API REST para consumo pelo frontend.
|
*/

Route::middleware('auth:sanctum')->group(function () {
    // Tarefas
    Route::apiResource('tasks', TaskController::class);
    Route::post('tasks/{task}/complete', [TaskController::class, 'complete'])->name('tasks.complete');

    // Contatos
    Route::apiResource('contacts', ContactController::class);

    // Métricas do dashboard
    Route::get('/metrics', function () {
        $tasks = \App\Models\Task::query();
        $contacts = \App\Models\Contact::query();

        return new \App\Http\Resources\MetricsResource([
            'tasks_total' => (clone $tasks)->count(),
            'tasks_todo' => (clone $tasks)->byStatus(\App\Enums\TaskStatus::Todo)->count(),
            'tasks_progress' => (clone $tasks)->byStatus(\App\Enums\TaskStatus::Progress)->count(),
            'tasks_review' => (clone $tasks)->byStatus(\App\Enums\TaskStatus::Review)->count(),
            'tasks_done' => (clone $tasks)->byStatus(\App\Enums\TaskStatus::Done)->count(),
            'tasks_blocked' => (clone $tasks)->byStatus(\App\Enums\TaskStatus::Blocked)->count(),
            'tasks_overdue' => (clone $tasks)->overdue()->count(),
            'tasks_due_week' => (clone $tasks)->dueThisWeek()->count(),
            'contacts_total' => $contacts->count(),
            'contacts_active' => $contacts->active()->count(),
            'contacts_by_category' => [
                'institutional' => $contacts->byCategory('institutional')->count(),
                'internal' => $contacts->byCategory('internal')->count(),
                'external' => $contacts->byCategory('external')->count(),
            ],
            'users_total' => \App\Models\User::count(),
        ]);
    })->name('metrics.index');

    // Usuários (para seleção em dropdowns)
    Route::get('/users', function () {
        return \App\Http\Resources\UserResource::collection(
            \App\Models\User::select('id', 'name', 'email')->get()
        );
    })->name('users.index');
});
