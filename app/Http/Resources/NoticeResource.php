<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Notice
 */
class NoticeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'content' => $this->content,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'published_at' => $this->published_at,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
        ];
    }
}
