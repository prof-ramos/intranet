'use client';

import { useActionState, useState } from 'react';
import { resetUserPassword, toggleUserActive } from './actions';
import { KeyRound, UserX, UserCheck, MailCheck, Copy, Check, X, AlertTriangle } from 'lucide-react';
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
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Sync state to auto-open modal on success
  const [lastResetState, setLastResetState] = useState<typeof resetState>(null);
  if (resetState !== lastResetState) {
    setLastResetState(resetState);
    if (resetState?.success) {
      if (resetState.tempPassword) {
        setShowCredentialsModal(true);
      }
      setConfirmReset(false);
    }
  }

  const handleCopyPass = () => {
    if (resetState?.tempPassword) {
      navigator.clipboard.writeText(resetState.tempPassword);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <div className="inline-flex items-center gap-2">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          .animate-fade-in {
            animation: fadeIn 0.2s ease-out;
          }
          .animate-scale-in {
            animation: scaleIn 0.2s ease-out;
          }
        }
      `}</style>

      {(resetState?.success === false || toggleState?.success === false) && (
        <span className="text-xs font-medium text-red-600" role="alert">
          {resetState?.success === false ? resetState.message : toggleState?.message}
        </span>
      )}

      {resetState?.success && (
        <div className="inline-flex items-center gap-1.5" role="status" aria-live="polite">
          <MailCheck size={14} className="text-green-600" aria-hidden="true" />
          {resetState.tempPassword ? (
            <button
              type="button"
              onClick={() => setShowCredentialsModal(true)}
              className="text-xs font-semibold text-green-700 hover:underline"
            >
              Ver credenciais resetadas
            </button>
          ) : (
            <span className="text-xs font-medium text-green-700">{resetState.message}</span>
          )}
        </div>
      )}

      {!resetState?.success && (
        <>
          {!confirmReset ? (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              disabled={isResetting || !isActive}
              title={isActive ? 'Resetar senha' : 'Usuário inativo'}
              className={`inline-flex items-center gap-1.5 rounded-md border border-[rgba(4,9,32,0.1)] bg-white px-3 py-1.5 text-xs font-medium text-[#040920] transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40 ${focusRingClass}`}
            >
              <KeyRound size={13} aria-hidden="true" />
              Resetar senha
            </button>
          ) : (
            <form action={resetAction} className="inline-flex items-center gap-1.5">
              <input type="hidden" name="userId" value={userId} />
              <span className="text-xs text-amber-700">
                Confirmar reset para <strong>{userName}</strong>?
              </span>
              <button
                type="submit"
                disabled={isResetting}
                className={`rounded-md bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50 ${focusRingClass}`}
              >
                {isResetting ? 'Resetando…' : 'Confirmar'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className={`rounded-md border border-[rgba(4,9,32,0.1)] px-2.5 py-1 text-xs font-medium text-[rgba(13,31,60,0.6)] transition-colors hover:bg-gray-50 ${focusRingClass}`}
              >
                Cancelar
              </button>
            </form>
          )}
        </>
      )}

      {!confirmToggle ? (
        <button
          type="button"
          onClick={() => setConfirmToggle(true)}
          disabled={isToggling}
          title={isActive ? 'Desativar usuário' : 'Ativar usuário'}
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
        <form action={toggleAction} className="inline-flex items-center gap-1.5">
          <input type="hidden" name="userId" value={userId} />
          <span className="text-xs text-red-700">
            Confirmar {isActive ? 'desativação' : 'ativação'} de <strong>{userName}</strong>?
          </span>
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
            className={`rounded-md border border-[rgba(4,9,32,0.1)] px-2.5 py-1 text-xs font-medium text-[rgba(13,31,60,0.6)] transition-colors hover:bg-gray-50 ${focusRingClass}`}
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Credentials Modal */}
      {showCredentialsModal && resetState?.success && (
        <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            className="animate-scale-in flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-gray-100 bg-white text-left shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="credentials-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2
                id="credentials-modal-title"
                className="font-serif text-lg font-bold text-[#040920]"
              >
                Credenciais de Acesso Resetadas
              </h2>
              <button
                type="button"
                onClick={() => setShowCredentialsModal(false)}
                className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 px-6 py-5">
              <div className="flex gap-2.5 rounded-lg border border-amber-200/60 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <p>
                  Estas credenciais só serão exibidas <strong>esta única vez</strong>. Certifique-se
                  de copiá-las e enviá-las ao usuário <strong>{userName}</strong> através de um
                  canal seguro antes de fechar esta tela.
                </p>
              </div>

              {/* Temp Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#040920]">Senha Temporária</label>
                <div className="flex items-stretch overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <div
                    data-testid="temp-password-value"
                    className="grow self-center px-3 py-2 font-mono text-sm break-all text-gray-800 select-all select-text"
                  >
                    {resetState.tempPassword}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPass}
                    className="flex shrink-0 items-center justify-center border-l border-gray-200 px-3 text-gray-600 transition-colors hover:bg-gray-100 active:bg-gray-200"
                    title="Copiar senha"
                  >
                    {copiedPass ? (
                      <Check size={16} className="text-green-600" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowCredentialsModal(false)}
                className="rounded-lg bg-[#040920] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#0d3260] active:bg-[#123d73]"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
