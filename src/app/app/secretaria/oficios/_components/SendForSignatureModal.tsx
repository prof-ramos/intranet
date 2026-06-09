'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { sendForSignatureAction } from '../actions';
import { cleanSignatoryName } from '@/lib/oficios/utils';
import {
  focusRingClass,
  overlayScrim,
  hairline,
  error,
  elevatedShadow,
} from '@/lib/ui/tokens';

interface SendForSignatureModalProps {
  oficioId: number;
  oficioNumber: string;
  signatoryName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SendForSignatureModal({
  oficioId,
  oficioNumber,
  signatoryName,
  isOpen,
  onClose,
  onSuccess,
}: SendForSignatureModalProps) {
  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const cleanedName = cleanSignatoryName(signatoryName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSending) return;

    setIsSending(true);
    setErrorMessage(null);

    try {
      const result = await sendForSignatureAction({ oficioId, signerEmail: email });
      if (result.success) {
        setEmail('');
        onSuccess();
        onClose();
      } else {
        setErrorMessage(result.error ?? 'Erro ao enviar para assinatura.');
      }
    } catch {
      setErrorMessage('Erro inesperado. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  }

  function handleClose() {
    if (isSending) return;
    setErrorMessage(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: overlayScrim }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enviar para assinatura"
    >
      <div
        className="relative w-full max-w-md rounded-[16px] bg-white p-6"
        style={{ boxShadow: elevatedShadow }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={isSending}
          className={`absolute right-4 top-4 rounded-md p-1 text-slate-400 transition-colors hover:text-[#040920] disabled:opacity-40 ${focusRingClass}`}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <h2 className="pr-6 font-serif text-xl font-bold text-[#040920]">
          Enviar para Assinatura
        </h2>

        <div className="mt-4 space-y-3">
          <div className="rounded-[8px] bg-slate-50 px-3 py-2" style={{ border: `1px solid ${hairline}` }}>
            <p className="text-xs text-[rgba(13,31,60,0.45)] uppercase tracking-wider">Ofício</p>
            <p className="mt-0.5 text-sm font-semibold text-[#040920]">{oficioNumber}</p>
          </div>
          <div className="rounded-[8px] bg-slate-50 px-3 py-2" style={{ border: `1px solid ${hairline}` }}>
            <p className="text-xs text-[rgba(13,31,60,0.45)] uppercase tracking-wider">Signatário</p>
            <p className="mt-0.5 text-sm font-semibold text-[#040920]">{cleanedName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5">
          <label
            htmlFor="signer-email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[rgba(13,31,60,0.6)]"
          >
            Email do signatário
          </label>
          <input
            id="signer-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            disabled={isSending}
            className={`w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition-colors placeholder:text-[rgba(13,31,60,0.3)] disabled:opacity-50 ${focusRingClass}`}
            style={{ borderColor: hairline }}
            autoFocus
          />

          {errorMessage && (
            <p className="mt-2 text-xs font-medium" style={{ color: error }}>
              {errorMessage}
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSending}
              className={`rounded-[8px] border px-4 py-2 text-sm font-medium text-[rgba(13,31,60,0.6)] transition-colors hover:bg-gray-50 disabled:opacity-40 ${focusRingClass}`}
              style={{ borderColor: hairline }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSending}
              className={`inline-flex items-center gap-2 rounded-[8px] bg-[#040920] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d3260] disabled:opacity-50 ${focusRingClass}`}
            >
              {isSending && <Loader2 className="motion-safe:animate-spin" size={16} />}
              {isSending ? 'Enviando…' : 'Enviar para Assinatura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
