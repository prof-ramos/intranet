<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Recurso para métricas do dashboard.
 */
class MetricsResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'tasks' => [
                'total' => $this->resource['tasks_total'] ?? 0,
                'todo' => $this->resource['tasks_todo'] ?? 0,
                'in_progress' => $this->resource['tasks_progress'] ?? 0,
                'in_review' => $this->resource['tasks_review'] ?? 0,
                'done' => $this->resource['tasks_done'] ?? 0,
                'blocked' => $this->resource['tasks_blocked'] ?? 0,
                'overdue' => $this->resource['tasks_overdue'] ?? 0,
                'due_this_week' => $this->resource['tasks_due_week'] ?? 0,
            ],
            'contacts' => [
                'total' => $this->resource['contacts_total'] ?? 0,
                'active' => $this->resource['contacts_active'] ?? 0,
                'by_category' => $this->resource['contacts_by_category'] ?? [],
            ],
            'users' => [
                'total' => $this->resource['users_total'] ?? 0,
            ],
        ];
    }
}
