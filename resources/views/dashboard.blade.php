<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ __('Dashboard Principal') }}
        </h2>
    </x-slot>

    <div class="py-12">
        <div class="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
            <!-- KPIs -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-6 shadow-sm sm:rounded-lg border-l-4 border-indigo-500">
                    <div class="text-sm font-medium text-gray-500 truncate">Tarefas Abertas</div>
                    <div class="mt-1 text-3xl font-semibold text-gray-900">12</div>
                </div>
                <div class="bg-white p-6 shadow-sm sm:rounded-lg border-l-4 border-red-500">
                    <div class="text-sm font-medium text-gray-500 truncate">Tarefas Atrasadas</div>
                    <div class="mt-1 text-3xl font-semibold text-gray-900">3</div>
                </div>
                <div class="bg-white p-6 shadow-sm sm:rounded-lg border-l-4 border-green-500">
                    <div class="text-sm font-medium text-gray-500 truncate">Cumprimento Prazo</div>
                    <div class="mt-1 text-3xl font-semibold text-gray-900">85%</div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Avisos -->
                <div class="bg-white shadow-sm sm:rounded-lg">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Avisos Recentes</h3>
                    </div>
                    <div class="p-6">
                        <ul class="space-y-4">
                            <li class="flex items-start">
                                <span class="flex-shrink-0 h-6 w-6 text-yellow-500">⚠️</span>
                                <p class="ml-3 text-sm text-gray-600">Revisão do PDI na próxima semana.</p>
                            </li>
                            <li class="flex items-start">
                                <span class="flex-shrink-0 h-6 w-6 text-blue-500">ℹ️</span>
                                <p class="ml-3 text-sm text-gray-600">Novos documentos adicionados no Google Drive.</p>
                            </li>
                        </ul>
                    </div>
                </div>

                <!-- Links Rápidos -->
                <div class="bg-white shadow-sm sm:rounded-lg">
                    <div class="p-6 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">Links Rápidos</h3>
                    </div>
                    <div class="p-6">
                        <div class="grid grid-cols-2 gap-4">
                            <a href="#" class="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                Google Docs
                            </a>
                            <a href="#" class="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                Google Sheets
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</x-app-layout>
