<?php

namespace App\Observers;

use App\Models\Contact;
use App\Services\MetricsService;

class ContactObserver
{
    public function created(Contact $contact): void
    {
        app(MetricsService::class)->clearCache();
    }

    public function updated(Contact $contact): void
    {
        app(MetricsService::class)->clearCache();
    }

    public function deleted(Contact $contact): void
    {
        app(MetricsService::class)->clearCache();
    }
}
