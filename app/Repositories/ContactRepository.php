<?php

namespace App\Repositories;

use App\Models\Contact;
use App\Repositories\Interfaces\ContactRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class ContactRepository implements ContactRepositoryInterface
{
    public function __construct(protected Contact $model) {}

    public function getAllActive(): Collection
    {
        return $this->model->active()->get();
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
        $contact = $this->findById($id);
        $contact->update($data);

        return $contact;
    }

    public function delete(int $id): bool
    {
        return $this->findById($id)->delete();
    }
}
