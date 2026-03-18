<?php

use App\Models\Contact;
use App\Models\User;

test('usuário não autorizado não pode visualizar contato de outro', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();

    $contact = Contact::factory()->create(['created_by' => $owner->id]);

    $this->actingAs($other)
        ->getJson("/api/contacts/{$contact->id}")
        ->assertStatus(403);
});

test('admin pode visualizar qualquer contato', function () {
    $admin = User::factory()->create(['email' => 'admin@asof.local']);
    $contact = Contact::factory()->create();

    $this->actingAs($admin)
        ->getJson("/api/contacts/{$contact->id}")
        ->assertStatus(200);
});

test('criador pode atualizar seu contato', function () {
    $user = User::factory()->create();
    $contact = Contact::factory()->create(['created_by' => $user->id]);

    $this->actingAs($user)
        ->patchJson("/api/contacts/{$contact->id}", [
            'name' => 'Atualizado',
            'email' => 'teste@teste.com',
            'category' => 'internal',
            'active' => true,
        ])
        ->assertStatus(200);
});

test('contato do sistema (created_by=null) pode ser visualizado por qualquer um', function () {
    $user = User::factory()->create();
    $contact = Contact::factory()->create(['created_by' => null]);

    $this->actingAs($user)
        ->getJson("/api/contacts/{$contact->id}")
        ->assertStatus(200);
});

test('usuário não pode deletar contato de outro', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();

    $contact = Contact::factory()->create(['created_by' => $owner->id]);

    $this->actingAs($other)
        ->deleteJson("/api/contacts/{$contact->id}")
        ->assertStatus(403);
});
