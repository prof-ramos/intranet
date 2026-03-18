<?php

use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\User;

test('usuário pode criar uma tarefa', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/tasks', [
        'title' => 'Nova Tarefa',
        'description' => 'Descrição da tarefa',
        'priority' => 'high',
        'deadline' => now()->addDays(7)->toDateTimeString(),
    ]);

    $response->assertCreated();
    $this->assertDatabaseHas('tasks', ['title' => 'Nova Tarefa']);
});

test('usuário pode atualizar status da tarefa', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['created_by' => $user->id]);

    $response = $this->actingAs($user)
        ->patchJson("/api/tasks/{$task->id}", [
            'title' => 'Tarefa Atualizada',
            'priority' => 'high',
            'deadline' => now()->addDays(7)->toDateTimeString(),
            'status' => 'progress',
        ]);

    $response->assertOk();
    expect($task->fresh()->status)->toBe(TaskStatus::InProgress);
});

test('usuário pode atualizar status via endpoint dedicado', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create([
        'created_by' => $user->id,
        'status' => TaskStatus::Todo,
    ]);

    $response = $this->actingAs($user)
        ->patchJson("/api/tasks/{$task->id}/status", [
            'status' => 'review',
        ]);

    $response->assertJson([
        'message' => 'Status atualizado com sucesso.',
    ]);
    expect($task->fresh()->status)->toBe(TaskStatus::Review);
});

test('usuário pode atualizar uma tarefa', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['created_by' => $user->id]);

    $response = $this->actingAs($user)
        ->patchJson("/api/tasks/{$task->id}", [
            'title' => 'Tarefa Atualizada',
            'priority' => 'urgent',
        ]);

    $response->assertOk();
    $this->assertDatabaseHas('tasks', [
        'id' => $task->id,
        'title' => 'Tarefa Atualizada',
        'priority' => 'urgent',
    ]);
});

test('usuário pode deletar uma tarefa', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['created_by' => $user->id]);

    $response = $this->actingAs($user)
        ->deleteJson("/api/tasks/{$task->id}");

    $response->assertJson([
        'message' => 'Tarefa removida com sucesso.',
    ]);
    $this->assertSoftDeleted('tasks', ['id' => $task->id]);
});

test('tarefa atrasada é detectada corretamente', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create([
        'created_by' => $user->id,
        'deadline' => now()->subDays(2),
        'status' => TaskStatus::Todo,
    ]);

    expect($task->isOverdue())->toBeTrue();
});

test('tarefa concluída não é considerada atrasada', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create([
        'created_by' => $user->id,
        'deadline' => now()->subDays(2),
        'status' => TaskStatus::Done,
    ]);

    expect($task->isOverdue())->toBeFalse();
});

test('escopo whereAssignedTo funciona corretamente', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    Task::factory()->create(['assigned_to' => $user->id]);
    Task::factory()->create(['assigned_to' => $otherUser->id]);
    Task::factory()->create(['assigned_to' => null]);

    $userTasks = Task::whereAssignedTo($user->id)->get();
    expect($userTasks)->toHaveCount(1);
    expect($userTasks->first()->assigned_to)->toBe($user->id);
});

test('escopo whereCreatedBy funciona corretamente', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    Task::factory()->create(['created_by' => $user->id]);
    Task::factory()->create(['created_by' => $otherUser->id]);

    $userTasks = Task::whereCreatedBy($user->id)->get();
    expect($userTasks)->toHaveCount(1);
    expect($userTasks->first()->created_by)->toBe($user->id);
});

test('histórico de tarefa retorna registros ordenados', function () {
    $user = User::factory()->create();
    $task = Task::factory()->create(['created_by' => $user->id]);

    // Atualizar status múltiplas vezes via API para gerar histórico
    $this->actingAs($user)
        ->patchJson("/api/tasks/{$task->id}/status", ['status' => 'progress']);

    $this->actingAs($user)
        ->patchJson("/api/tasks/{$task->id}/status", ['status' => 'review']);

    $history = $task->fresh()->history;
    expect($history)->toHaveCount(2);
    expect($history->first()->to_status)->toBe('review');
});
