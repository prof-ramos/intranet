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
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync state to auto-open modal on success
  const [lastResetState, setLastResetState] = useState<typeof resetState>(null);
  if (resetState !== lastResetState) {
    setLastResetState(resetState);
    if (resetState?.success) {
      setShowCredentialsModal(true);
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

  const handleCopyLink = () => {
    if (resetState?.resetLink) {
      navigator.clipboard.writeText(resetState.resetLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
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
        <span className="text-xs text-red-600 font-medium" role="alert">
          {resetState?.success === false ? resetState.message : toggleState?.message}
        </span>
      )}

      {resetState?.success && (
        <div className="inline-flex items-center gap-1.5" role="status" aria-live="polite">
          <MailCheck size={14} className="text-green-600" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setShowCredentialsModal(true)}
            className="text-xs text-green-700 font-semibold hover:underline"
          >
            Ver credenciais resetadas
          </button>
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
        </>
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

      {/* Credentials Modal */}
      {showCredentialsModal && resetState?.success && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
        >
          <div 
            className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden text-left flex flex-col animate-scale-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="credentials-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 id="credentials-modal-title" className="font-serif text-lg font-bold text-[#040920]">
                Credenciais de Acesso Resetadas
              </h2>
              <button
                type="button"
                onClick={() => setShowCredentialsModal(false)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-50 transition-colors"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-2.5 p-3 rounded-lg bg-amber-50 border border-amber-200/60 text-amber-800 text-xs">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p>
                  Estas credenciais só serão exibidas <strong>esta única vez</strong>. Certifique-se de copiá-las e enviá-las ao usuário <strong>{userName}</strong> através de um canal seguro antes de fechar esta tela.
                </p>
              </div>

              {/* Temp Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#040920]">Senha Temporária</label>
                <div className="flex items-stretch rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                  <div data-testid="temp-password-value" className="px-3 py-2 font-mono text-sm text-gray-800 select-all select-text break-all grow self-center">
                    {resetState.tempPassword}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPass}
                    className="border-l border-gray-200 px-3 hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 flex items-center justify-center shrink-0"
                    title="Copiar senha"
                  >
                    {copiedPass ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Reset Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#040920]">Link de Recuperação (Supabase)</label>
                <div className="flex items-stretch rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
                  <div data-testid="reset-link-value" className="px-3 py-2 font-mono text-[11px] text-gray-600 select-all select-text break-all grow self-center leading-relaxed">
                    {resetState.resetLink}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="border-l border-gray-200 px-3 hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600 flex items-center justify-center shrink-0"
                    title="Copiar link"
                  >
                    {copiedLink ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCredentialsModal(false)}
                className="px-4 py-2 bg-[#040920] hover:bg-[#0d3260] active:bg-[#123d73] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
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
