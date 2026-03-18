<?php

namespace App\Services;

use App\Repositories\Interfaces\QuickLinkRepositoryInterface;

class QuickLinkService
{
    public function __construct(
        protected QuickLinkRepositoryInterface $repository
    ) {}

    public function listOrdered()
    {
        return $this->repository->getAllOrdered();
    }

    public function createLink(array $data)
    {
        return $this->repository->create($data);
    }

    public function updateLink(int $id, array $data)
    {
        return $this->repository->update($id, $data);
    }

    public function deleteLink(int $id): bool
    {
        return $this->repository->delete($id);
    }
}
