<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreContactRequest;
use App\Http\Requests\UpdateContactRequest;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use App\Services\ContactService;

class ContactController extends Controller
{
    public function __construct(protected ContactService $service) {}

    public function index()
    {
        return ContactResource::collection($this->service->listActive());
    }

    public function store(StoreContactRequest $request)
    {
        $contact = $this->service->createContact($request->validated());

        return ContactResource::make($contact);
    }

    public function show(Contact $contact)
    {
        return ContactResource::make($contact);
    }

    public function update(UpdateContactRequest $request, Contact $contact)
    {
        $contact = $this->service->updateContact($contact->id, $request->validated());

        return ContactResource::make($contact);
    }

    public function destroy(Contact $contact)
    {
        $this->service->deleteContact($contact->id);

        return response()->noContent();
    }
}
