'use client';

import { useActionState, useState } from 'react';
import { toggleAssignmentActive } from './actions';
import { UserCheck, UserX } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';

interface AssignmentActionsPanelProps {
  id: number;
  name: string;
  isActive: boolean;
}

export function AssignmentActionsPanel({ id, name, isActive }: AssignmentActionsPanelProps) {
  const [state, formAction, isPending] = useActionState(toggleAssignmentActive, null);
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="inline-flex items-center gap-2">
      {state?.success === false && <span className="text-xs text-red-600">{state.message}</span>}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={isPending}
          title={isActive ? 'Desativar lotação' : 'Ativar lotação'}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            isActive
              ? 'border-[rgba(4,9,32,0.1)] bg-white text-[#040920] hover:border-red-200 hover:bg-red-50 hover:text-red-700'
              : 'border-[rgba(4,9,32,0.1)] bg-white text-[#040920] hover:border-green-200 hover:bg-green-50 hover:text-green-700'
          } ${focusRingClass}`}
        >
          {isActive ? (
            <UserX size={13} aria-hidden="true" />
          ) : (
            <UserCheck size={13} aria-hidden="true" />
          )}
          {isActive ? 'Desativar' : 'Ativar'}
        </button>
      ) : (
        <form action={formAction} className="inline-flex items-center gap-1.5">
          <input type="hidden" name="id" value={id} />
          <span className="text-xs text-red-700">
            Confirmar {isActive ? 'desativação' : 'ativação'} de <strong>{name}</strong>?
          </span>
          <button
            type="submit"
            disabled={isPending}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${
              isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } ${focusRingClass}`}
          >
            {isPending ? 'Aguarde…' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className={`rounded-md border border-[rgba(4,9,32,0.1)] px-2.5 py-1 text-xs font-medium text-[rgba(13,31,60,0.6)] transition-colors hover:bg-gray-50 ${focusRingClass}`}
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
