'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, CircleDollarSign, FileText, X } from 'lucide-react';
import {
  alertDangerBg,
  alertDangerText,
  borderMuted,
  buttonOutlineHoverBg,
  compactActionClass,
  elevatedShadow,
  focusRingClass,
  mobileTouchTargetClass,
  navy,
  overlayScrim,
  primaryContainerHover,
  textMuted,
  textPrimary,
  textSecondary,
} from '@/lib/ui/tokens';
import type { PaymentOrigin } from '@/lib/finance/search-params';

export type EditablePaymentStatus = 'pago' | 'pendente' | 'atrasado' | 'isento';
export type EditablePaymentMethod = 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros';

export interface PaymentEditorValues {
  status: EditablePaymentStatus;
  paymentMethod: EditablePaymentMethod;
  amount: number | null;
  paidAt: string | null;
  paymentOrigin: PaymentOrigin;
  notes: string | null;
}

export interface PaymentEditorInitialValues extends PaymentEditorValues {
  expectedUpdatedAt: string | null;
}

interface PaymentEditorDialogProps {
  associateName: string;
  periodLabel: string;
  mode?: 'create' | 'edit';
  initialValues: PaymentEditorInitialValues;
  open: boolean;
  isPending: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (values: PaymentEditorValues) => void | Promise<void>;
}

const statusOptions: Array<{ value: EditablePaymentStatus; label: string }> = [
  { value: 'pago', label: 'Pago' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'atrasado', label: 'Atrasado' },
  { value: 'isento', label: 'Isento' },
];

const methodOptions: Array<{ value: EditablePaymentMethod; label: string }> = [
  { value: 'folha', label: 'Desconto em folha' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'PIX' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'outros', label: 'Outros' },
];

const originOptions: Array<{ value: PaymentOrigin; label: string }> = [
  { value: 'sigepe', label: 'SIGEPE' },
  { value: 'itamaraty', label: 'Itamaraty' },
  { value: 'comprovante', label: 'Comprovante' },
  { value: 'outros', label: 'Outros' },
];

function todayInSaoPaulo(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function formatAmount(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '';
  return value.toFixed(2).replace('.', ',');
}

function parseAmount(value: string): number | null {
  const normalized = value.trim().replace(/\s/g, '');
  if (!normalized) return null;

  // Accept both the operator-friendly `1.234,56` and HTML-number `1234.56` forms.
  const canonical = normalized.includes(',')
    ? normalized.replace(/\./g, '').replace(',', '.')
    : normalized;
  const parsed = Number(canonical);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100) / 100;
}

