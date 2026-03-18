<?php

namespace App\Services;

use App\Repositories\Interfaces\ContactRepositoryInterface;

class ContactService
{
    public function __construct(
        protected ContactRepositoryInterface $repository
    ) {}

    public function listActive()
    {
        return $this->repository->getAllActive();
    }

    public function createContact(array $data)
    {
        return $this->repository->create($data);
    }

    public function updateContact(int $id, array $data)
    {
        return $this->repository->update($id, $data);
    }

    public function deleteContact(int $id): bool
    {
        return $this->repository->delete($id);
    }
}
