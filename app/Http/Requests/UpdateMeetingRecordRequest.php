<?php

namespace App\Http\Requests;

class UpdateMeetingRecordRequest extends StoreMeetingRecordRequest
{
    public function authorize(): bool
    {
        return true;
    }
}
