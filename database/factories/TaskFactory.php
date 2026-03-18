<?php

namespace Database\Factories;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'assigned_to' => User::inRandomOrder()->first()?->id,
            'created_by' => User::factory(),
            'related_contact_id' => null,
            'deadline' => fake()->optional()->dateTimeBetween('now', '+30 days'),
            'completed_at' => null,
            'status' => fake()->randomElement(TaskStatus::class),
            'priority' => fake()->randomElement(TaskPriority::class),
        ];
    }

    /**
     * Tarefa com status específico.
     */
    public function withStatus(TaskStatus $status): self
    {
        return $this->state(fn (array $attributes) => [
            'status' => $status->value,
        ]);
    }

    /**
     * Tarefa atrasada.
     */
    public function overdue(): self
    {
        return $this->state(fn (array $attributes) => [
            'deadline' => now()->subDays(rand(1, 10)),
            'status' => TaskStatus::Todo,
        ]);
    }
}
