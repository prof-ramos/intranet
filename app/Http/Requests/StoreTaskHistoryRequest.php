<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTaskHistoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'task_id' => 'required|exists:tasks,id',
            'user_id' => 'required|exists:users,id',
            'from_status' => 'nullable|string|max:50',
            'to_status' => 'required|string|max:50',
            'note' => 'nullable|string',
        ];
    }
}
