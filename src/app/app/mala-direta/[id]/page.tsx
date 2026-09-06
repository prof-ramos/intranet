import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/authorization';
import { getCampaignDetail, listCampaignRecipients } from '@/lib/mailing';
import {
  describeMailingFilters,
  MAILING_RECIPIENT_STATUS_LABEL,
} from '@/lib/mailing/filter-labels';
import { hairline, textMuted } from '@/lib/ui/tokens';
import { CampaignStatusBadge } from '../_components/CampaignStatusBadge';
import { CampaignActions } from './_components/CampaignActions';

export const dynamic = 'force-dynamic';

export default async function CampanhaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(['admin', 'diretoria', 'secretaria']);
  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId) || campaignId <= 0) notFound();

  const campaign = await getCampaignDetail(campaignId);
  if (!campaign) notFound();
  const recipients = await listCampaignRecipients(campaignId);
  const filterRows = describeMailingFilters(campaign.filters);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-[#5b6b80] uppercase">
            <Link href="/app/mala-direta" className="hover:underline">
              Mala direta
            </Link>{' '}
            · Campanha #{campaignId}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#040920]">{campaign.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <CampaignStatusBadge status={campaign.status} />
            <span style={{ color: textMuted }}>
              {campaign.channel === 'email' ? 'E-mail' : 'Etiquetas'} · criada por{' '}
              {campaign.createdByName ?? '—'} em{' '}
              {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        <CampaignActions campaign={campaign} />
      </div>

      {campaign.channel === 'email' && campaign.subject && (
        <div
          className="mt-6 rounded-[12px] border bg-white px-5 py-4"
          style={{ borderColor: hairline }}
        >
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: textMuted }}>
            Assunto
          </p>
          <p className="mt-1 text-sm font-medium text-[#040920]">{campaign.subject}</p>
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard label="Destinatários" value={campaign.recipientCount} />
        <SummaryCard
          label="Pendentes"
          value={campaign.recipientTotals.pendente + campaign.recipientTotals.enviando}
        />
        <SummaryCard label="Enviados" value={campaign.recipientTotals.enviado} />
        <SummaryCard label="Falhas" value={campaign.recipientTotals.falhou} />
        <SummaryCard label="Cancelados" value={campaign.recipientTotals.cancelado} />
      </div>

      <section
        className="mt-6 rounded-[12px] border bg-white px-5 py-4"
        style={{ borderColor: hairline }}
      >
        <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: textMuted }}>
          Filtros do público
        </p>
        {filterRows.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: textMuted }}>
            Todos os oficiais com contato no canal selecionado.
          </p>
        ) : (
          <dl className="mt-2 grid gap-2 sm:grid-cols-2">
            {filterRows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs" style={{ color: textMuted }}>
                  {row.label}
                </dt>
                <dd className="text-sm font-medium text-[#040920]">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section
        className="mt-6 rounded-[12px] border bg-white px-5 py-4"
        style={{ borderColor: hairline }}
      >
        <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: textMuted }}>
          Template
        </p>
        <pre className="mt-2 rounded-[8px] bg-slate-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#040920]">
          {campaign.templateBody}
        </pre>
      </section>

      <section
        className="mt-6 overflow-hidden rounded-[12px] border bg-white"
        style={{ borderColor: hairline }}
      >
        <div className="px-5 py-4">
          <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: textMuted }}>
            Destinatários
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-t text-xs tracking-wide text-[#5b6b80] uppercase">
                <th className="px-5 py-3 font-semibold">Nome</th>
                <th className="px-5 py-3 font-semibold">E-mail</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Tentativas</th>
                <th className="px-5 py-3 font-semibold">Último erro</th>
              </tr>
            </thead>
            <tbody>
              {recipients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-center text-[#5b6b80]">
                    Nenhum destinatário nesta campanha.
                  </td>
                </tr>
              ) : (
                recipients.map((recipient) => (
                  <tr key={recipient.id} className="border-t border-[rgba(4,9,32,0.06)]">
                    <td className="px-5 py-3 font-medium text-[#040920]">{recipient.name}</td>
                    <td className="px-5 py-3 text-[#5b6b80]">{recipient.email ?? '—'}</td>
                    <td className="px-5 py-3">
                      {MAILING_RECIPIENT_STATUS_LABEL[recipient.status] ?? recipient.status}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{recipient.attempts}</td>
                    <td className="px-5 py-3 text-[#5b6b80]">{recipient.lastError ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[12px] border bg-white px-5 py-4" style={{ borderColor: hairline }}>
      <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: textMuted }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[#040920] tabular-nums">{value}</p>
    </div>
  );
}
