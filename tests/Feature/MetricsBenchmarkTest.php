<?php

use App\Models\User;
use Illuminate\Support\Facades\Cache;

test('metrics endpoint executa em menos de 200ms com cache hit', function () {
    // Warm up cache
    $this->actingAs(User::factory()->create())
        ->getJson('/api/metrics')
        ->assertStatus(200);

    // Medir tempo com cache
    $start = microtime(true);

    $this->actingAs(User::factory()->create())
        ->getJson('/api/metrics')
        ->assertStatus(200);

    $duration = (microtime(true) - $start) * 1000;

    expect($duration)->toBeLessThan(200);
});

test('metrics endpoint executa em menos de 500ms sem cache', function () {
    Cache::flush();

    $start = microtime(true);

    $this->actingAs(User::factory()->create())
        ->getJson('/api/metrics')
        ->assertStatus(200);

    $duration = (microtime(true) - $start) * 1000;

    // Se estiver em ambiente local rodando rápido, pode ser ainda menor que 500ms
    expect($duration)->toBeLessThan(500);
});
