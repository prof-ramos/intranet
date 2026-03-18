<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Kanban de Tarefas') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                <div class="p-6 text-gray-900">
                    <p class="mb-4 text-sm text-gray-600">Arraste os cards (dados simulados) entre as colunas.</p>

                    <div class="flex gap-4 overflow-x-auto pb-4" x-data="kanbanBoard()">
                        <!-- TODO Column -->
                        <div class="w-80 flex-shrink-0 bg-gray-50 rounded-lg p-3">
                            <h3 class="font-bold mb-3 text-gray-700">A Fazer</h3>
                            <div class="space-y-3 sortable-list min-h-[50px]" data-status="todo">
                                <div class="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-move">
                                    <div class="text-xs font-bold text-red-600 mb-1">[URGENTE] Atualizar Contratos</div>
                                    <div class="text-sm">Responsável: João</div>
                                    <div class="text-xs text-gray-500 mt-2">Prazo: Amanhã</div>
                                </div>
                            </div>
                        </div>

                        <!-- Progress Column -->
                        <div class="w-80 flex-shrink-0 bg-gray-50 rounded-lg p-3">
                            <h3 class="font-bold mb-3 text-gray-700">Em Progresso</h3>
                            <div class="space-y-3 sortable-list min-h-[50px]" data-status="progress">
                                <div class="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-move">
                                    <div class="text-xs font-bold text-blue-600 mb-1">[ALTA] Revisar Política</div>
                                    <div class="text-sm">Responsável: Maria</div>
                                    <div class="text-xs text-gray-500 mt-2">Prazo: 20/03</div>
                                </div>
                            </div>
                        </div>

                        <!-- Review Column -->
                        <div class="w-80 flex-shrink-0 bg-gray-50 rounded-lg p-3">
                            <h3 class="font-bold mb-3 text-gray-700">Em Revisão</h3>
                            <div class="space-y-3 sortable-list min-h-[50px]" data-status="review">
                                <!-- empty -->
                            </div>
                        </div>

                        <!-- Done Column -->
                        <div class="w-80 flex-shrink-0 bg-gray-50 rounded-lg p-3">
                            <h3 class="font-bold mb-3 text-gray-700">Concluído</h3>
                            <div class="space-y-3 sortable-list min-h-[50px]" data-status="done">
                                <div class="bg-white p-3 rounded shadow-sm border border-gray-200 opacity-75 cursor-move">
                                    <div class="text-xs font-bold text-green-600 mb-1">[NORMAL] Reunião Diretoria</div>
                                    <div class="text-sm">Responsável: Todos</div>
                                    <div class="text-xs text-gray-500 mt-2">Finalizado ontem</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- CDN do SortableJS -->
    <script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>
    <script>
        document.addEventListener('alpine:init', () => {
            Alpine.data('kanbanBoard', () => ({
                init() {
                    const lists = document.querySelectorAll('.sortable-list');
                    lists.forEach(list => {
                        new Sortable(list, {
                            group: 'shared',
                            animation: 150,
                            ghostClass: 'bg-indigo-50',
                            onEnd: function (evt) {
                                // Exemplo de como interceptar mudanças no futuro (Fase 2):
                                const newStatus = evt.to.dataset.status;
                                console.log('Item movido para:', newStatus);
                            },
                        });
                    });
                }
            }))
        })
    </script>
</x-app-layout>
