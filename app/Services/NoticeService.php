<?php

namespace App\Services;

use App\Repositories\Interfaces\NoticeRepositoryInterface;

class NoticeService
{
    public function __construct(
        protected NoticeRepositoryInterface $repository
    ) {}

    public function listActiveAndPublished()
    {
        return $this->repository->getActiveAndPublished();
    }

    public function createNotice(array $data)
    {
        return $this->repository->create($data);
    }

    public function updateNotice(int $id, array $data)
    {
        return $this->repository->update($id, $data);
    }

    public function deleteNotice(int $id): bool
    {
        return $this->repository->delete($id);
    }
}
