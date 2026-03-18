<?php

namespace App\Http\Requests;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Request de validação para criação/edição de tarefas.
 */
class TaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'assigned_to' => ['nullable', 'exists:users,id'],
            'related_contact_id' => ['nullable', 'exists:contacts,id'],
            'deadline' => ['required', 'date', 'after:now'],
            'priority' => ['required', Rule::enum(TaskPriority::class)],
        ];

        // Na edição, status pode ser alterado
        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $rules['status'] = ['nullable', Rule::enum(TaskStatus::class)];
            $rules['deadline'] = ['nullable', 'date', 'after:now'];
        }

        return $rules;
    }

    public function messages(): array
    {
        return [
            'title.required' => 'O título é obrigatório.',
            'title.max' => 'O título não pode ter mais que 255 caracteres.',
            'deadline.required' => 'O prazo é obrigatório.',
            'deadline.after' => 'O prazo deve ser uma data futura.',
            'priority.required' => 'A prioridade é obrigatória.',
            'assigned_to.exists' => 'O usuário selecionado não existe.',
            'related_contact_id.exists' => 'O contato selecionado não existe.',
        ];
    }

    public function attributes(): array
    {
        return [
            'title' => 'Título',
            'description' => 'Descrição',
            'assigned_to' => 'Atribuído a',
            'related_contact_id' => 'Contato Relacionado',
            'deadline' => 'Prazo',
            'priority' => 'Prioridade',
            'status' => 'Status',
        ];
    }
}
