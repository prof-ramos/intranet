<?php

namespace App\Http\Requests;

use App\Enums\NoticeStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreNoticeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'status' => ['required', Rule::enum(NoticeStatus::class)],
            'published_at' => 'nullable|date',
            'created_by' => 'required|exists:users,id',
        ];
    }
}
