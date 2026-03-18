<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ContactController extends Controller
{
    /**
     * Lista todos os contatos com filtros opcionais.
     */
    public function index(ContactRequest $request): AnonymousResourceCollection
    {
        $query = Contact::query();

        // Filtros
        if ($request->has('category')) {
            $query->byCategory($request->category);
        }

        if ($request->has('search')) {
            $query->search($request->search);
        }

        if ($request->boolean('active_only', false)) {
            $query->active();
        }

        $contacts = $query->with('tasks')->orderByDesc('created_at')->paginate(20);

        return ContactResource::collection($contacts);
    }

    /**
     * Exibe os detalhes de um contato específico.
     */
    public function show(Contact $contact): ContactResource
    {
        return new ContactResource($contact->load('tasks'));
    }

    /**
     * Cria um novo contato.
     */
    public function store(ContactRequest $request): ContactResource
    {
        $contact = Contact::create($request->validated());

        return new ContactResource($contact);
    }

    /**
     * Atualiza um contato existente.
     */
    public function update(ContactRequest $request, Contact $contact): ContactResource
    {
        $contact->update($request->validated());

        return new ContactResource($contact->load('tasks'));
    }

    /**
     * Remove um contato (soft delete).
     */
    public function destroy(Contact $contact): JsonResponse
    {
        $contact->delete();

        return response()->json(['message' => 'Contato removido com sucesso.']);
    }
}
