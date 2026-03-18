<?php

use App\Models\User;

test('dashboard page is displayed', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/dashboard');

    $response->assertOk();
});

test('kanban page is displayed', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/kanban');

    $response->assertOk();
});

test('calendar page is displayed', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->get('/calendar');

    $response->assertOk();
});
