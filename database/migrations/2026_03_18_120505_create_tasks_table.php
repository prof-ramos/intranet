<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();

            $table->foreignId('assigned_to')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('created_by')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('related_contact_id')
                ->nullable()
                ->constrained('contacts')
                ->nullOnDelete();

            $table->dateTime('deadline')->nullable();
            $table->dateTime('completed_at')->nullable();

            $table->string('status')->default('todo'); // todo, progress, review, done, blocked
            $table->string('priority')->default('normal'); // low, normal, high, urgent

            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('priority');
            $table->index('deadline');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
