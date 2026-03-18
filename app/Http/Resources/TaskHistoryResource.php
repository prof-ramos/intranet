<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\TaskHistory
 */
class TaskHistoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'user_id' => $this->user_id,
            'from_status' => $this->from_status,
            'to_status' => $this->to_status,
            'note' => $this->note,
            'created_at' => $this->created_at,
        ];
    }
}
