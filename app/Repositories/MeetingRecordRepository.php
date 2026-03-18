<?php

namespace App\Repositories;

use App\Models\MeetingRecord;
use App\Repositories\Interfaces\MeetingRecordRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class MeetingRecordRepository implements MeetingRecordRepositoryInterface
{
    public function __construct(protected MeetingRecord $model) {}

    public function getAll(): Collection
    {
        return $this->model->with(['recordedBy', 'relatedTask', 'relatedContact'])->latest()->get();
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
        $record = $this->findById($id);
        $record->update($data);

        return $record;
    }

    public function delete(int $id): bool
    {
        return $this->findById($id)->delete();
    }
}
