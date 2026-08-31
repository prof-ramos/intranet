'use client';

import { useState, useTransition } from 'react';
import { Ban } from 'lucide-react';
import { desktopDenseControlClass, focusRingClass, mobileTouchTargetClass } from '@/lib/ui/tokens';
import { revokeOperatorMcpTokenAction } from './actions';

interface McpTokenActionsPanelProps {
  id: number;
  isRevoked: boolean;
}

export function McpTokenActionsPanel({
  id,
  isRevoked: initiallyRevoked,
}: McpTokenActionsPanelProps) {
  const [isRevoked, setIsRevoked] = useState(initiallyRevoked);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await revokeOperatorMcpTokenAction(id);
        if ('error' in result) {
          setError(result.error ?? 'Erro ao revogar token MCP.');
          return;
        }
        setIsRevoked(true);
        setConfirmRevoke(false);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Erro ao revogar token MCP.');
      }
    });
  }

  if (isRevoked) {
    return <span className="text-xs font-medium text-[rgba(13,31,60,0.40)]">Revogado</span>;
  }

  return (
    <div className="grid gap-2">
      {!confirmRevoke ? (
        <button
          type="button"
          onClick={() => setConfirmRevoke(true)}
          className={`${mobileTouchTargetClass} ${desktopDenseControlClass} inline-flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 ${focusRingClass}`}
        >
          <Ban size={13} aria-hidden="true" />
          Revogar
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-[rgba(13,31,60,0.65)]">Confirmar?</span>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isPending}
            className={`${mobileTouchTargetClass} ${desktopDenseControlClass} inline-flex items-center justify-center gap-1 rounded-md border border-red-300 bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50 ${focusRingClass}`}
          >
            {isPending ? 'Revogando...' : 'Sim, revogar'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmRevoke(false)}
            className={`${mobileTouchTargetClass} ${desktopDenseControlClass} inline-flex items-center justify-center rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-2.5 py-1 text-[11px] font-medium text-[#040920] transition-colors hover:bg-[rgba(13,31,60,0.04)] ${focusRingClass}`}
          >
            Cancelar
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
