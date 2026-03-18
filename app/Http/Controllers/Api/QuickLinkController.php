<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQuickLinkRequest;
use App\Http\Requests\UpdateQuickLinkRequest;
use App\Http\Resources\QuickLinkResource;
use App\Models\QuickLink;
use App\Services\QuickLinkService;

class QuickLinkController extends Controller
{
    public function __construct(protected QuickLinkService $service) {}

    public function index()
    {
        return QuickLinkResource::collection($this->service->listOrdered());
    }

    public function store(StoreQuickLinkRequest $request)
    {
        $link = $this->service->createLink($request->validated());

        return QuickLinkResource::make($link);
    }

    public function show(QuickLink $quickLink)
    {
        return QuickLinkResource::make($quickLink);
    }

    public function update(UpdateQuickLinkRequest $request, QuickLink $quickLink)
    {
        $link = $this->service->updateLink($quickLink->id, $request->validated());

        return QuickLinkResource::make($link);
    }

    public function destroy(QuickLink $quickLink)
    {
        $this->service->deleteLink($quickLink->id);

        return response()->noContent();
    }
}
