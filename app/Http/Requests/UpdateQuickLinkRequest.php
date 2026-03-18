<?php

namespace App\Http\Requests;

class UpdateQuickLinkRequest extends StoreQuickLinkRequest
{
    public function authorize(): bool
    {
        return true;
    }
}
