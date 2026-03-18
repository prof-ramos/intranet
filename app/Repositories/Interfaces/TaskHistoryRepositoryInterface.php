<?php

namespace App\Repositories\Interfaces;

use Illuminate\Database\Eloquent\Collection;

interface TaskHistoryRepositoryInterface
{
    public function getByTaskId(int $taskId): Collection;

    public function create(array $data);
}
