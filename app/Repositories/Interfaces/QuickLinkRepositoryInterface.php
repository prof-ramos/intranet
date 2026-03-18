<?php

namespace App\Repositories\Interfaces;

use Illuminate\Database\Eloquent\Collection;

interface QuickLinkRepositoryInterface
{
    public function getAllOrdered(): Collection;

    public function findById(int $id);

    public function create(array $data);

    public function update(int $id, array $data);

    public function delete(int $id): bool;
}
