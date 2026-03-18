<?php

namespace App\Repositories\Interfaces;

use Illuminate\Database\Eloquent\Collection;

interface NoticeRepositoryInterface
{
    public function getActiveAndPublished(): Collection;

    public function findById(int $id);

    public function create(array $data);

    public function update(int $id, array $data);

    public function delete(int $id): bool;
}
