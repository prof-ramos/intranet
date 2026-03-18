<?php

namespace App\Services;

use App\Repositories\Interfaces\MeetingRecordRepositoryInterface;

class MeetingRecordService
{
    public function __construct(
        protected MeetingRecordRepositoryInterface $repository
    ) {}

    public function listAll()
    {
        return $this->repository->getAll();
    }

    public function createRecord(array $data)
    {
        return $this->repository->create($data);
    }

    public function updateRecord(int $id, array $data)
    {
        return $this->repository->update($id, $data);
    }

    public function deleteRecord(int $id): bool
    {
        return $this->repository->delete($id);
    }
}
