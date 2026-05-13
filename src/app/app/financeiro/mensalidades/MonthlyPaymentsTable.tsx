'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Ban,
  Globe,
  MapPin,
  UserCheck,
  CreditCard,
} from 'lucide-react';
import { updatePaymentAction } from './actions';
import {
  hairline,
  navy,
  textMuted,
  textPrimary,
  textSecondary,
  textFaint,
  success,
  successBg,
  warning,
  warningBg,
  error,
  errorBg,
  canvas,
  borderMuted,
  focusRingClass,
} from '@/lib/ui/tokens';

interface Payment {
  associateId: number;
  fullName: string;
  defaultPaymentMethod: 'folha' | 'boleto' | 'pix' | 'transferencia' | 'outros';
  paymentId: number | null;
  paymentStatus: 'pago' | 'pendente' | 'atrasado' | 'isento' | null;
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
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  pago: { label: 'Pago', icon: CheckCircle2, color: success, bg: successBg },
  pendente: { label: 'Pendente', icon: Clock, color: warning, bg: warningBg },
  atrasado: { label: 'Atrasado', icon: AlertCircle, color: error, bg: errorBg },
  isento: { label: 'Isento', icon: Ban, color: '#59677a', bg: canvas },
};

const methodConfig: Record<string, { label: string; short: string; group: string }> = {
  folha: { label: 'Desconto em Folha', short: 'Folha', group: 'SIGEPE' },
  boleto: { label: 'Boleto', short: 'Boleto', group: 'Direto' },
  pix: { label: 'PIX', short: 'PIX', group: 'Direto' },
  transferencia: { label: 'Transferência', short: 'Transf.', group: 'Direto' },
  outros: { label: 'Outros', short: 'Outros', group: 'Direto' },
};

const locationGroup = (country: string | null): 'brasil' | 'exterior' => {
  if (!country) return 'brasil';
  const c = country.toLowerCase();
  if (c === 'brasil' || c === 'brazil') return 'brasil';
  return 'exterior';
};

type PaymentMethod = Payment['defaultPaymentMethod'];
type PaymentStatus = NonNullable<Payment['paymentStatus']>;

function getEffectivePaymentMethod(
  monthPaymentMethod: Payment['monthPaymentMethod'],
  defaultPaymentMethod: Payment['defaultPaymentMethod'],
): PaymentMethod {
  return monthPaymentMethod ?? defaultPaymentMethod;
}

function getEffectivePaymentStatus(paymentStatus: Payment['paymentStatus']): PaymentStatus {
  return paymentStatus ?? 'pendente';
}

