'use client';

import { useState } from 'react';
import type {
  EtiquetaFieldKey,
  EtiquetaPrintMode,
  PimacoTemplate,
  PimacoTemplateCode,
} from '@/lib/etiquetas';
import type { EtiquetaAssociateOption } from '../actions';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { FormRadioGroup } from '@/components/ui/FormRadioGroup';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { hairline, textMuted } from '@/lib/ui/tokens';
import { EtiquetasFieldSelector } from './EtiquetasFieldSelector';
import { EtiquetasPrintOptions } from './EtiquetasPrintOptions';
import { EtiquetasRecipientsSelector } from './EtiquetasRecipientsSelector';
import { EtiquetasTemplateSelector } from './EtiquetasTemplateSelector';

const MODES: Array<{ value: EtiquetaPrintMode; label: string }> = [
  { value: 'postal', label: 'Postal' },
  { value: 'mala_diplomatica', label: 'Mala diplomática' },
  { value: 'custom', label: 'Personalizado' },
];

export function EtiquetasForm({
  initialAssociates,
  templates,
  fieldKeys,
  defaultsByMode,
}: {
  initialAssociates: EtiquetaAssociateOption[];
  templates: PimacoTemplate[];
  fieldKeys: EtiquetaFieldKey[];
  defaultsByMode: Record<EtiquetaPrintMode, EtiquetaFieldKey[]>;
}) {
  const [templateCode, setTemplateCode] = useState<PimacoTemplateCode>('6182');
  const [mode, setMode] = useState<EtiquetaPrintMode>('postal');
  const [selectedFields, setSelectedFields] = useState<EtiquetaFieldKey[]>(defaultsByMode.postal);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [startPosition, setStartPosition] = useState(1);
  const [offsetXmm, setOffsetXmm] = useState(0);
  const [offsetYmm, setOffsetYmm] = useState(0);
  const [debug, setDebug] = useState(false);
  const [peo, setPeo] = useState(false);
  const [ectOpenable, setEctOpenable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  function changeMode(nextMode: EtiquetaPrintMode) {
    setMode(nextMode);
    setSelectedFields(defaultsByMode[nextMode]);
  }

  async function generatePdf() {
    setError(null);
    if (selectedIds.length === 0) {
      setError('Selecione ao menos um associado.');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/app/etiquetas/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateCode,
          mode,
          recipientIds: selectedIds,
          selectedFields,
          flags: { peo, ectOpenable },
          startPosition,
          offsetXmm,
          offsetYmm,
          debug,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'Não foi possível gerar o PDF.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `etiquetas-asof-${templateCode}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o PDF.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="grid gap-6 p-5 lg:grid-cols-[320px_1fr] lg:p-6">
      <div className="space-y-5">
        <EtiquetasTemplateSelector
          templates={templates}
          value={templateCode}
          onChange={setTemplateCode}
        />
        <FormRadioGroup
          legend="Modo de envio"
          name="etiqueta-mode"
          value={mode}
          options={MODES}
          onChange={changeMode}
        />
        <EtiquetasPrintOptions
          startPosition={startPosition}
          offsetXmm={offsetXmm}
          offsetYmm={offsetYmm}
          debug={debug}
          peo={peo}
          ectOpenable={ectOpenable}
          onChange={(patch) => {
            if (patch.startPosition !== undefined) setStartPosition(patch.startPosition);
            if (patch.offsetXmm !== undefined) setOffsetXmm(patch.offsetXmm);
            if (patch.offsetYmm !== undefined) setOffsetYmm(patch.offsetYmm);
            if (patch.debug !== undefined) setDebug(patch.debug);
            if (patch.peo !== undefined) setPeo(patch.peo);
            if (patch.ectOpenable !== undefined) setEctOpenable(patch.ectOpenable);
          }}
        />
      </div>

      <div className="space-y-6">
        <EtiquetasRecipientsSelector
          initialAssociates={initialAssociates}
          selectedIds={selectedIds}
          onChange={setSelectedIds}
        />
        <EtiquetasFieldSelector
          fields={fieldKeys}
          selected={selectedFields}
          onChange={setSelectedFields}
        />

        {error ? <InlineAlert variant="error">{error}</InlineAlert> : null}

        <div
          className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: hairline }}
        >
          <p className="text-xs" style={{ color: textMuted }}>
            Imprima em A4, escala 100%, sem ajustar à página.
          </p>
          <PrimaryButton onClick={generatePdf} pending={isGenerating} pendingLabel="Gerando...">
            Gerar PDF
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