export default function PaymentEditorDialog({
  associateName,
  periodLabel,
  mode = 'create',
  initialValues,
  open,
  isPending,
  errorMessage,
  onClose,
  onConfirm,
}: PaymentEditorDialogProps) {
  const [status, setStatus] = useState(initialValues.status);
  const [paymentMethod, setPaymentMethod] = useState(initialValues.paymentMethod);
  const [amount, setAmount] = useState(formatAmount(initialValues.amount));
  const [paidAt, setPaidAt] = useState(initialValues.paidAt ?? '');
  const [paymentOrigin, setPaymentOrigin] = useState<PaymentOrigin>(initialValues.paymentOrigin);
  const [notes, setNotes] = useState(initialValues.notes ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLSelectElement>(null);
  const isPendingRef = useRef(isPending);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    isPendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => firstFieldRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isPendingRef.current) {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) {
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
    const parsedAmount = parseAmount(amount);
    const today = todayInSaoPaulo();

    if (status === 'pago' && (parsedAmount == null || parsedAmount <= 0)) {
      setValidationError('Informe um valor maior que zero para pagamentos pagos.');
      return;
    }
    if (parsedAmount != null && parsedAmount < 0) {
      setValidationError('O valor não pode ser negativo.');
      return;
    }
    if (status === 'pago' && !paidAt) {
      setValidationError('Informe a data em que o pagamento foi recebido.');
      return;
    }
    if (paidAt && paidAt > today) {
      setValidationError('A data do pagamento não pode estar no futuro.');
      return;
    }
    if (notes.length > 2000) {
      setValidationError('As observações devem ter no máximo 2.000 caracteres.');
      return;
    }

    setValidationError(null);
    void onConfirm({
      status,
      paymentMethod,
      // Keep an entered amount attached to the record even when its status is
      // later changed away from Pago; cancellation is the terminal flow that
      // excludes it from totals without erasing the audit value.
      amount: parsedAmount,
      paidAt: status === 'pago' ? paidAt || null : null,
      paymentOrigin,
      notes: notes.trim() || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      style={{ backgroundColor: overlayScrim }}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="my-auto w-full max-w-2xl rounded-[14px] bg-white p-5 sm:p-6"
        style={{ boxShadow: elevatedShadow }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-editor-title"
        aria-describedby="payment-editor-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2" style={{ color: navy }}>
              <CircleDollarSign size={18} aria-hidden="true" />
              <h2 id="payment-editor-title" className="text-lg font-bold">
                {mode === 'edit' ? 'Editar lançamento' : 'Registrar pagamento'}
              </h2>
            </div>
            <p
              id="payment-editor-description"
              className="mt-1 text-sm"
              style={{ color: textSecondary }}
            >
              {associateName} · {periodLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className={`inline-flex items-center justify-center rounded-[8px] hover:bg-[var(--close-hover-bg)] disabled:opacity-40 ${compactActionClass} ${focusRingClass}`}
            style={{ '--close-hover-bg': buttonOutlineHoverBg } as React.CSSProperties}
            aria-label="Fechar editor de pagamento"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <form className="mt-5" onSubmit={handleSubmit} noValidate>
          {(errorMessage || validationError) && (
            <div
              className="mb-4 rounded-[8px] px-3 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: alertDangerBg, color: alertDangerText }}
              role="alert"
            >
              {validationError ?? errorMessage}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="payment-editor-status"
                className="text-xs font-bold"
                style={{ color: textPrimary }}
              >
                Situação
              </label>
              <select
                ref={firstFieldRef}
                id="payment-editor-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as EditablePaymentStatus);
                  setValidationError(null);
                }}
                disabled={isPending}
                className={`mt-2 h-11 w-full rounded-[9px] border bg-white px-3 text-sm ${focusRingClass}`}
                style={{ borderColor: borderMuted, color: textPrimary }}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="payment-editor-amount"
                className="text-xs font-bold"
                style={{ color: textPrimary }}
              >
                Valor recebido
              </label>
              <div className="relative">
                <CircleDollarSign
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                  style={{ color: textMuted }}
                  aria-hidden="true"
                />
                <input
                  id="payment-editor-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setValidationError(null);
                  }}
                  disabled={isPending}
                  placeholder="0,00"
                  className={`mt-2 h-11 w-full rounded-[9px] border bg-white pr-3 pl-9 text-sm ${focusRingClass}`}
                  style={{ borderColor: borderMuted, color: textPrimary }}
                  aria-describedby="payment-editor-amount-help"
                />
              </div>
              <span
                id="payment-editor-amount-help"
                className="mt-1 block text-[11px]"
                style={{ color: textMuted }}
              >
                Obrigatório quando a situação for Pago.
              </span>
            </div>

            <div>
              <label
                htmlFor="payment-editor-paid-at"
                className="text-xs font-bold"
                style={{ color: textPrimary }}
              >
                Data do pagamento
              </label>
              <div className="relative">
                <CalendarDays
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2"
                  style={{ color: textMuted }}
                  aria-hidden="true"
                />
                <input
                  id="payment-editor-paid-at"
                  type="date"
                  value={paidAt}
                  max={todayInSaoPaulo()}
                  onChange={(event) => {
                    setPaidAt(event.target.value);
                    setValidationError(null);
                  }}
                  disabled={isPending}
                  className={`mt-2 h-11 w-full rounded-[9px] border bg-white px-3 pl-9 text-sm ${focusRingClass}`}
                  style={{ borderColor: borderMuted, color: textPrimary }}
                  aria-describedby="payment-editor-date-help"
                />
              </div>
              <span
                id="payment-editor-date-help"
                className="mt-1 block text-[11px]"
                style={{ color: textMuted }}
              >
                Data civil no fuso de São Paulo.
              </span>
            </div>

            <div>
              <label
                htmlFor="payment-editor-method"
                className="text-xs font-bold"
                style={{ color: textPrimary }}
              >
                Forma de pagamento
              </label>
              <select
                id="payment-editor-method"
                value={paymentMethod}
                onChange={(event) => {
                  setPaymentMethod(event.target.value as EditablePaymentMethod);
                  setValidationError(null);
                }}
                disabled={isPending}
                className={`mt-2 h-11 w-full rounded-[9px] border bg-white px-3 text-sm ${focusRingClass}`}
                style={{ borderColor: borderMuted, color: textPrimary }}
              >
                {methodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="payment-editor-origin"
                className="text-xs font-bold"
                style={{ color: textPrimary }}
              >
                Origem do pagamento
              </label>
              <select
                id="payment-editor-origin"
                value={paymentOrigin}
                onChange={(event) => {
                  setPaymentOrigin(event.target.value as PaymentOrigin);
                  setValidationError(null);
                }}
                disabled={isPending}
                className={`mt-2 h-11 w-full rounded-[9px] border bg-white px-3 text-sm ${focusRingClass}`}
                style={{ borderColor: borderMuted, color: textPrimary }}
              >
                {originOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="payment-editor-notes"
                className="text-xs font-bold"
                style={{ color: textPrimary }}
              >
                Observações
              </label>
              <div className="relative">
                <FileText
                  size={15}
                  className="pointer-events-none absolute top-3 left-3"
                  style={{ color: textMuted }}
                  aria-hidden="true"
                />
                <textarea
                  id="payment-editor-notes"
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.target.value);
                    setValidationError(null);
                  }}
                  maxLength={2000}
                  rows={3}
                  disabled={isPending}
                  placeholder="Contexto operacional, divergências ou conferências necessárias"
                  className={`mt-2 w-full resize-y rounded-[9px] border bg-white px-3 py-2.5 pl-9 text-sm ${focusRingClass}`}
                  style={{ borderColor: borderMuted, color: textPrimary }}
                />
              </div>
              <div className="mt-1 flex justify-end text-[11px]" style={{ color: textMuted }}>
                {notes.length}/2.000
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className={`inline-flex items-center justify-center rounded-[8px] px-4 text-sm font-bold hover:bg-[var(--secondary-hover-bg)] disabled:opacity-40 ${mobileTouchTargetClass} ${focusRingClass}`}
              style={
                {
                  '--secondary-hover-bg': buttonOutlineHoverBg,
                  color: textMuted,
                } as React.CSSProperties
              }
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`inline-flex items-center justify-center rounded-[8px] px-4 text-sm font-bold text-white hover:bg-[var(--primary-hover-bg)] disabled:cursor-wait disabled:opacity-60 ${mobileTouchTargetClass} ${focusRingClass}`}
              style={
                {
                  '--primary-hover-bg': primaryContainerHover,
                  backgroundColor: navy,
                } as React.CSSProperties
              }
            >
              {isPending ? 'Salvando…' : 'Salvar pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { formatAmount, parseAmount, todayInSaoPaulo };
