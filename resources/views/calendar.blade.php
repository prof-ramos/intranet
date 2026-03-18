<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Calendário de Prazos') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900">
                    <div id="calendar"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- CDN do FullCalendar -->
    <script src='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js'></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            var calendarEl = document.getElementById('calendar');
            var calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                locale: 'pt-br',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,listWeek'
                },
                events: [
                    {
                        title: 'Atualizar Contratos (Urgente)',
                        start: new Date().toISOString().split('T')[0],
                        color: '#ef4444' // red-500
                    },
                    {
                        title: 'Revisar Política',
                        start: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
                        color: '#3b82f6' // blue-500
                    }
                ]
            });
            calendar.render();
        });
    </script>
</x-app-layout>
