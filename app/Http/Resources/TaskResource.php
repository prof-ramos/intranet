<?php

namespace App\Http\Resources;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Task
 */
class TaskResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'status' => [
                'value' => $this->status->value,
                'label' => $this->status->label(),
            ],
            'priority' => [
                'value' => $this->priority->value,
                'label' => $this->priority->label(),
            ],
            'deadline' => $this->deadline?->format('Y-m-d H:i'),
            'completed_at' => $this->completed_at?->format('Y-m-d H:i'),
            'is_overdue' => $this->deadline?->isPast() && $this->status !== TaskStatus::Done,
            'assigned_to' => $this->when($this->assignedTo, function () {
                return [
                    'id' => $this->assignedTo->id,
                    'name' => $this->assignedTo->name,
                    'email' => $this->assignedTo->email,
                ];
            }),
            'created_by' => $this->when($this->createdBy, function () {
                return [
                    'id' => $this->createdBy->id,
                    'name' => $this->createdBy->name,
                    'email' => $this->createdBy->email,
                ];
            }),
            'related_contact' => $this->when($this->relatedContact, function () {
                return [
                    'id' => $this->relatedContact->id,
                    'name' => $this->relatedContact->name,
                    'category' => $this->relatedContact->category,
                ];
            }),
            'created_at' => $this->created_at->format('Y-m-d H:i'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i'),
        ];
    }
}
