@props(['notice'])

<div x-data="{ open: false }" class="bg-white rounded-lg shadow p-4 mb-4 border border-gray-200">
    <div class="flex justify-between items-center cursor-pointer" @click="open = !open">
        <div>
            <span class="text-xs font-semibold px-2 py-1 rounded inline-block mb-1 bg-{{ $notice->status->color() }}-100 text-{{ $notice->status->color() }}-800">
                {{ $notice->status->label() }}
            </span>
            <h3 class="text-lg font-bold text-gray-800">{{ $notice->title }}</h3>
        </div>
        <div>
            <svg class="w-5 h-5 text-gray-500 transition-transform duration-200" :class="{ 'rotate-180': open }" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
    </div>

    <div x-show="open" x-collapse x-cloak class="mt-4 pt-4 border-t border-gray-100">
        <p class="text-sm text-gray-600 mb-2">{{ $notice->content }}</p>
        <div class="text-xs text-gray-400 flex justify-between">
            <span>Publicado em: {{ $notice->published_at ? $notice->published_at->format('d/m/Y H:i') : 'N/A' }}</span>
            <button @click.stop="$dispatch('open-modal', 'edit-notice-{{ $notice->id }}')" class="text-blue-600 hover:underline">Editar</button>
        </div>
    </div>
</div>
