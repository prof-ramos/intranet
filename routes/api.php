<?php

use App\Http\Controllers\ContactController;
use App\Http\Controllers\MetricsController;
use App\Http\Controllers\TaskController;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Rotas da API REST para consumo pelo frontend.
|
*/

Route::middleware('auth')->group(function () {
    // Tarefas
    Route::apiResource('tasks', TaskController::class);
    Route::patch('tasks/{task}/status', [TaskController::class, 'updateStatus'])->name('tasks.updateStatus');
    Route::post('tasks/{task}/complete', [TaskController::class, 'complete'])->name('tasks.complete');

    // Contatos
    Route::apiResource('contacts', ContactController::class);

    // Métricas do dashboard
    Route::get('/metrics', [MetricsController::class, 'index'])->name('metrics.index');

    // Usuários (para seleção em dropdowns)
    Route::get('/users', function () {
        return UserResource::collection(
            User::select('id', 'name', 'email')->get()
        );
    })->name('users.index');
});
