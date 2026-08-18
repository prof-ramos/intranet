'use client';

import { isDomesticCountry } from '@/lib/associates/location-country';
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
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { cancelPaymentAction, updatePaymentAction } from './actions';
import CancelPaymentDialog from './CancelPaymentDialog';
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
  type MonthlyPaymentsSearchParams,
} from '@/lib/finance/search-params';
import {
  cancelPendingMonthlyPaymentsSearch,
  scheduleMonthlyPaymentsSearch,
} from './navigation-coordinator';
import {
  editablePaymentStatuses,
  paymentStatusOrder,
  paymentStatusUi,
  type PaymentStatus,
} from './payment-status-ui';

const logger = createLogger('monthly-payments-table');

interface Payment {
  associateId: number;
  fullName: string;
  defaultPaymentMethod: 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros';
  paymentId: number | null;
  paymentStatus: 'pago' | 'pendente' | 'atrasado' | 'isento' | 'cancelado' | null;
  monthPaymentMethod: 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros' | null;
  locationCountry: string | null;
  locationCity: string | null;
  functionalStatus: 'ativo' | 'aposentado' | 'cedido' | 'em_licenca' | null;
  updatedAt: Date | null;
}

interface MonthlyPaymentsTableProps {
  payments: Payment[];
  year: number;
  month: number;
  currentFilters: MonthlyPaymentsSearchParams;
}

const methodConfig: Record<string, { label: string; short: string; group: string }> = {
  folha: { label: 'Desconto em Folha', short: 'Folha', group: 'SIGEPE' },
  boleto: { label: 'Boleto', short: 'Boleto', group: 'Direto' },
  pix: { label: 'PIX', short: 'PIX', group: 'Direto' },
  transferencia: { label: 'Transferência', short: 'Transf.', group: 'Direto' },
  outros: { label: 'Outros', short: 'Outros', group: 'Direto' },
};

const locationGroup = (country: string | null): 'brasil' | 'exterior' => {
  return isDomesticCountry(country) ? 'brasil' : 'exterior';
};

type PaymentMethod = Payment['defaultPaymentMethod'];
interface PaymentViewModel extends Payment {
  currentStatus: PaymentStatus;
  currentMethod: PaymentMethod;
  statusCfg: (typeof paymentStatusUi)[PaymentStatus];
  methodCfg: (typeof methodConfig)[string];
  locGroup: 'brasil' | 'exterior';
}

function getEffectivePaymentMethod(
  monthPaymentMethod: Payment['monthPaymentMethod'],
  defaultPaymentMethod: Payment['defaultPaymentMethod'],
): PaymentMethod {
  return monthPaymentMethod ?? defaultPaymentMethod;
}

function getEffectivePaymentStatus(paymentStatus: Payment['paymentStatus']): PaymentStatus {
  return paymentStatus ?? 'pendente';
}

function getPaymentViewModel(payment: Payment): PaymentViewModel {
  const currentStatus = getEffectivePaymentStatus(payment.paymentStatus);
  const currentMethod = getEffectivePaymentMethod(
    payment.monthPaymentMethod,
    payment.defaultPaymentMethod,
  );
  return {
    ...payment,
    currentStatus,
    currentMethod,
    statusCfg: paymentStatusUi[currentStatus],
    methodCfg: methodConfig[currentMethod] ?? methodConfig.outros,
    locGroup: locationGroup(payment.locationCountry),
  };
}

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
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancelErrorMessage, setCancelErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{
    associateId: number;
    paymentId: number;
    associateName: string;
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
  const locationFilter = currentFilters.location ?? 'all';
  const hasActiveFilters = Boolean(
    currentFilters.q || currentFilters.status || currentFilters.method || currentFilters.location,
  );

  const handleStatusChange = async (
    associateId: number,
    newStatus: 'pago' | 'pendente' | 'atrasado' | 'isento',
    currentMethod: PaymentMethod,
    expectedUpdatedAt: Date | null,
  ) => {
    setUpdatingId(associateId);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const result = await updatePaymentAction({
        associateId,
        year,
        month,
        status: newStatus,
        paymentMethod: currentMethod,
        expectedUpdatedAt: expectedUpdatedAt ? expectedUpdatedAt.toISOString() : null,
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

  const handleCancelPayment = (
    associateId: number,
    paymentId: number | null,
    associateName: string,
  ) => {
    if (!paymentId) {
      setErrorMessage('Inicialize a mensalidade antes de cancelar.');
      return;
    }

    setErrorMessage(null);
    setCancelErrorMessage(null);
    setCancelTarget({ associateId, paymentId, associateName });
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
      });

      if (result && !result.success) {
        if (result.error === 'PAYMENT_NOT_FOUND') {
          setCancelErrorMessage('Mensalidade não encontrada. Recarregue a página.');
        } else if (result.error === 'PAYMENT_ALREADY_CANCELLED') {
          setCancelErrorMessage('Esta mensalidade já está cancelada.');
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
          disabled={updatingId === payment.associateId || cancellingId === payment.associateId}
          onChange={(event) =>
            handleStatusChange(
              payment.associateId,
              event.target.value as 'pago' | 'pendente' | 'atrasado' | 'isento',
              payment.currentMethod,
              payment.updatedAt,
            )
          }
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
        disabled={updatingId === payment.associateId || cancellingId === payment.associateId}
        onClick={() =>
          handleCancelPayment(payment.associateId, payment.paymentId, payment.fullName)
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

  return (
    <div className="min-w-0 space-y-5">
      <section
        className="rounded-[14px] bg-white p-4 sm:p-5"
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
          className="mt-5 grid gap-4 border-t pt-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.7fr)]"
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
          style={{ backgroundColor: errorBg, color: alertDangerText, border: `1px solid ${dangerBorder}` }}
        >
          {errorMessage}
        </div>
      )}

      {/* Operational queue */}
      <section
        className="min-w-0 overflow-hidden rounded-[12px] bg-white"
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
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr style={{ backgroundColor: canvas, borderBottom: `1px solid ${hairline}` }}>
                {['Associado', 'Local', 'Canal', 'Status', 'Atualização'].map((label) => (
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
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        {renderStatusControl(payment, 'desktop')}
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
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2">
                    {renderStatusControl(payment, 'mobile')}
                  </div>
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
        key={cancelTarget?.associateId ?? 'closed'}
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
    </div>
  );
}
