<?php

namespace App\Providers;

use App\Repositories\ContactRepository;
use App\Repositories\Interfaces\ContactRepositoryInterface;
use App\Repositories\Interfaces\MeetingRecordRepositoryInterface;
use App\Repositories\Interfaces\NoticeRepositoryInterface;
use App\Repositories\Interfaces\QuickLinkRepositoryInterface;
use App\Repositories\Interfaces\TaskHistoryRepositoryInterface;
use App\Repositories\MeetingRecordRepository;
use App\Repositories\NoticeRepository;
use App\Repositories\QuickLinkRepository;
use App\Repositories\TaskHistoryRepository;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            ContactRepositoryInterface::class,
            ContactRepository::class
        );
        $this->app->bind(
            TaskHistoryRepositoryInterface::class,
            TaskHistoryRepository::class
        );
        $this->app->bind(
            MeetingRecordRepositoryInterface::class,
            MeetingRecordRepository::class
        );
        $this->app->bind(
            NoticeRepositoryInterface::class,
            NoticeRepository::class
        );
        $this->app->bind(
            QuickLinkRepositoryInterface::class,
            QuickLinkRepository::class
        );
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
