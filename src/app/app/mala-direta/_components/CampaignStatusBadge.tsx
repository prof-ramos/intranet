import type { MailingCampaignStatus } from '@/lib/mailing';

const STATUS_STYLES: Record<MailingCampaignStatus, { label: string; className: string }> = {
  rascunho: {
    label: 'Rascunho',
    className: 'bg-slate-100 text-slate-700',
  },
  em_envio: {
    label: 'Em envio',
    className: 'bg-blue-100 text-blue-800',
  },
  concluida: {
    label: 'Concluída',
    className: 'bg-green-100 text-green-800',
  },
  falhou: {
    label: 'Falhou',
    className: 'bg-red-100 text-red-800',
  },
  cancelada: {
    label: 'Cancelada',
    className: 'bg-amber-100 text-amber-800',
  },
};

export function CampaignStatusBadge({ status }: { status: MailingCampaignStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.className}`}
    >
      {style.label}
    </span>
  );
}
