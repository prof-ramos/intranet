import { requireRole } from '@/lib/auth/authorization';
import { PageHeader } from '@/components/PageHeader';
import { listCampaigns } from '@/lib/mailing';
import { hairline } from '@/lib/ui/tokens';
import Link from 'next/link';
import { CampaignStatusBadge } from './_components/CampaignStatusBadge';

export const dynamic = 'force-dynamic';

const CHANNEL_LABEL: Record<string, string> = {
  email: 'E-mail',
  etiquetas: 'Etiquetas',
};

export default async function MalaDiretaPage() {
  await requireRole(['admin', 'diretoria', 'secretaria']);
  const campaigns = await listCampaigns(100);

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Comunicação"
          title="Mala direta"
          description="Crie campanhas de e-mail em lote ou folhas de etiquetas para envio postal."
        />
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/secretaria/mala-direta"
            className="inline-flex min-h-11 items-center rounded-[8px] border bg-white px-4 py-2 text-sm font-medium text-[#040920] hover:bg-slate-50"
            style={{ borderColor: hairline }}
          >
            Contatos Gmail
          </Link>
          <Link
            href="/app/mala-direta/nova"
            className="inline-flex min-h-11 items-center gap-2 rounded-[8px] bg-[#040920] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0d3260]"
          >
            Nova campanha
          </Link>
        </div>
      </div>

      <section
        className="mt-6 overflow-hidden rounded-[16px] border bg-white"
        style={{ borderColor: hairline }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs tracking-wide text-[#5b6b80] uppercase">
                <th className="px-5 py-3 font-semibold">Campanha</th>
                <th className="px-5 py-3 font-semibold">Canal</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Destinatários</th>
                <th className="px-5 py-3 text-right font-semibold">Enviados</th>
                <th className="px-5 py-3 text-right font-semibold">Falhas</th>
                <th className="px-5 py-3 font-semibold">Criada por</th>
                <th className="px-5 py-3 font-semibold">Criada em</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-[#5b6b80]">
                    Nenhuma campanha criada ainda.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-b border-[rgba(4,9,32,0.06)] last:border-b-0"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/app/mala-direta/${campaign.id}`}
                        className="font-semibold text-[#06284f] hover:underline"
                      >
                        {campaign.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[#5b6b80]">
                      {CHANNEL_LABEL[campaign.channel] ?? campaign.channel}
                    </td>
                    <td className="px-5 py-3">
                      <CampaignStatusBadge status={campaign.status} />
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">{campaign.recipientCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{campaign.sentCount}</td>
                    <td className="px-5 py-3 text-right tabular-nums">{campaign.failedCount}</td>
                    <td className="px-5 py-3 text-[#5b6b80]">{campaign.createdByName ?? '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-[#5b6b80]">
                      {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                    </td>
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
