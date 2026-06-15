'use client';

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
  onChange: (patch: Partial<{
    startPosition: number;
    offsetXmm: number;
    offsetYmm: number;
    debug: boolean;
    peo: boolean;
    ectOpenable: boolean;
  }>) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">Opções de impressão</legend>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase opacity-70">Posição inicial</span>
          <input
            type="number"
            min={1}
            className="input input-bordered mt-1 w-full"
            value={startPosition}
            onChange={(event) => onChange({ startPosition: Number(event.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase opacity-70">Offset X (mm)</span>
          <input
            type="number"
            step="0.1"
            className="input input-bordered mt-1 w-full"
            value={offsetXmm}
            onChange={(event) => onChange({ offsetXmm: Number(event.target.value) })}
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase opacity-70">Offset Y (mm)</span>
          <input
            type="number"
            step="0.1"
            className="input input-bordered mt-1 w-full"
            value={offsetYmm}
            onChange={(event) => onChange({ offsetYmm: Number(event.target.value) })}
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="checkbox checkbox-sm" checked={peo} onChange={(event) => onChange({ peo: event.target.checked })} />
          P.E.O.
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="checkbox checkbox-sm" checked={ectOpenable} onChange={(event) => onChange({ ectOpenable: event.target.checked })} />
          Pode ser aberto pela ECT
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="checkbox checkbox-sm" checked={debug} onChange={(event) => onChange({ debug: event.target.checked })} />
          Debug de alinhamento
        </label>
      </div>
    </fieldset>
  );
}
