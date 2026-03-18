<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Contact
 */
class ContactResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'category' => $this->category,
            'institution' => $this->institution,
            'notes' => $this->notes,
            'active' => $this->active,
            'tasks_count' => $this->whenCounted('tasks'),
            'tasks' => TaskResource::collection($this->whenLoaded('tasks')),
            'created_at' => $this->created_at->format('Y-m-d H:i'),
            'updated_at' => $this->updated_at->format('Y-m-d H:i'),
        ];
    }
}
