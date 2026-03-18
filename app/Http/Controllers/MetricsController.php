<?php

namespace App\Http\Controllers;

use App\Http\Resources\MetricsResource;
use App\Services\MetricsService;

class MetricsController extends Controller
{
    public function __construct(
        protected MetricsService $metrics
    ) {}

    public function index(): MetricsResource
    {
        return new MetricsResource(
            $this->metrics->getDashboardMetrics()
        );
    }
}
