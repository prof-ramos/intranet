'use client';

import { useActionState, useState } from 'react';
import { resetUserPassword, toggleUserActive } from './actions';
import { KeyRound, UserX, UserCheck, Copy, Check } from 'lucide-react';

interface UserActionsPanelProps {
  userId: number;
  userName: string;
  isActive: boolean;
}

export function UserActionsPanel({ userId, userName, isActive }: UserActionsPanelProps) {
  const [resetState, resetAction, isResetting] = useActionState(resetUserPassword, null);
  const [toggleState, toggleAction, isToggling] = useActionState(toggleUserActive, null);
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (resetState?.success && resetState.tempPassword) {
    return (
      <div className="inline-flex flex-col items-end gap-1">
        <p className="text-xs text-green-700 font-medium">{resetState.message}</p>
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-1.5">
          <code className="text-xs font-mono text-green-800 select-all">
            {resetState.tempPassword}
          </code>
          <button
            onClick={() => handleCopy(resetState.tempPassword!)}
            className="text-green-600 hover:text-green-800 transition-colors"
            title="Copiar senha"
            type="button"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <p className="text-[10px] text-[rgba(13,31,60,0.45)]">Copie antes de fechar. Não será exibida novamente.</p>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      {/* Feedback de erro */}
      {(resetState?.success === false || toggleState?.success === false) && (
        <span className="text-xs text-red-600">
          {resetState?.success === false ? resetState.message : toggleState?.message}
        </span>
      )}

      {/* Botão reset senha */}
      {!confirmReset ? (
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          disabled={isResetting || !isActive}
          title={isActive ? 'Resetar senha' : 'Usuário inativo'}
          className="inline-flex items-center gap-1.5 rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-3 py-1.5 text-xs font-medium text-[#040920] hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <KeyRound size={13} />
          Resetar senha
        </button>
      ) : (
        <form action={resetAction} className="inline-flex items-center gap-1.5">
          <input type="hidden" name="userId" value={userId} />
          <span className="text-xs text-amber-700">Confirmar reset para <strong>{userName}</strong>?</span>
          <button
            type="submit"
            disabled={isResetting}
            className="rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {isResetting ? 'Resetando…' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmReset(false)}
            className="rounded-md border border-[rgba(4,9,32,0.1)] px-2.5 py-1 text-xs font-medium text-[rgba(13,31,60,0.6)] hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Botão ativar/desativar */}
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
          }`}
        >
          {isActive ? <UserX size={13} /> : <UserCheck size={13} />}
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
            }`}
          >
            {isToggling ? 'Aguarde…' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmToggle(false)}
            className="rounded-md border border-[rgba(4,9,32,0.1)] px-2.5 py-1 text-xs font-medium text-[rgba(13,31,60,0.6)] hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </form>
      )}
    </div>
  );
}
