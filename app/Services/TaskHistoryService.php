<?php

namespace App\Services;

use App\Repositories\Interfaces\TaskHistoryRepositoryInterface;

class TaskHistoryService
{
    public function __construct(
        protected TaskHistoryRepositoryInterface $repository
    ) {}

    public function getHistoryForTask(int $taskId)
    {
        return $this->repository->getByTaskId($taskId);
    }

    public function recordHistory(array $data)
    {
        return $this->repository->create($data);
    }
}
