<?php

namespace App\Http\Requests;

class UpdateNoticeRequest extends StoreNoticeRequest
{
    public function authorize(): bool
    {
        return true;
    }
}
