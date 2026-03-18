<?php

namespace App\Repositories;

use App\Models\Notice;
use App\Repositories\Interfaces\NoticeRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class NoticeRepository implements NoticeRepositoryInterface
{
    public function __construct(protected Notice $model) {}

    public function getActiveAndPublished(): Collection
    {
        return $this->model->active()->published()->latest()->with('createdBy')->get();
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
        $notice = $this->findById($id);
        $notice->update($data);

        return $notice;
    }

    public function delete(int $id): bool
    {
        return $this->findById($id)->delete();
    }
}
