<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNoticeRequest;
use App\Http\Requests\UpdateNoticeRequest;
use App\Http\Resources\NoticeResource;
use App\Models\Notice;
use App\Services\NoticeService;

class NoticeController extends Controller
{
    public function __construct(protected NoticeService $service) {}

    public function index()
    {
        return NoticeResource::collection($this->service->listActiveAndPublished());
    }

    public function store(StoreNoticeRequest $request)
    {
        $notice = $this->service->createNotice($request->validated());

        return NoticeResource::make($notice);
    }

    public function show(Notice $notice)
    {
        return NoticeResource::make($notice);
    }

    public function update(UpdateNoticeRequest $request, Notice $notice)
    {
        $notice = $this->service->updateNotice($notice->id, $request->validated());

        return NoticeResource::make($notice);
    }

    public function destroy(Notice $notice)
    {
        $this->service->deleteNotice($notice->id);

        return response()->noContent();
    }
}
