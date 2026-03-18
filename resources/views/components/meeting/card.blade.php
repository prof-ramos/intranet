@props(['meeting'])

<div class="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
    <div class="flex justify-between items-start mb-2">
        <h4 class="font-bold text-gray-800">{{ $meeting->title }}</h4>
        <span class="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {{ $meeting->meeting_date->format('d/m/Y') }}
        </span>
    </div>

    @if($meeting->description)
        <p class="text-sm text-gray-600 mb-3 line-clamp-2">{{ $meeting->description }}</p>
    @endif

    <div class="flex flex-wrap gap-2 mt-2">
        @if($meeting->relatedTask)
            <span class="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                Ref: Tarefa #{{ $meeting->relatedTask->id }}
            </span>
        @endif

        @if($meeting->relatedContact)
            <span class="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded">
                Com: {{ $meeting->relatedContact->name }}
            </span>
        @endif
    </div>

    <div class="mt-3 flex justify-end">
        <a href="{{ route('meetings.show', $meeting->id) }}" class="text-sm text-blue-600 hover:underline">
            Ver Ata Completa
        </a>
    </div>
</div>
