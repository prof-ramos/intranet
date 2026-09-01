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
  textFaint,
  textSubtle,
  surfaceMuted,
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
      className="motion-safe:animate-in motion-safe:fade-in fixed inset-0 z-50 flex items-center justify-center motion-safe:duration-150"
      style={{ backgroundColor: overlayScrim }}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Enviar para assinatura"
    >
      <div
        className="motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in relative w-full max-w-md rounded-[16px] bg-white p-6 motion-safe:duration-150"
        style={{ boxShadow: elevatedShadow }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          disabled={isSending}
          className={`absolute top-4 right-4 rounded-md p-1 transition-colors duration-150 hover:text-[#040920] disabled:opacity-40 ${focusRingClass}`}
          style={{ color: textFaint }}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <h2 className="pr-6 font-serif text-xl font-bold text-[#040920]">Enviar para Assinatura</h2>

        <div className="mt-4 space-y-3">
          <div
            className="rounded-[8px] px-3 py-2"
            style={{ border: `1px solid ${hairline}`, backgroundColor: surfaceMuted }}
          >
            <p className="text-xs tracking-wider text-[rgba(13,31,60,0.45)] uppercase">Ofício</p>
            <p className="mt-0.5 text-sm font-semibold text-[#040920]">{oficioNumber}</p>
          </div>
          <div
            className="rounded-[8px] px-3 py-2"
            style={{ border: `1px solid ${hairline}`, backgroundColor: surfaceMuted }}
          >
            <p className="text-xs tracking-wider text-[rgba(13,31,60,0.45)] uppercase">
              Signatário
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#040920]">{cleanedName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5">
          <label
            htmlFor="signer-email"
            className="mb-1.5 block text-xs font-semibold tracking-wider text-[rgba(13,31,60,0.6)] uppercase"
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
            className={`w-full rounded-[8px] border px-3 py-2 text-sm transition-colors outline-none placeholder:text-[rgba(13,31,60,0.3)] disabled:opacity-50 ${focusRingClass}`}
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
              className={`rounded-[8px] border px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-[rgba(4,9,32,0.04)] disabled:opacity-40 ${focusRingClass}`}
              style={{ borderColor: hairline, color: textSubtle }}
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
