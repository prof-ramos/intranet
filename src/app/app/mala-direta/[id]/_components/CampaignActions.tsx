'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import {
  cancelMailingCampaignAction,
  processMailingBatchAction,
  startMailingCampaignAction,
} from '../../actions';
import type { MailingCampaignDetail } from '@/lib/mailing';
import { campaignEtiquetasDownloadPath } from '@/lib/mailing/paths';

const BUTTON_CLASS =
  'inline-flex min-h-11 items-center gap-2 rounded-[8px] border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export function CampaignActions({ campaign }: { campaign: MailingCampaignDetail }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'A ação falhou.');
      }
    });
  }

  function downloadEtiquetas(kind: 'pdf' | 'csv') {
    run(async () => {
      const response = await fetch(campaignEtiquetasDownloadPath(campaign.id, kind), {
        method: 'POST',
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Não foi possível gerar o arquivo.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        kind === 'pdf'
          ? `etiquetas-campanha-${campaign.id}.pdf`
          : `etiquetas-campanha-${campaign.id}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {campaign.channel === 'email' && campaign.status === 'rascunho' && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => startMailingCampaignAction({ campaignId: campaign.id }))}
            className={`${BUTTON_CLASS} border-[#0d3260] bg-[#040920] text-white hover:bg-[#0d3260]`}
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            Iniciar envio
          </button>
        )}
        {campaign.channel === 'email' && campaign.status === 'em_envio' && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => processMailingBatchAction({ campaignId: campaign.id }))}
            className={`${BUTTON_CLASS} border-[#0d3260] bg-[#040920] text-white hover:bg-[#0d3260]`}
          >
            {isPending && <Loader2 size={16} className="animate-spin" />}
            Processar lote
          </button>
        )}
        {(campaign.status === 'rascunho' || campaign.status === 'em_envio') && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => cancelMailingCampaignAction({ campaignId: campaign.id }))}
            className={`${BUTTON_CLASS} border-amber-300 bg-white text-amber-800 hover:bg-amber-50`}
          >
            Cancelar
          </button>
        )}
        {campaign.channel === 'etiquetas' && (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => downloadEtiquetas('pdf')}
              className={`${BUTTON_CLASS} border-[#0d3260] bg-[#040920] text-white hover:bg-[#0d3260]`}
            >
              {isPending && <Loader2 size={16} className="animate-spin" />}
              Baixar PDF (Pimaco 6182)
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => downloadEtiquetas('csv')}
              className={`${BUTTON_CLASS} border bg-white text-[#040920] hover:bg-slate-50`}
              style={{ borderColor: 'rgba(4,9,32,0.2)' }}
            >
              Baixar CSV
            </button>
          </>
        )}
      </div>
    </div>
  );
}
