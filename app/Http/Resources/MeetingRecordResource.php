<?php

namespace App\Http\Resources;

use App\Models\MeetingRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin MeetingRecord
 */
class MeetingRecordResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'meeting_date' => $this->meeting_date,
            'recorded_by' => $this->recorded_by,
            'related_task_id' => $this->related_task_id,
            'related_contact_id' => $this->related_contact_id,
            'created_at' => $this->created_at,
        ];
    }
}
