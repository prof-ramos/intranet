<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\QuickLink
 */
class QuickLinkResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'url' => $this->url,
            'icon' => $this->icon,
            'category' => $this->category,
            'active' => $this->active,
            'order' => $this->order,
            'created_at' => $this->created_at,
        ];
    }
}
