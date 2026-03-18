<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('meeting_records', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->dateTime('meeting_date');

            $table->foreignId('recorded_by')->constrained('users')->restrictOnDelete();

            $table->foreignId('related_task_id')->nullable()->constrained('tasks')->nullOnDelete();

            $table->foreignId('related_contact_id')->nullable()->constrained('contacts')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('meeting_records');
    }
};
