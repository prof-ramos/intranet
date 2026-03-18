@props(['contact'])

<div class="bg-white rounded-lg shadow p-4 border border-gray-200 flex flex-col h-full">
    <div class="flex items-center justify-between mb-3">
        <h3 class="text-md font-bold text-gray-800">{{ $contact->name }}</h3>
        @if($contact->active)
            <span class="w-2 h-2 rounded-full bg-green-500" title="Ativo"></span>
        @else
            <span class="w-2 h-2 rounded-full bg-red-500" title="Inativo"></span>
        @endif
    </div>

    <div class="text-sm text-gray-600 flex-1 space-y-1">
        @if($contact->organization)
            <p><span class="font-semibold">Org:</span> {{ $contact->organization }}</p>
        @endif
        @if($contact->role)
            <p><span class="font-semibold">Cargo:</span> {{ $contact->role }}</p>
        @endif
        @if($contact->email)
            <p class="text-blue-600"><a href="mailto:{{ $contact->email }}">{{ $contact->email }}</a></p>
        @endif
        @if($contact->phone)
            <p class="text-gray-500">{{ $contact->phone }}</p>
        @endif
    </div>

    <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end">
        <button x-data @click="$dispatch('open-contact-modal', {{ $contact->id }})" class="text-sm text-blue-600 hover:text-blue-800">
            Detalhes
        </button>
    </div>
</div>
