<?php

namespace App\Repositories;

use App\Models\QuickLink;
use App\Repositories\Interfaces\QuickLinkRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class QuickLinkRepository implements QuickLinkRepositoryInterface
{
    public function __construct(protected QuickLink $model) {}

    public function getAllOrdered(): Collection
    {
        return $this->model->active()->ordered()->get();
    }

    public function findById(int $id)
    {
        return $this->model->findOrFail($id);
    }

    public function create(array $data)
    {
        return $this->model->create($data);
    }

    public function update(int $id, array $data)
    {
        $link = $this->findById($id);
        $link->update($data);

        return $link;
    }

    public function delete(int $id): bool
    {
        return $this->findById($id)->delete();
    }
}
