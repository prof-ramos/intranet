'use client';

import {
  useState,
  useMemo,
  useTransition,
  useCallback,
  useEffect,
  type CSSProperties,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  XCircle,
  Globe,
  MapPin,
  UserCheck,
  CreditCard,
  Pencil,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { cancelPaymentAction, updatePaymentAction } from './actions';
import CancelPaymentDialog from './CancelPaymentDialog';
import PaymentEditorDialog, {
  type EditablePaymentMethod,
  type EditablePaymentStatus,
  type PaymentEditorInitialValues,
  type PaymentEditorValues,
} from './PaymentEditorDialog';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import {
  hairline,
  navy,
  textMuted,
  textPrimary,
  textSecondary,
  textFaint,
  skyBlue,
  successBg,
  successText,
  errorBg,
  alertDangerText,
  alertDangerNoteBorder,
  canvas,
  borderMuted,
  dangerBorder,
  desktopDenseControlClass,
  focusRingClass,
  surfaceMuted,
  success,
  white,
} from '@/lib/ui/tokens';
import {
  buildMonthlyPaymentsSearchParams,
  type PaymentOrigin,
  type MonthlyPaymentsSearchParams,
} from '@/lib/finance/search-params.shared';
import {
  cancelPendingMonthlyPaymentsSearch,
  scheduleMonthlyPaymentsSearch,
} from './navigation-coordinator';
import {
  type Payment,
  type PaymentViewModel,
  getPaymentViewModel,
  getStructuredAmount,
  getPaymentOrigin,
  getEditorInitialValues,
  toPaymentIsoString,
  originConfig,
  formatCurrency,
  formatCivilDate,
} from './payment-view-model';
import { editablePaymentStatuses, paymentStatusOrder, paymentStatusUi } from './payment-status-ui';

const logger = createLogger('monthly-payments-table');

interface MonthlyPaymentsTableProps {
  payments: Payment[];
  year: number;
  month: number;
  currentFilters: MonthlyPaymentsSearchParams;
}

type StructuredPaymentActionInput = {
  associateId: number;
  year: number;
  month: number;
  status: EditablePaymentStatus;
  paymentMethod: EditablePaymentMethod;
  amount: number | null;
  paidAt: string | null;
  origin: PaymentOrigin;
  notes: string | null;
  expectedUpdatedAt: string | null;
};

export default function MonthlyPaymentsTable({
  payments,
  year,
  month,
  currentFilters,
}: MonthlyPaymentsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local search for immediate UX; server-side filtering handles the rest
  const [search, setSearch] = useState(currentFilters.q);
  const [debouncedSearch, setDebouncedSearch] = useState(currentFilters.q);

  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editorTarget, setEditorTarget] = useState<Payment | null>(null);
  const [editorStatusOverride, setEditorStatusOverride] = useState<EditablePaymentStatus | null>(
    null,
  );
  const [editorSavingId, setEditorSavingId] = useState<number | null>(null);
  const [editorErrorMessage, setEditorErrorMessage] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelErrorMessage, setCancelErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    associateId: number;
    paymentId: number;
    associateName: string;
    expectedUpdatedAt: string | null;
  } | null>(null);

  useEffect(() => cancelPendingMonthlyPaymentsSearch, []);

  // Debounce search input to URL
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      scheduleMonthlyPaymentsSearch(() => {
        setDebouncedSearch(value);
        const params = new URLSearchParams(searchParams.toString());
        if (value.trim()) {
          params.set('q', value.trim().slice(0, 80));
        } else {
          params.delete('q');
        }
        params.delete('page');
        params.set('year', String(year));
        params.set('month', String(month));
        startTransition(() => {
          router.push(`/app/financeiro/mensalidades?${params.toString()}`);
        });
      }, 400);
    },
    [router, searchParams, year, month],
  );

  const updateFilter = useCallback(
    (key: keyof MonthlyPaymentsSearchParams, value: string | undefined) => {
      cancelPendingMonthlyPaymentsSearch();
      const base = buildMonthlyPaymentsSearchParams(currentFilters, {});
      const params = new URLSearchParams(base);
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      params.set('year', String(year));
      params.set('month', String(month));
      startTransition(() => {
        router.push(`/app/financeiro/mensalidades?${params.toString()}`);
      });
    },
    [currentFilters, router, year, month],
  );

  // `payments` is server-owned; router.refresh updates this prop and this memo recalculates the rows.
  const filteredPayments = useMemo(() => {
    if (!debouncedSearch.trim()) return payments;
    const term = debouncedSearch.toLowerCase();
    return payments.filter((p) => p.fullName.toLowerCase().includes(term));
  }, [payments, debouncedSearch]);

  const statusFilter = currentFilters.status ?? 'all';
  const methodFilter = currentFilters.method ?? 'all';
  const originFilter = currentFilters.origin ?? 'all';
  const locationFilter = currentFilters.location ?? 'all';
  const hasActiveFilters = Boolean(
    currentFilters.q ||
    currentFilters.status ||
    currentFilters.method ||
    currentFilters.origin ||
    currentFilters.location,
  );

  const buildStructuredInput = useCallback(
    (payment: Payment, values: PaymentEditorValues): StructuredPaymentActionInput => ({
      associateId: payment.associateId,
      year,
      month,
      status: values.status,
      paymentMethod: values.paymentMethod,
      amount: values.amount,
      paidAt: values.paidAt,
      origin: values.paymentOrigin,
      notes: values.notes,
      expectedUpdatedAt: toPaymentIsoString(payment.updatedAt),
    }),
    [year, month],
  );

  const handleStatusChange = async (
    payment: PaymentViewModel,
    newStatus: 'pago' | 'pendente' | 'atrasado' | 'isento',
  ) => {
    const associateId = payment.associateId;
    setUpdatingId(associateId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await updatePaymentAction({
        associateId,
        year,
        month,
        status: newStatus,
        paymentMethod: payment.currentMethod,
        amount: getStructuredAmount(payment),
        paidAt: null,
        origin: getPaymentOrigin(payment),
        notes: payment.notes ?? null,
        expectedUpdatedAt: toPaymentIsoString(payment.updatedAt),
      });

      if (result && !result.success) {
        if (result.error === 'CONCURRENCY_CONFLICT') {
          setErrorMessage('Este registro foi alterado por outro usuário. Recarregue a página.');
        } else {
          setErrorMessage('Erro ao atualizar pagamento. Tente novamente.');
        }
        return;
      }

      setSuccessMessage('Pagamento atualizado com sucesso.');
      router.refresh();
      window.setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      logger.error('Failed to update payment', {
        associateId,
        year,
        month,
        newStatus,
        error: toSafeErrorLog(err),
      });
      setErrorMessage('Erro ao atualizar pagamento. Tente novamente.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditorConfirm = async (values: PaymentEditorValues) => {
    if (!editorTarget || editorSavingId !== null) return;
    setEditorSavingId(editorTarget.associateId);
    setEditorErrorMessage(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await updatePaymentAction(buildStructuredInput(editorTarget, values));
      if (result && result.success === false) {
        if (result.error === 'CONCURRENCY_CONFLICT') {
          setEditorErrorMessage(
            'Este lançamento foi alterado por outro usuário. Feche o editor e recarregue a página antes de tentar novamente.',
          );
        } else {
          setEditorErrorMessage(
            'Não foi possível salvar o pagamento. Confira os dados e tente novamente.',
          );
        }
        return;
      }

      setEditorTarget(null);
      setEditorStatusOverride(null);
      setSuccessMessage('Pagamento salvo com sucesso.');
      router.refresh();
      window.setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      setEditorErrorMessage(
        code === 'CONCURRENCY_CONFLICT'
          ? 'Este lançamento foi alterado por outro usuário. Feche o editor e recarregue a página antes de tentar novamente.'
          : 'Não foi possível salvar o pagamento. Confira os dados e tente novamente.',
      );
      logger.error('Failed to save structured payment', {
        associateId: editorTarget.associateId,
        year,
        month,
        error: toSafeErrorLog(error),
      });
    } finally {
      setEditorSavingId(null);
    }
  };

  const openEditor = (payment: Payment, statusOverride?: EditablePaymentStatus) => {
    setEditorErrorMessage(null);
    setEditorStatusOverride(statusOverride ?? null);
    setEditorTarget(payment);
  };

  const editorInitialValues = useMemo<PaymentEditorInitialValues>(() => {
    if (!editorTarget) {
      return {
        status: 'pendente',
        paymentMethod: 'outros',
        amount: null,
        paidAt: null,
        paymentOrigin: 'outros',
        notes: null,
        expectedUpdatedAt: null,
      };
    }
    const values = getEditorInitialValues(editorTarget);
    return editorStatusOverride ? { ...values, status: editorStatusOverride } : values;
  }, [editorTarget, editorStatusOverride]);

  const handleCancelPayment = (
    associateId: number,
    paymentId: number | null,
    associateName: string,
    expectedUpdatedAt: Date | string | null,
  ) => {
    if (!paymentId) {
      setErrorMessage('Inicialize a mensalidade antes de cancelar.');
      return;
    }

    setErrorMessage(null);
    setCancelErrorMessage(null);
    setCancelTarget({
      associateId,
      paymentId,
      associateName,
      expectedUpdatedAt: toPaymentIsoString(expectedUpdatedAt),
    });
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTarget || cancellingId !== null) return;

    setCancellingId(cancelTarget.associateId);
    setErrorMessage(null);
    setCancelErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await cancelPaymentAction({
        paymentId: cancelTarget.paymentId,
        year,
        month,
        reason,
        ...(cancelTarget.expectedUpdatedAt
          ? { expectedUpdatedAt: cancelTarget.expectedUpdatedAt }
          : {}),
      });

      if (result && !result.success) {
        if (result.error === 'PAYMENT_NOT_FOUND') {
          setCancelErrorMessage('Mensalidade não encontrada. Recarregue a página.');
        } else if (result.error === 'PAYMENT_ALREADY_CANCELLED') {
          setCancelErrorMessage('Esta mensalidade já está cancelada.');
        } else if (result.error === 'CONCURRENCY_CONFLICT') {
          setCancelErrorMessage(
            'Este lançamento foi alterado por outro usuário. Recarregue a página antes de cancelar.',
          );
        } else {
          setCancelErrorMessage('Erro ao cancelar mensalidade. Tente novamente.');
        }
        return;
      }

      setCancelTarget(null);
      setSuccessMessage('Mensalidade cancelada com registro de auditoria.');
      router.refresh();
      window.setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      logger.error('Failed to cancel payment', {
        paymentId: cancelTarget.paymentId,
        year,
        month,
        error: toSafeErrorLog(err),
      });
      setCancelErrorMessage('Erro ao cancelar mensalidade. Tente novamente.');
    } finally {
      setCancellingId(null);
    }
  };

  const statusOptions = editablePaymentStatuses.map((status) => ({
    value: status,
    label: paymentStatusUi[status].label,
  }));
  const statusFilterOptions = paymentStatusOrder.map((status) => ({
    value: status,
    label: paymentStatusUi[status].label,
  }));

  const methodOptions = [
    { value: 'all', label: 'Todos', icon: CreditCard },
    { value: 'folha', label: 'Folha', icon: UserCheck },
    { value: 'boleto', label: 'Boleto', icon: CreditCard },
    { value: 'pix', label: 'PIX', icon: CreditCard },
    { value: 'transferencia', label: 'Transf.', icon: CreditCard },
    { value: 'outros', label: 'Outros', icon: CreditCard },
  ];

  const originOptions = [
    { value: 'sigepe' as const, label: 'SIGEPE' },
    { value: 'itamaraty' as const, label: 'Itamaraty' },
    { value: 'comprovante' as const, label: 'Comprovante' },
    { value: 'outros' as const, label: 'Outros' },
  ];

  const locationOptions = [
    { value: 'all', label: 'Todos', icon: MapPin },
    { value: 'brasil', label: 'Brasil', icon: MapPin },
    { value: 'exterior', label: 'Exterior', icon: Globe },
  ];

  const renderStatusControl = (payment: PaymentViewModel, variant: 'desktop' | 'mobile') => {
    if (payment.currentStatus === 'cancelado') {
      return (
        <span
          className="inline-flex min-h-9 items-center rounded-[8px] px-2.5 text-xs font-bold"
          style={{ color: payment.statusCfg.color, backgroundColor: payment.statusCfg.bg }}
        >
          Cancelado
        </span>
      );
    }

    return (
      <>
        <label className="sr-only" htmlFor={`payment-status-${payment.associateId}-${variant}`}>
          Alterar status de {payment.fullName}
        </label>
        <select
          id={`payment-status-${payment.associateId}-${variant}`}
          value={payment.currentStatus}
          disabled={
            updatingId === payment.associateId ||
            editorSavingId === payment.associateId ||
            cancellingId === payment.associateId
          }
          onChange={(event) => {
            const nextStatus = event.target.value as EditablePaymentStatus;
            if (nextStatus === 'pago') {
              openEditor(payment, nextStatus);
              return;
            }
            void handleStatusChange(payment, nextStatus);
          }}
          className={`rounded-[8px] border bg-white px-2 text-xs font-bold transition-colors ${desktopDenseControlClass} ${focusRingClass}`}
          style={{ borderColor: borderMuted, color: payment.statusCfg.color }}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </>
    );
  };

  const renderCancelButton = (payment: PaymentViewModel) =>
    payment.currentStatus === 'cancelado' ? null : (
      <button
        type="button"
        disabled={
          updatingId === payment.associateId ||
          editorSavingId === payment.associateId ||
          cancellingId === payment.associateId
        }
        onClick={() =>
          handleCancelPayment(
            payment.associateId,
            payment.paymentId,
            payment.fullName,
            payment.updatedAt,
          )
        }
        aria-label={`Cancelar mensalidade de ${payment.fullName}`}
        className={`inline-flex items-center justify-center gap-1.5 rounded-[8px] px-2.5 text-xs font-bold transition-colors hover:bg-[var(--cancel-hover-bg)] disabled:cursor-not-allowed disabled:opacity-40 ${desktopDenseControlClass} ${focusRingClass}`}
        style={
          {
            '--cancel-hover-bg': paymentStatusUi.cancelado.bg,
            color: paymentStatusUi.cancelado.color,
            border: `1px solid ${alertDangerNoteBorder}`,
          } as CSSProperties
        }
      >
        <XCircle size={14} aria-hidden="true" />
        <span>Cancelar</span>
      </button>
    );

  const renderEditButton = (payment: PaymentViewModel) => {
    if (payment.currentStatus === 'cancelado') return null;
    const hasRecord = payment.paymentId != null;
    return (
      <button
        type="button"
        onClick={() => openEditor(payment)}
        disabled={
          updatingId === payment.associateId ||
          editorSavingId === payment.associateId ||
          cancellingId === payment.associateId
        }
        aria-label={`${hasRecord ? 'Editar lançamento' : 'Registrar pagamento'} de ${payment.fullName}`}
        className={`inline-flex items-center justify-center gap-1.5 rounded-[8px] px-2.5 text-xs font-bold transition-colors hover:bg-[#eef1f6] disabled:cursor-not-allowed disabled:opacity-40 ${desktopDenseControlClass} ${focusRingClass}`}
        style={{ color: navy, border: `1px solid ${hairline}` }}
      >
        <Pencil size={14} aria-hidden="true" />
        <span>{hasRecord ? 'Editar' : 'Registrar'}</span>
      </button>
    );
  };

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="rounded-[16px] bg-white p-4 sm:p-5"
        style={{ border: `1px solid ${hairline}` }}
        aria-label="Filtros de mensalidades"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center gap-2">
              <SlidersHorizontal size={15} style={{ color: skyBlue }} aria-hidden="true" />
              <span
                className="text-[11px] font-bold tracking-[0.12em] uppercase"
                style={{ color: textMuted }}
              >
                Filtrar pagamentos
              </span>
            </div>
            <div className="relative max-w-xl">
              <Search
                className="absolute top-1/2 left-3 -translate-y-1/2"
                size={17}
                style={{ color: textFaint }}
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Buscar por nome..."
                autoComplete="off"
                className={`h-11 w-full rounded-[9px] border bg-white pr-4 pl-10 text-sm transition-colors ${focusRingClass}`}
                style={{ borderColor: borderMuted, color: textPrimary }}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="Buscar associado por nome"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                cancelPendingMonthlyPaymentsSearch();
                setSearch('');
                setDebouncedSearch('');
                startTransition(() =>
                  router.push(`/app/financeiro/mensalidades?year=${year}&month=${month}`),
                );
              }}
              className={`inline-flex items-center justify-center gap-1.5 self-start rounded-[8px] px-3 text-xs font-bold transition-colors hover:bg-[rgba(4,9,32,0.04)] xl:self-end ${desktopDenseControlClass} ${focusRingClass}`}
              style={{ color: textMuted, border: `1px solid ${hairline}` }}
            >
              <RotateCcw size={14} aria-hidden="true" />
              Limpar filtros
            </button>
          )}
        </div>

        <div
          className="mt-5 grid gap-4 border-t pt-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]"
          style={{ borderColor: hairline }}
        >
          <div>
            <span
              className="mb-2 block text-[10px] font-bold tracking-[0.1em] uppercase"
              style={{ color: textMuted }}
            >
              Situação
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por situação">
              <button
                type="button"
                onClick={() => updateFilter('status', undefined)}
                aria-pressed={statusFilter === 'all'}
                className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 text-xs font-bold transition-colors ${desktopDenseControlClass} ${focusRingClass}`}
                style={{
                  backgroundColor: statusFilter === 'all' ? navy : canvas,
                  color: statusFilter === 'all' ? white : textMuted,
                  border: `1px solid ${statusFilter === 'all' ? navy : hairline}`,
                }}
              >
                Todos
              </button>
              {statusFilterOptions.map((s) => {
                const cfg = paymentStatusUi[s.value];
                const active = statusFilter === s.value;
                return (
                  <button
                    type="button"
                    key={s.value}
                    onClick={() => updateFilter('status', active ? undefined : s.value)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-[8px] px-3 text-xs font-bold transition-colors ${desktopDenseControlClass} ${focusRingClass}`}
                    style={{
                      backgroundColor: active ? cfg.color : cfg.bg,
                      color: active ? white : cfg.color,
                      border: `1px solid ${active ? cfg.color : 'transparent'}`,
                    }}
                  >
                    <cfg.icon size={12} aria-hidden="true" />
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span
              className="mb-2 block text-[10px] font-bold tracking-[0.1em] uppercase"
              style={{ color: textMuted }}
            >
              Origem
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por origem">
              <button
                type="button"
                onClick={() => updateFilter('origin', undefined)}
                aria-pressed={originFilter === 'all'}
                className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 text-xs font-bold transition-colors ${desktopDenseControlClass} ${focusRingClass}`}
                style={{
                  backgroundColor: originFilter === 'all' ? navy : canvas,
                  color: originFilter === 'all' ? white : textMuted,
                  border: `1px solid ${originFilter === 'all' ? navy : hairline}`,
                }}
              >
                Todas
              </button>
              {originOptions.map((origin) => {
                const active = originFilter === origin.value;
                return (
                  <button
                    type="button"
                    key={origin.value}
                    onClick={() => updateFilter('origin', active ? undefined : origin.value)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 text-xs font-bold transition-colors ${desktopDenseControlClass} ${focusRingClass}`}
                    style={{
                      backgroundColor: active ? navy : canvas,
                      color: active ? white : textMuted,
                      border: `1px solid ${active ? navy : hairline}`,
                    }}
                  >
                    {origin.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span
              className="mb-2 block text-[10px] font-bold tracking-[0.1em] uppercase"
              style={{ color: textMuted }}
            >
              Canal
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por canal">
              {methodOptions.map((m) => {
                const active = methodFilter === m.value;
                return (
                  <button
                    type="button"
                    key={m.value}
                    onClick={() => updateFilter('method', active ? undefined : m.value)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 text-xs font-bold transition-colors ${desktopDenseControlClass} ${focusRingClass}`}
                    style={{
                      backgroundColor: active ? navy : canvas,
                      color: active ? white : textMuted,
                      border: `1px solid ${active ? navy : hairline}`,
                    }}
                  >
                    <m.icon size={12} aria-hidden="true" />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span
              className="mb-2 block text-[10px] font-bold tracking-[0.1em] uppercase"
              style={{ color: textMuted }}
            >
              Lotação
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por lotação">
              {locationOptions.map((l) => {
                const active = locationFilter === l.value;
                return (
                  <button
                    type="button"
                    key={l.value}
                    onClick={() => updateFilter('location', active ? undefined : l.value)}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded-[8px] px-2.5 text-xs font-bold transition-colors ${desktopDenseControlClass} ${focusRingClass}`}
                    style={{
                      backgroundColor: active ? navy : canvas,
                      color: active ? white : textMuted,
                      border: `1px solid ${active ? navy : hairline}`,
                    }}
                  >
                    <l.icon size={12} aria-hidden="true" />
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {isPending && (
        <div
          role="status"
          aria-live="polite"
          className="text-xs font-medium"
          style={{ color: textMuted }}
        >
          Atualizando...
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-[8px] px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: successBg, color: successText, border: `1px solid ${success}` }}
        >
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-[8px] px-4 py-3 text-sm font-medium"
          style={{
            backgroundColor: errorBg,
            color: alertDangerText,
            border: `1px solid ${dangerBorder}`,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Operational queue */}
      <section
        className="min-w-0 overflow-hidden rounded-[16px] bg-white"
        style={{ border: `1px solid ${hairline}` }}
      >
        <div
          className="flex flex-col gap-2 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          style={{ borderColor: hairline }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: navy }}>
              Fila de conferência
            </h2>
            <p className="mt-1 text-xs" style={{ color: textMuted }}>
              Atualize o status diretamente no registro do associado.
            </p>
          </div>
          <span
            className="self-start rounded-full px-2.5 py-1 text-[11px] font-bold"
            style={{ color: textMuted, backgroundColor: surfaceMuted }}
          >
            {filteredPayments.length} exibidos
          </span>
        </div>

        <div className="hidden max-w-full min-w-0 overflow-x-auto md:block">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead>
              <tr style={{ backgroundColor: canvas, borderBottom: `1px solid ${hairline}` }}>
                {[
                  'Associado',
                  'Lotação',
                  'Forma',
                  'Origem',
                  'Status',
                  'Valor',
                  'Data',
                  'Ações',
                ].map((label) => (
                  <th
                    key={label}
                    className="px-5 py-3 text-[11px] font-bold tracking-[0.08em] uppercase last:text-right"
                    style={{ color: textMuted }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: hairline }}>
              {filteredPayments.map((rawPayment) => {
                const payment = getPaymentViewModel(rawPayment);
                return (
                  <tr
                    key={payment.associateId}
                    className="transition-colors hover:bg-[rgba(4,9,32,0.02)]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium" style={{ color: textPrimary }}>
                        {payment.fullName}
                      </div>
                      {payment.functionalStatus && (
                        <div className="mt-0.5 text-[11px]" style={{ color: textFaint }}>
                          {payment.functionalStatus === 'ativo'
                            ? 'Ativo'
                            : payment.functionalStatus === 'aposentado'
                              ? 'Aposentado'
                              : payment.functionalStatus === 'cedido'
                                ? 'Cedido'
                                : 'Licença'}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="inline-flex items-center gap-1.5">
                        {payment.locGroup === 'exterior' ? (
                          <Globe size={12} style={{ color: textMuted }} aria-hidden="true" />
                        ) : (
                          <MapPin size={12} style={{ color: textMuted }} aria-hidden="true" />
                        )}
                        <span className="text-xs font-medium" style={{ color: textSecondary }}>
                          {payment.locationCountry || 'Brasil'}
                          {payment.locationCity ? ` · ${payment.locationCity}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] uppercase"
                        style={{
                          backgroundColor:
                            payment.currentMethod === 'folha' ? '#eef1f6' : '#f8fafc',
                          color: navy,
                          borderColor: hairline,
                        }}
                      >
                        {payment.methodCfg.short}
                      </span>
                      {payment.currentMethod === 'folha' && payment.locGroup === 'exterior' && (
                        <span
                          className="ml-1.5 text-[10px] font-bold tracking-[0.06em] uppercase"
                          style={{ color: textMuted }}
                        >
                          DPAG
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold"
                        style={{ color: textSecondary, borderColor: hairline }}
                        title={originConfig[getPaymentOrigin(payment)].label}
                      >
                        {originConfig[getPaymentOrigin(payment)].short}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-semibold"
                        style={{ color: payment.statusCfg.color }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: payment.statusCfg.dot }}
                        />
                        {payment.statusCfg.label}
                      </span>
                    </td>
                    <td
                      className="px-5 py-3.5 text-xs font-semibold"
                      style={{ color: textPrimary }}
                    >
                      {formatCurrency(getStructuredAmount(payment))}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: textSecondary }}>
                      {formatCivilDate(payment.paidAt)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {renderStatusControl(payment, 'desktop')}
                        {renderEditButton(payment)}
                        {renderCancelButton(payment)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y md:hidden" style={{ borderColor: hairline }}>
          {filteredPayments.map((rawPayment) => {
            const payment = getPaymentViewModel(rawPayment);
            return (
              <article key={payment.associateId} className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold" style={{ color: textPrimary }}>
                      {payment.fullName}
                    </h3>
                    <p className="mt-1 text-[11px]" style={{ color: textFaint }}>
                      {payment.functionalStatus === 'aposentado'
                        ? 'Aposentado'
                        : payment.functionalStatus === 'cedido'
                          ? 'Cedido'
                          : payment.functionalStatus === 'em_licenca'
                            ? 'Licença'
                            : 'Ativo'}
                    </p>
                  </div>
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                    style={{
                      backgroundColor: payment.statusCfg.bg,
                      color: payment.statusCfg.color,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: payment.statusCfg.dot }}
                    />
                    {payment.statusCfg.label}
                  </span>
                </div>
                <div
                  className="grid grid-cols-2 gap-3 border-y py-3"
                  style={{ borderColor: hairline }}
                >
                  <div>
                    <span
                      className="block text-[10px] font-bold tracking-[0.1em] uppercase"
                      style={{ color: textMuted }}
                    >
                      Local
                    </span>
                    <span
                      className="mt-1 block text-xs font-medium"
                      style={{ color: textSecondary }}
                    >
                      {payment.locationCountry || 'Brasil'}
                      {payment.locationCity ? ` · ${payment.locationCity}` : ''}
                    </span>
                  </div>
                  <div>
                    <span
                      className="block text-[10px] font-bold tracking-[0.1em] uppercase"
                      style={{ color: textMuted }}
                    >
                      Canal
                    </span>
                    <span
                      className="mt-1 block text-xs font-medium"
                      style={{ color: textSecondary }}
                    >
                      {payment.methodCfg.short}
                      {payment.currentMethod === 'folha' && payment.locGroup === 'exterior'
                        ? ' · DPAG'
                        : ''}
                    </span>
                  </div>
                  <div>
                    <span
                      className="block text-[10px] font-bold tracking-[0.1em] uppercase"
                      style={{ color: textMuted }}
                    >
                      Origem
                    </span>
                    <span
                      className="mt-1 block text-xs font-medium"
                      style={{ color: textSecondary }}
                    >
                      {originConfig[getPaymentOrigin(payment)].label}
                    </span>
                  </div>
                  <div>
                    <span
                      className="block text-[10px] font-bold tracking-[0.1em] uppercase"
                      style={{ color: textMuted }}
                    >
                      Valor / data
                    </span>
                    <span
                      className="mt-1 block text-xs font-medium"
                      style={{ color: textSecondary }}
                    >
                      {formatCurrency(getStructuredAmount(payment))} ·{' '}
                      {formatCivilDate(payment.paidAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    {renderStatusControl(payment, 'mobile')}
                  </div>
                  {renderEditButton(payment)}
                  {renderCancelButton(payment)}
                </div>
              </article>
            );
          })}
        </div>

        {filteredPayments.length === 0 && (
          <div
            className="flex flex-col items-center justify-center px-6 py-16"
            style={{ color: textMuted }}
          >
            <Search size={32} style={{ color: textFaint }} className="mb-3" />
            <p className="text-sm font-medium">Nenhum associado encontrado</p>
            <p className="mt-1 text-xs">Ajuste os filtros ou a busca para ver resultados.</p>
          </div>
        )}
      </section>

      <CancelPaymentDialog
        key={`cancel-${cancelTarget?.associateId ?? 'closed'}`}
        associateName={cancelTarget?.associateName ?? ''}
        open={cancelTarget !== null}
        isPending={cancelTarget !== null && cancellingId === cancelTarget.associateId}
        errorMessage={cancelTarget ? cancelErrorMessage : null}
        onClose={() => {
          if (cancelTarget && cancellingId !== cancelTarget.associateId) {
            setCancelErrorMessage(null);
            setCancelTarget(null);
          }
        }}
        onConfirm={handleCancelConfirm}
      />

      <PaymentEditorDialog
        key={`editor-${editorTarget?.associateId ?? 'closed'}`}
        associateName={editorTarget?.fullName ?? ''}
        periodLabel={new Intl.DateTimeFormat('pt-BR', {
          month: 'long',
          year: 'numeric',
        }).format(new Date(year, month - 1, 1))}
        mode={editorTarget?.paymentId ? 'edit' : 'create'}
        initialValues={editorInitialValues}
        open={editorTarget !== null}
        isPending={editorTarget !== null && editorSavingId === editorTarget.associateId}
        errorMessage={editorTarget ? editorErrorMessage : null}
        onClose={() => {
          if (editorTarget && editorSavingId !== editorTarget.associateId) {
            setEditorErrorMessage(null);
            setEditorStatusOverride(null);
            setEditorTarget(null);
          }
        }}
        onConfirm={handleEditorConfirm}
      />
    </div>
  );
}
