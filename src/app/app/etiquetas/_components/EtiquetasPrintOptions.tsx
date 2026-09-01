'use client';

import { FormCheckbox } from '@/components/ui/FormCheckbox';
import { FormNumberInput } from '@/components/ui/FormNumberInput';
import { textMuted } from '@/lib/ui/tokens';

export function EtiquetasPrintOptions({
  startPosition,
  offsetXmm,
  offsetYmm,
  debug,
  peo,
  ectOpenable,
  onChange,
}: {
  startPosition: number;
  offsetXmm: number;
  offsetYmm: number;
  debug: boolean;
  peo: boolean;
  ectOpenable: boolean;
  onChange: (
    patch: Partial<{
      startPosition: number;
      offsetXmm: number;
      offsetYmm: number;
      debug: boolean;
      peo: boolean;
      ectOpenable: boolean;
    }>,
  ) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold" style={{ color: textMuted }}>
        Opções de impressão
      </legend>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <FormNumberInput
          id="start-position"
          label="Posição inicial"
          min={1}
          value={startPosition}
          onChange={(event) => onChange({ startPosition: Number(event.target.value) })}
        />
        <FormNumberInput
          id="offset-x"
          label="Offset X (mm)"
          step="0.1"
          value={offsetXmm}
          onChange={(event) => onChange({ offsetXmm: Number(event.target.value) })}
        />
        <FormNumberInput
          id="offset-y"
          label="Offset Y (mm)"
          step="0.1"
          value={offsetYmm}
          onChange={(event) => onChange({ offsetYmm: Number(event.target.value) })}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        <FormCheckbox
          id="peo"
          label="P.E.O."
          checked={peo}
          onChange={(event) => onChange({ peo: event.target.checked })}
        />
        <FormCheckbox
          id="ect-openable"
          label="Pode ser aberto pela ECT"
          checked={ectOpenable}
          onChange={(event) => onChange({ ectOpenable: event.target.checked })}
        />
        <FormCheckbox
          id="debug"
          label="Debug de alinhamento"
          checked={debug}
          onChange={(event) => onChange({ debug: event.target.checked })}
        />
      </div>
    </fieldset>
  );
}
