'use client';

import { useState } from 'react';
import { focusRingClass } from '@/lib/ui/tokens';

export function DeadlineEditor({
  currentData,
  currentHora,
}: {
  currentData: string | null;
  currentHora: string | null;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`rounded-[8px] px-2 py-0.5 text-xs font-medium text-[#040920] hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
      >
        Editar prazo
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        name="prazoData"
        defaultValue={currentData ?? ''}
        className={`h-8 rounded-[8px] border border-[#e2e8f0] bg-white px-2 text-sm ${focusRingClass}`}
        required
      />
      <input
        type="time"
        name="prazoHora"
        defaultValue={currentHora ?? ''}
        className={`h-8 rounded-[8px] border border-[#e2e8f0] bg-white px-2 text-sm ${focusRingClass}`}
      />
      <button
        type="submit"
        className={`rounded-[8px] bg-[#040920] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0d3260] ${focusRingClass}`}
      >
        Salvar
      </button>
      <button
        type="button"
        onClick={() => setEditing(false)}
        className={`rounded-[8px] px-3 py-1.5 text-xs font-medium text-[rgba(13,31,60,0.60)] hover:bg-[rgba(4,9,32,0.04)] ${focusRingClass}`}
      >
        Cancelar
      </button>
    </div>
  );
}
