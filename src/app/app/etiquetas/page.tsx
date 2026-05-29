'use client';

import { useState } from 'react';
import { LABEL_PRESETS } from '@/lib/labels/presets';
import { LabelItem } from '@/lib/labels/types';

export default function EtiquetasPage() {
  const [presetId, setPresetId] = useState('pimaco-a4054-approx');
  const [startPosition, setStartPosition] = useState(0);
  const [drawDebugGrid, setDrawDebugGrid] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Todo: Integrar com a lista real de associados ou seleções da tabela
  const [testData, setTestData] = useState(
    'Associação Nacional\nRua Exemplo 123\nCEP 00000-000\nBrasília, DF\n---\nFulano de Tal\nMinistério das Relações Exteriores\nEsplanada dos Ministérios'
  );

  const presetsList = Object.values(LABEL_PRESETS);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      // Parsear dados de teste manuais para itens
      const blocks = testData.split('---').map((b) => b.trim()).filter(Boolean);
      const items: LabelItem[] = blocks.map((block, i) => {
        const lines = block.split('\n').map((l) => l.trim());
        return {
          id: String(i),
          name: lines[0] || '',
          line1: lines[1] || '',
          line2: lines[2] || '',
          line3: lines[3] || '',
        };
      });

      const response = await fetch('/api/labels/pimaco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presetId,
          startPosition,
          drawDebugGrid,
          items,
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

        <div>
          <label className="label font-semibold">
            Dados para Teste 
            <span className="text-xs font-normal ml-2 opacity-70">(Separe os blocos com `---`)</span>
          </label>
          <textarea 
            className="textarea textarea-bordered w-full h-48 font-mono text-sm"
            value={testData}
            onChange={(e) => setTestData(e.target.value)}
          />
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
