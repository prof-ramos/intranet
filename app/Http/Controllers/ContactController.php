<?php

namespace App\Http\Controllers;

use App\Http\Requests\ContactRequest;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class ContactController extends Controller
{
    /**
     * Lista todos os contatos com filtros opcionais.
     */
    public function index(ContactRequest $request): AnonymousResourceCollection
    {
        $query = Contact::query();

        if (! Auth::user()->isAdmin()) {
            $query->where(function ($q) {
                $q->where('created_by', Auth::id())
                    ->orWhereNull('created_by');
            });
        }

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
        Gate::authorize('view', $contact);

        return new ContactResource($contact->load('tasks'));
    }

    /**
     * Cria um novo contato.
     */
    public function store(ContactRequest $request): ContactResource
    {
        Gate::authorize('create', Contact::class);

        $contact = Contact::create($request->validated() + [
            'created_by' => Auth::id(),
        ]);

        return new ContactResource($contact);
    }

    /**
     * Atualiza um contato existente.
     */
    public function update(ContactRequest $request, Contact $contact): ContactResource
    {
        Gate::authorize('update', $contact);

        $contact->update($request->validated());

        return new ContactResource($contact->load('tasks'));
    }

    /**
     * Remove um contato (soft delete).
     */
    public function destroy(Contact $contact): JsonResponse
    {
        Gate::authorize('delete', $contact);

        $contact->delete();

        return response()->json(['message' => 'Contato removido com sucesso.']);
    }
}
