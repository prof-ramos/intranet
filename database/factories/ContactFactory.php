<?php

namespace Database\Factories;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ContactFactory extends Factory
{
    protected $model = Contact::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'category' => fake()->randomElement(['institutional', 'internal', 'external']),
            'institution' => fake()->company(),
            'notes' => fake()->sentence(),
            'active' => true,
            'created_by' => User::factory(),
        ];
    }
}
