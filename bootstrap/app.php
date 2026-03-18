<?php

/*
|--------------------------------------------------------------------------
| Suppress PHP 8.5 Deprecation Warnings
|--------------------------------------------------------------------------
|
| Laravel 11.50.0 uses PDO::MYSQL_ATTR_SSL_CA which is deprecated in
| PHP 8.5. These warnings are emitted before the HTML output, breaking
| page rendering. Remove this when Laravel adds native PHP 8.5 support.
|
*/
error_reporting(E_ALL & ~E_DEPRECATED);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
