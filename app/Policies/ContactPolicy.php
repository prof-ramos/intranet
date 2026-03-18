<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;

/**
 * Policy de autorização para contatos.
 */
class ContactPolicy
{
    /**
     * Determina se o usuário pode visualizar o contato.
     * Dono, admin, ou contatos do sistema (created_by=null) podem ver.
     */
    public function view(User $user, Contact $contact): bool
    {
        return $contact->created_by === $user->id
            || $contact->created_by === null
            || $user->isAdmin();
    }

    /**
     * Determina se o usuário pode criar contatos.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determina se o usuário pode atualizar o contato.
     * Dono ou admin podem atualizar.
     */
    public function update(User $user, Contact $contact): bool
    {
        return $contact->created_by === $user->id
            || $user->isAdmin();
    }

    /**
     * Determina se o usuário pode excluir o contato.
     * Dono ou admin podem excluir.
     */
    public function delete(User $user, Contact $contact): bool
    {
        return $contact->created_by === $user->id
            || $user->isAdmin();
    }
}
