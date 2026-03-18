<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Request de validação para criação/edição de contatos.
 */
class ContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'category' => ['required', 'in:institutional,internal,external'],
            'institution' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'O nome é obrigatório.',
            'email.email' => 'O email deve ser válido.',
            'category.required' => 'A categoria é obrigatória.',
            'category.in' => 'A categoria deve ser: institutional, internal ou external.',
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'Nome',
            'email' => 'E-mail',
            'phone' => 'Telefone',
            'category' => 'Categoria',
            'institution' => 'Instituição',
            'notes' => 'Observações',
            'active' => 'Ativo',
        ];
    }
}
