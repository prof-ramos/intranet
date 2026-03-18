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
        Schema::table('tasks', function (Blueprint $table) {
            // Índice composto para consultas de tarefas atrasadas por status
            $table->index(['status', 'deadline'], 'tasks_status_deadline_index');

            // Índice composto para consultas de tarefas por usuário e status
            $table->index(['assigned_to', 'status'], 'tasks_assigned_status_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropIndex('tasks_status_deadline_index');
            $table->dropIndex('tasks_assigned_status_index');
        });
    }
};
