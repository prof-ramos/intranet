'use client';

import { useState, useEffect } from 'react';
import { LABEL_PRESETS } from '@/lib/labels/presets';
import { LabelItem } from '@/lib/labels/types';
import { fetchAssociatesForLabels } from './actions';
import { Search } from 'lucide-react';

export default function EtiquetasPage() {
  const [presetId, setPresetId] = useState('pimaco-a4054-approx');
  const [startPosition, setStartPosition] = useState(0);
  const [drawDebugGrid, setDrawDebugGrid] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [associates, setAssociates] = useState<LabelItem[]>([]);
  const [selectedAssociatesMap, setSelectedAssociatesMap] = useState<Map<string, LabelItem>>(new Map());
  const [isLoadingAssociates, setIsLoadingAssociates] = useState(false);

  const presetsList = Object.values(LABEL_PRESETS);

  useEffect(() => {
    const fetchAssociates = async () => {
      setIsLoadingAssociates(true);
      try {
        const data = await fetchAssociatesForLabels(searchQuery);
        setAssociates(data);
      } catch (err) {
        console.error('Error fetching associates:', err);
      } finally {
        setIsLoadingAssociates(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchAssociates();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleToggleSelect = (associate: LabelItem) => {
    const newMap = new Map(selectedAssociatesMap);
    if (newMap.has(associate.id)) {
      newMap.delete(associate.id);
    } else {
      newMap.set(associate.id, associate);
    }
    setSelectedAssociatesMap(newMap);
  };

  const handleSelectAll = () => {
    // Check if all currently visible associates are already selected
    const allVisibleSelected = associates.every((a) => selectedAssociatesMap.has(a.id));

    const newMap = new Map(selectedAssociatesMap);

    if (allVisibleSelected) {
      // Deselect all visible
      associates.forEach((a) => newMap.delete(a.id));
    } else {
      // Select all visible
      associates.forEach((a) => newMap.set(a.id, a));
    }

    setSelectedAssociatesMap(newMap);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    if (selectedAssociatesMap.size === 0) {
      setError('Selecione ao menos um associado para gerar as etiquetas.');
      setLoading(false);
      return;
    }

    try {
      const itemsToPrint = Array.from(selectedAssociatesMap.values());

      const response = await fetch('/api/labels/pimaco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId,
          startPosition,
          drawDebugGrid,
          items: itemsToPrint,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao gerar PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiquetas-${presetId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Geração de Etiquetas</h1>

      <div className="bg-base-200 p-6 rounded-lg shadow-sm mb-6 space-y-4">
        <div>
          <label className="label font-semibold">Modelo da Etiqueta</label>
          <select 
            className="select select-bordered w-full max-w-xs" 
            value={presetId} 
            onChange={(e) => setPresetId(e.target.value)}
          >
            {presetsList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <div className="text-xs text-warning mt-1">
            <strong>Atenção:</strong> Sempre imprima uma página de teste para calibrar a impressora.
          </div>
        </div>

        <div>
          <label className="label font-semibold">Posição Inicial (0-indexado)</label>
          <input 
            type="number" 
            className="input input-bordered w-full max-w-xs" 
            value={startPosition}
            min={0}
            onChange={(e) => setStartPosition(Number(e.target.value))}
          />
          <div className="text-xs opacity-70 mt-1">Pule as etiquetas que já foram usadas na folha.</div>
        </div>

        <div className="form-control w-full max-w-xs">
          <label className="cursor-pointer label justify-start gap-4">
            <span className="label-text font-semibold">Desenhar Grade de Teste (Debug)</span>
            <input 
              type="checkbox" 
              className="checkbox checkbox-primary" 
              checked={drawDebugGrid}
              onChange={(e) => setDrawDebugGrid(e.target.checked)}
            />
          </label>
          <div className="text-xs opacity-70 mt-1">Desenha uma borda vermelha ao redor da área de cada etiqueta para facilitar o alinhamento.</div>
        </div>

        <div className="mt-8 pt-4 border-t border-base-300">
          <h2 className="text-lg font-semibold mb-4">Selecionar Associados</h2>

          <div className="flex gap-2 items-center mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
              <input
                type="text"
                placeholder="Buscar por nome..."
                className="input input-bordered w-full pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {isLoadingAssociates && (
              <span className="loading loading-spinner loading-sm text-primary"></span>
            )}
          </div>

          <div className="flex justify-between items-center mb-2">
            <button
              className="btn btn-xs btn-outline"
              onClick={handleSelectAll}
              disabled={associates.length === 0}
            >
              {associates.length > 0 && associates.every((a) => selectedAssociatesMap.has(a.id)) ? 'Limpar Visíveis' : 'Selecionar Visíveis'}
            </button>
            <span className="text-sm font-medium">
              {selectedAssociatesMap.size} selecionado(s)
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto border border-base-300 rounded-lg bg-base-100">
            {associates.length === 0 && !isLoadingAssociates ? (
              <div className="p-4 text-center text-sm text-base-content/70">
                Nenhum associado encontrado.
              </div>
            ) : (
              <ul className="divide-y divide-base-300">
                {associates.map((associate) => (
                  <li key={associate.id} className="p-2 hover:bg-base-200 transition-colors flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm mt-1"
                      checked={selectedAssociatesMap.has(associate.id)}
                      onChange={() => handleToggleSelect(associate)}
                    />
                    <div>
                      <div className="font-medium text-sm">{associate.name}</div>
                      <div className="text-xs text-base-content/70">
                        {associate.line1} {associate.line1 && associate.line2 && ' • '} {associate.line2}
                      </div>
                      {associate.line3 && (
                        <div className="text-xs text-base-content/50 mt-0.5">{associate.line3}</div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-error mt-4">
            <span>{error}</span>
          </div>
        )}

        <button 
          className="btn btn-primary mt-4" 
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? 'Gerando PDF...' : 'Gerar PDF de Etiquetas'}
        </button>
      </div>
    </div>
  );
}
