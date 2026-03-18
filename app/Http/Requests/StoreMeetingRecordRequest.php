<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMeetingRecordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'meeting_date' => 'required|date',
            'recorded_by' => 'required|exists:users,id',
            'related_task_id' => 'nullable|exists:tasks,id',
            'related_contact_id' => 'nullable|exists:contacts,id',
        ];
    }
}
