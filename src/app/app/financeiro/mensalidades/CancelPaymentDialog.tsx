'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { focusRingClass, navy, textMuted, textPrimary, textSecondary } from '@/lib/ui/tokens';

interface CancelPaymentDialogProps {
  associateName: string;
  open: boolean;
  isPending: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}

export default function CancelPaymentDialog({
  associateName,
  open,
  isPending,
  errorMessage,
  onClose,
  onConfirm,
}: CancelPaymentDialogProps) {
  const [reason, setReason] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const isPendingRef = useRef(isPending);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (open && isPending) dialogRef.current?.focus();
  }, [open, isPending]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => reasonRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPendingRef.current) {
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (!dialog) return;
      if (!focusable || focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setValidationError('Informe um motivo com ao menos 3 caracteres.');
      reasonRef.current?.focus();
      return;
    }
    setValidationError(null);
    void onConfirm(trimmedReason);
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(4,9,32,0.42)] p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="w-full max-w-md rounded-[14px] bg-white p-5 shadow-[0_20px_50px_rgba(4,9,32,0.2)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-payment-title"
        aria-describedby="cancel-payment-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#fff1f2] text-[#b91c1c]">
              <AlertTriangle size={18} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="cancel-payment-title"
                className="text-base font-bold"
                style={{ color: textPrimary }}
              >
                Cancelar mensalidade
              </h2>
              <p
                id="cancel-payment-description"
                className="mt-1 text-sm leading-5"
                style={{ color: textSecondary }}
              >
                O registro de <strong>{associateName}</strong> será cancelado e permanecerá na
                auditoria.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-[8px] hover:bg-[#f1f5f9] disabled:opacity-40 ${focusRingClass}`}
            aria-label="Fechar cancelamento"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="mt-5" onSubmit={handleSubmit}>
          {errorMessage && (
            <div
              className="mb-4 rounded-[8px] bg-[#fff1f2] px-3 py-2.5 text-sm font-semibold text-[#b91c1c]"
              role="alert"
            >
              {errorMessage}
            </div>
          )}
          <label
            htmlFor="cancel-payment-reason"
            className="text-xs font-bold"
            style={{ color: textPrimary }}
          >
            Motivo do cancelamento
          </label>
          <textarea
            ref={reasonRef}
            id="cancel-payment-reason"
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (validationError) setValidationError(null);
            }}
            rows={3}
            maxLength={500}
            placeholder="Ex.: lançamento em duplicidade"
            disabled={isPending}
            className={`mt-2 w-full resize-none rounded-[9px] border bg-white px-3 py-2.5 text-sm ${focusRingClass}`}
            style={{ borderColor: validationError ? '#fca5a5' : '#c9d2df', color: textPrimary }}
            aria-invalid={Boolean(validationError)}
            aria-describedby={validationError ? 'cancel-payment-error' : undefined}
          />
          <div className="mt-1 flex justify-between gap-3 text-[11px]" style={{ color: textMuted }}>
            {validationError ? (
              <span id="cancel-payment-error" role="alert" className="font-semibold text-[#b91c1c]">
                {validationError}
              </span>
            ) : (
              <span>Obrigatório para registrar a auditoria.</span>
            )}
            <span>{reason.length}/500</span>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className={`inline-flex h-10 items-center justify-center rounded-[8px] px-4 text-sm font-bold hover:bg-[#f1f5f9] disabled:opacity-40 ${focusRingClass}`}
              style={{ color: textMuted }}
            >
              Manter registro
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`inline-flex h-10 items-center justify-center rounded-[8px] px-4 text-sm font-bold text-white hover:bg-[#0d3260] disabled:cursor-wait disabled:opacity-60 ${focusRingClass}`}
              style={{ backgroundColor: navy }}
            >
              {isPending ? 'Cancelando…' : 'Confirmar cancelamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
