<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMeetingRecordRequest;
use App\Http\Requests\UpdateMeetingRecordRequest;
use App\Http\Resources\MeetingRecordResource;
use App\Models\MeetingRecord;
use App\Services\MeetingRecordService;

class MeetingRecordController extends Controller
{
    public function __construct(protected MeetingRecordService $service) {}

    public function index()
    {
        return MeetingRecordResource::collection($this->service->listAll());
    }

    public function store(StoreMeetingRecordRequest $request)
    {
        $record = $this->service->createRecord($request->validated());

        return MeetingRecordResource::make($record);
    }

    public function show(MeetingRecord $meetingRecord)
    {
        return MeetingRecordResource::make($meetingRecord->load(['recordedBy', 'relatedTask', 'relatedContact']));
    }

    public function update(UpdateMeetingRecordRequest $request, MeetingRecord $meetingRecord)
    {
        $record = $this->service->updateRecord($meetingRecord->id, $request->validated());

        return MeetingRecordResource::make($record);
    }

    public function destroy(MeetingRecord $meetingRecord)
    {
        $this->service->deleteRecord($meetingRecord->id);

        return response()->noContent();
    }
}
