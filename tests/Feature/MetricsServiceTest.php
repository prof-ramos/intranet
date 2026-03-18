<?php

use App\Enums\TaskStatus;
use App\Models\Contact;
use App\Models\Task;
use App\Services\MetricsService;
use Illuminate\Support\Facades\Cache;

test('retorna metricas calculadas corretamente', function () {
    Task::factory()->create(['status' => TaskStatus::Todo]);
    Task::factory()->create(['status' => TaskStatus::Done]);
    Contact::factory()->create(['category' => 'internal', 'active' => true]);

    $metrics = app(MetricsService::class)->getDashboardMetrics();

    expect($metrics['tasks_total'])->toBe(2)
        ->and($metrics['tasks_todo'])->toBe(1)
        ->and($metrics['tasks_done'])->toBe(1)
        ->and($metrics['contacts_total'])->toBe(1)
        ->and($metrics['contacts_active'])->toBe(1)
        ->and($metrics['contacts_by_category']['internal'])->toBe(1);
});

test('cache é utilizado em chamadas subsequentes', function () {
    $service = app(MetricsService::class);

    $service->clearCache();

    $metrics1 = $service->getDashboardMetrics();

    // Cache should hold the data now
    expect(Cache::has('dashboard:metrics'))->toBeTrue();

    // The second call retrieves from cache
    $metrics2 = $service->getDashboardMetrics();

    expect($metrics1)->toBe($metrics2);
});

test('clearCache limpa o cache', function () {
    $service = app(MetricsService::class);

    $service->getDashboardMetrics();
    expect(Cache::has('dashboard:metrics'))->toBeTrue();

    $service->clearCache();
    expect(Cache::has('dashboard:metrics'))->toBeFalse();
});
