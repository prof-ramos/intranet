import { toCsvCell } from '@/lib/reports/csv';
import { db } from '@/lib/db';
import { getCampaignAssociateIds, getMailingRecipientContexts } from './queries';
import { getCampaignById } from './repository';

/**
 * Gera o CSV de etiquetas de uma campanha (canal etiquetas).
 *
 * Convenção do repo: BOM (\uFEFF) + CRLF para Excel/Gmail abrirem UTF-8
 * corretamente, e toCsvCell (que escapa aspas e bloqueia injeção de
 * fórmula CSV com prefixo \t para valores que começam com = + - @).
 *
 * O público vem dos destinatários persistidos na campanha (mailing_recipients),
 * não do filtro original, para refletir o snapshot no momento do envio.
 */
export async function buildCampaignEtiquetasCsv(campaignId: number): Promise<string> {
  const campaign = await getCampaignById(db, campaignId);
  if (!campaign) throw new Error('Campanha não encontrada.');
  if (campaign.channel !== 'etiquetas') {
    throw new Error('A campanha não usa o canal de etiquetas.');
  }

  const associateIds = await getCampaignAssociateIds(campaignId);
  const recipients = await getMailingRecipientContexts(associateIds);

  const header = [
    'nome',
    'matricula',
    'categoria',
    'situacao_associativa',
    'lotacao',
    'padrao',
    'endereco_completo',
    'bairro',
    'cidade',
    'uf',
    'cep',
    'email',
    'telefone',
  ];

  const rows = recipients.map((recipient) =>
    [
      recipient.nome,
      recipient.matricula,
      recipient.categoria,
      recipient.situacaoAssociativa,
      recipient.lotacao,
      recipient.padrao,
      recipient.enderecoCompleto,
      recipient.bairro,
      recipient.cidade,
      recipient.uf,
      recipient.cep,
      recipient.email,
      recipient.telefone,
    ]
      .map(toCsvCell)
      .join(';'),
  );

  return '\uFEFF' + [header.map(toCsvCell).join(';'), ...rows].join('\r\n');
}
