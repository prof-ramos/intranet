<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function () {
        return view('dashboard');
    })->name('dashboard');

    Route::get('/kanban', function () {
        return view('kanban');
    })->name('kanban');

    Route::get('/calendar', function () {
        return view('calendar');
    })->name('calendar');

    // Tarefas
    Route::prefix('tasks')->name('tasks.')->group(function () {
        Route::get('/', function () {
            return view('tasks.index');
        })->name('index');

        Route::get('/create', function () {
            return view('tasks.create');
        })->name('create');

        Route::get('/{id}', function ($id) {
            return view('tasks.show', ['id' => $id]);
        })->name('show');
    });

    // Contatos
    Route::prefix('contacts')->name('contacts.')->group(function () {
        Route::get('/', function () {
            return view('contacts.index');
        })->name('index');

        Route::get('/create', function () {
            return view('contacts.create');
        })->name('create');

        Route::get('/{id}', function ($id) {
            return view('contacts.show', ['id' => $id]);
        })->name('show');
    });
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
