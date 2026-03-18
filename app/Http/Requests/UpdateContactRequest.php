<?php

namespace App\Http\Requests;

class UpdateContactRequest extends StoreContactRequest
{
    public function authorize(): bool
    {
        return true;
    }
}
