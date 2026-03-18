<?php

namespace App\Http\Resources;

use App\Enums\TaskStatus;
use App\Models\Contact;
use App\Models\Task;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Task
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
            'assigned_to' => $this->when($this->assignedTo !== null, function () {
                /** @var User $user */
                $user = $this->assignedTo;

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ];
            }),
            'created_by' => $this->when($this->createdBy !== null, function () {
                /** @var User $user */
                $user = $this->createdBy;

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ];
            }),
            'related_contact' => $this->when($this->relatedContact !== null, function () {
                /** @var Contact $contact */
                $contact = $this->relatedContact;

                return [
                    'id' => $contact->id,
                    'name' => $contact->name,
                    'category' => $contact->category,
                ];
            }),
            'created_at' => $this->created_at->format('Y-m-d H:i'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i'),
        ];
    }
}
