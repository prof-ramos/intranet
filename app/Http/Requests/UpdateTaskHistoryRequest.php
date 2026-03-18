<?php

namespace App\Http\Requests;

class UpdateTaskHistoryRequest extends StoreTaskHistoryRequest
{
    public function authorize(): bool
    {
        return true;
    }
}
