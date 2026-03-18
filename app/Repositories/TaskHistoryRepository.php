<?php

namespace App\Repositories;

use App\Models\TaskHistory;
use App\Repositories\Interfaces\TaskHistoryRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class TaskHistoryRepository implements TaskHistoryRepositoryInterface
{
    public function __construct(protected TaskHistory $model) {}

    public function getByTaskId(int $taskId): Collection
    {
        return $this->model->where('task_id', $taskId)->latest()->with(['user', 'task'])->get();
    }

    public function create(array $data)
    {
        return $this->model->create($data);
    }
}
