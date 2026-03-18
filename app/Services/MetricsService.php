<?php

namespace App\Services;

use App\Enums\TaskStatus;
use App\Models\Contact;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\Cache;

class MetricsService
{
    public function getDashboardMetrics(): array
    {
        return Cache::remember('dashboard:metrics', 300, function () {
            return $this->calculateMetrics();
        });
    }

    protected function calculateMetrics(): array
    {
        // Query agregada única para tarefas
        $taskMetrics = Task::query()
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as todo,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as progress,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as review,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as done,
                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as blocked,
                SUM(CASE WHEN deadline < ? AND status != ? THEN 1 ELSE 0 END) as overdue,
                SUM(CASE WHEN deadline BETWEEN ? AND ? THEN 1 ELSE 0 END) as due_week
            ', [
                TaskStatus::Todo->value,
                TaskStatus::InProgress->value,
                TaskStatus::Review->value,
                TaskStatus::Done->value,
                TaskStatus::Blocked->value,
                now(),
                TaskStatus::Done->value,
                now()->startOfWeek(),
                now()->endOfWeek(),
            ])
            ->first();

        // Query agregada única para contatos
        $contactMetrics = Contact::query()
            ->selectRaw('
                COUNT(*) as total,
                SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN category = ? THEN 1 ELSE 0 END) as institutional,
                SUM(CASE WHEN category = ? THEN 1 ELSE 0 END) as internal,
                SUM(CASE WHEN category = ? THEN 1 ELSE 0 END) as external
            ', ['institutional', 'internal', 'external'])
            ->first();

        return [
            'tasks_total' => (int) ($taskMetrics->total ?? 0),
            'tasks_todo' => (int) ($taskMetrics->todo ?? 0),
            'tasks_progress' => (int) ($taskMetrics->progress ?? 0),
            'tasks_review' => (int) ($taskMetrics->review ?? 0),
            'tasks_done' => (int) ($taskMetrics->done ?? 0),
            'tasks_blocked' => (int) ($taskMetrics->blocked ?? 0),
            'tasks_overdue' => (int) ($taskMetrics->overdue ?? 0),
            'tasks_due_week' => (int) ($taskMetrics->due_week ?? 0),
            'contacts_total' => (int) ($contactMetrics->total ?? 0),
            'contacts_active' => (int) ($contactMetrics->active ?? 0),
            'contacts_by_category' => [
                'institutional' => (int) ($contactMetrics->institutional ?? 0),
                'internal' => (int) ($contactMetrics->internal ?? 0),
                'external' => (int) ($contactMetrics->external ?? 0),
            ],
            'users_total' => User::count(),
        ];
    }

    public function clearCache(): void
    {
        Cache::forget('dashboard:metrics');
    }
}
