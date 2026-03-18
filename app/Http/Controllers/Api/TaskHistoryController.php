<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskHistoryRequest;
use App\Http\Resources\TaskHistoryResource;
use App\Models\TaskHistory;
use App\Services\TaskHistoryService;
use Illuminate\Http\Request;

class TaskHistoryController extends Controller
{
    public function __construct(protected TaskHistoryService $service) {}

    public function index(Request $request)
    {
        $request->validate(['task_id' => 'required|exists:tasks,id']);

        return TaskHistoryResource::collection($this->service->getHistoryForTask($request->task_id));
    }

    public function store(StoreTaskHistoryRequest $request)
    {
        $history = $this->service->recordHistory($request->validated());

        return TaskHistoryResource::make($history);
    }

    public function show(TaskHistory $taskHistory)
    {
        return TaskHistoryResource::make($taskHistory);
    }
}
