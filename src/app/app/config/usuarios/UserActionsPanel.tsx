'use client';

import { useActionState, useState } from 'react';
import { resetUserPassword, toggleUserActive } from './actions';
import { KeyRound, UserX, UserCheck, MailCheck } from 'lucide-react';
import { focusRingClass } from '@/lib/ui/tokens';

interface UserActionsPanelProps {
  userId: number;
  userName: string;
  isActive: boolean;
}

export function UserActionsPanel({ userId, userName, isActive }: UserActionsPanelProps) {
  const [resetState, resetAction, isResetting] = useActionState(resetUserPassword, null);
  const [toggleState, toggleAction, isToggling] = useActionState(toggleUserActive, null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);

  if (resetState?.success) {
    return (
      <div className="inline-flex items-center gap-1.5" role="status" aria-live="polite">
        <MailCheck size={14} className="text-green-600" aria-hidden="true" />
        <p className="text-xs text-green-700 font-medium">{resetState.message}</p>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      {(resetState?.success === false || toggleState?.success === false) && (
        <span className="text-xs text-red-600" role="alert">
          {resetState?.success === false ? resetState.message : toggleState?.message}
        </span>
      )}

      {!confirmReset ? (
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          disabled={isResetting || !isActive}
          title={isActive ? 'Resetar senha' : 'Usuário inativo'}
          className={`inline-flex items-center gap-1.5 rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-3 py-1.5 text-xs font-medium text-[#040920] hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${focusRingClass}`}
        >
          <KeyRound size={13} aria-hidden="true" />
          Resetar senha
        </button>
      ) : (
        <form action={resetAction} className="inline-flex items-center gap-1.5">
          <input type="hidden" name="userId" value={userId} />
          <span className="text-xs text-amber-700">Confirmar reset para <strong>{userName}</strong>?</span>
          <button
            type="submit"
            disabled={isResetting}
            className={`rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50 ${focusRingClass}`}
          >
            {isResetting ? 'Resetando…' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(false)}
            className={`rounded-md border border-[rgba(4,9,32,0.1)] px-2.5 py-1 text-xs font-medium text-[rgba(13,31,60,0.6)] hover:bg-gray-50 transition-colors ${focusRingClass}`}
          >
            Cancelar
          </button>
        </form>
      )}

      {!confirmToggle ? (
        <button
          type="button"
          onClick={() => setConfirmToggle(true)}
          disabled={isToggling}
          title={isActive ? 'Desativar usuário' : 'Ativar usuário'}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            isActive
              ? 'border-[rgba(4,9,32,0.1)] bg-white text-[#040920] hover:bg-red-50 hover:border-red-200 hover:text-red-700'
              : 'border-[rgba(4,9,32,0.1)] bg-white text-[#040920] hover:bg-green-50 hover:border-green-200 hover:text-green-700'
          } ${focusRingClass}`}
        >
          {isActive ? <UserX size={13} aria-hidden="true" /> : <UserCheck size={13} aria-hidden="true" />}
          {isActive ? 'Desativar' : 'Ativar'}
        </button>
      ) : (
        <form action={toggleAction} className="inline-flex items-center gap-1.5">
          <input type="hidden" name="userId" value={userId} />
          <span className="text-xs text-red-700">Confirmar {isActive ? 'desativação' : 'ativação'} de <strong>{userName}</strong>?</span>
          <button
            type="submit"
            disabled={isToggling}
            className={`rounded-md px-2.5 py-1 text-xs font-semibold text-white transition-colors disabled:opacity-50 ${
              isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
            } ${focusRingClass}`}
          >
            {isToggling ? 'Aguarde…' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmToggle(false)}
            className={`rounded-md border border-[rgba(4,9,32,0.1)] px-2.5 py-1 text-xs font-medium text-[rgba(13,31,60,0.6)] hover:bg-gray-50 transition-colors ${focusRingClass}`}
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