export default function MonthlyPaymentsTable({
  payments,
  year,
  month,
}: MonthlyPaymentsTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesSearch =
        p.fullName.toLowerCase().includes(search.toLowerCase());
      const currentStatus = getEffectivePaymentStatus(p.paymentStatus);
      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;
      const currentMethod = getEffectivePaymentMethod(p.monthPaymentMethod, p.defaultPaymentMethod);
      const matchesMethod = methodFilter === 'all' || currentMethod === methodFilter;
      const loc = locationGroup(p.locationCountry);
      const matchesLocation = locationFilter === 'all' || loc === locationFilter;

      return matchesSearch && matchesStatus && matchesMethod && matchesLocation;
    });
  }, [payments, search, statusFilter, methodFilter, locationFilter]);

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
        paidAt: newStatus === 'pago' ? new Date() : null,
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
      window.setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setErrorMessage('Erro ao atualizar pagamento. Tente novamente.');
    } finally {
      setUpdatingId(null);
    }
  };

  const statusOptions = [
    { value: 'pago', label: 'Pago' },
    { value: 'pendente', label: 'Pendente' },
    { value: 'atrasado', label: 'Atrasado' },
    { value: 'isento', label: 'Isento' },
  ];

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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div
        className="flex flex-wrap gap-3 items-center rounded-[10px] bg-white px-4 py-3"
        style={{ border: `1px solid ${hairline}` }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2"
            size={16}
            style={{ color: textFaint }}
          />
          <input
            type="text"
            placeholder="Buscar por nome..."
            className={`w-full rounded-[8px] border bg-white pl-9 pr-4 text-sm transition-colors ${focusRingClass}`}
            style={{
              borderColor: borderMuted,
              color: textPrimary,
              height: 40,
            }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: statusFilter === 'all' ? navy : canvas,
              color: statusFilter === 'all' ? '#fff' : textMuted,
              border: `1px solid ${statusFilter === 'all' ? navy : hairline}`,
            }}
          >
            Todos
          </button>
          {statusOptions.map((s) => {
            const cfg = statusConfig[s.value];
            const active = statusFilter === s.value;
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(active ? 'all' : s.value)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: active ? cfg.color : cfg.bg,
                  color: active ? '#fff' : cfg.color,
                  border: `1px solid ${active ? cfg.color : 'transparent'}`,
                }}
              >
                <cfg.icon size={12} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Method pills */}
        <div className="flex flex-wrap gap-1.5">
          {methodOptions.map((m) => {
            const active = methodFilter === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setMethodFilter(active ? 'all' : m.value)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: active ? navy : canvas,
                  color: active ? '#fff' : textMuted,
                  border: `1px solid ${active ? navy : hairline}`,
                }}
              >
                <m.icon size={12} />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* Location pills */}
        <div className="flex flex-wrap gap-1.5">
          {locationOptions.map((l) => {
            const active = locationFilter === l.value;
            return (
              <button
                key={l.value}
                onClick={() => setLocationFilter(active ? 'all' : l.value)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors"
                style={{
                  backgroundColor: active ? navy : canvas,
                  color: active ? '#fff' : textMuted,
                  border: `1px solid ${active ? navy : hairline}`,
                }}
              >
                <l.icon size={12} />
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="rounded-[8px] px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: successBg, color: success, border: `1px solid ${success}` }}
        >
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="rounded-[8px] px-4 py-3 text-sm font-medium"
          style={{ backgroundColor: errorBg, color: error, border: `1px solid ${error}` }}
        >
          {errorMessage}
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-hidden rounded-[10px] bg-white"
        style={{ border: `1px solid ${hairline}` }}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr style={{ backgroundColor: canvas, borderBottom: `1px solid ${hairline}` }}>
              <th className="px-5 py-3 text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: textMuted }}>
                Associado
              </th>
              <th className="px-5 py-3 text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: textMuted }}>
                Local
              </th>
              <th className="px-5 py-3 text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: textMuted }}>
                Canal
              </th>
              <th className="px-5 py-3 text-[11px] font-bold tracking-[0.08em] uppercase" style={{ color: textMuted }}>
                Status
              </th>
              <th className="px-5 py-3 text-[11px] font-bold tracking-[0.08em] uppercase text-right" style={{ color: textMuted }}>
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: hairline }}>
            {filteredPayments.map((p) => {
              const currentStatus = getEffectivePaymentStatus(p.paymentStatus);
              const currentMethod = getEffectivePaymentMethod(
                p.monthPaymentMethod,
                p.defaultPaymentMethod,
              );
              const statusCfg = statusConfig[currentStatus];
              const methodCfg = methodConfig[currentMethod] || methodConfig.outros;
              const locGroup = locationGroup(p.locationCountry);

              return (
                <tr
                  key={p.associateId}
                  className="transition-colors hover:bg-[rgba(4,9,32,0.02)]"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-sm" style={{ color: textPrimary }}>
                      {p.fullName}
                    </div>
                    {p.functionalStatus && (
                      <div className="mt-0.5 text-[11px]" style={{ color: textFaint }}>
                        {p.functionalStatus === 'ativo' ? 'Ativo' : p.functionalStatus === 'aposentado' ? 'Aposentado' : p.functionalStatus === 'cedido' ? 'Cedido' : 'Licença'}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="inline-flex items-center gap-1.5">
                      {locGroup === 'exterior' ? (
                        <Globe size={12} style={{ color: textMuted }} />
                      ) : (
                        <MapPin size={12} style={{ color: textMuted }} />
                      )}
                      <span className="text-xs font-medium" style={{ color: textSecondary }}>
                        {p.locationCountry || 'Brasil'}
                        {p.locationCity ? ` · ${p.locationCity}` : ''}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center text-[10px] font-bold tracking-[0.08em] uppercase rounded-full px-2.5 py-1"
                      style={{
                        backgroundColor: currentMethod === 'folha' ? '#eef1f6' : '#f8fafc',
                        color: navy,
                        border: `1px solid ${hairline}`,
                      }}
                    >
                      {methodCfg.short}
                    </span>
                    {currentMethod === 'folha' && locGroup === 'exterior' && (
                      <span className="ml-1.5 text-[10px] font-bold tracking-[0.06em] uppercase" style={{ color: textMuted }}>
                        DPAG
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: statusCfg.color }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: statusCfg.color }}
                      />
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      {statusOptions.map((s) => {
                        const cfg = statusConfig[s.value];
                        const isCurrent = currentStatus === s.value;
                        return (
                          <button
                            key={s.value}
                            disabled={updatingId === p.associateId || isCurrent}
                            onClick={() =>
                              handleStatusChange(
                                p.associateId,
                                s.value as 'pago' | 'pendente' | 'atrasado' | 'isento',
                                currentMethod,
                                p.updatedAt,
                              )
                            }
                            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                            style={{
                              backgroundColor: isCurrent ? cfg.color : cfg.bg,
                              color: isCurrent ? '#fff' : cfg.color,
                              border: `1px solid ${isCurrent ? cfg.color : 'transparent'}`,
                            }}
                            title={s.label}
                          >
                            <cfg.icon size={14} />
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
      </div>
    </div>
  );
}
