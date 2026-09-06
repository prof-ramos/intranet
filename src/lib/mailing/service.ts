import { db } from '@/lib/db';
import { type NewMailingCampaign } from '@/lib/db/schema';
import { decryptPii, encryptPii } from '@/lib/crypto/pii';
import { createLogger } from '@/lib/logger';
import { toSafeErrorLog } from '@/lib/error-log';
import { sendEmail } from '@/lib/email';
import { env } from '@/lib/env';
import { logAuditAction } from '@/lib/audit/service';
import { DEFAULT_FIELDS_BY_MODE, generateEtiquetasFromRecipients } from '@/lib/etiquetas';
import {
  countAudience,
  fetchAudience,
  getCampaignAssociateIds,
  getMailingRecipientContexts,
} from './queries';
import {
  cancelPendingRecipients,
  finalizeCampaignProgress,
  getCampaignById,
  insertCampaignWithRecipients,
  markRecipientCancelled,
  markRecipientResult,
  updateCampaignStatus,
  claimPendingRecipients,
} from './repository';
import {
  findUnknownTemplateVariables,
  renderTemplateHtml,
  renderTemplateText,
  type MailingTemplateContext,
} from './templates';
import { createMailingCampaignSchema } from './validations';
import {
  MAILING_MAX_RECIPIENTS,
  MAILING_PREVIEW_SAMPLE,
  type MailingAudienceFilters,
  type MailingChannel,
  type MailingRecipientContext,
} from './types';

const logger = createLogger('mailing:service');

export interface MailingPreviewResult {
  count: number;
  sample: { associateId: number; name: string }[];
  exceedsLimit: boolean;
}

export async function previewMailingAudience(
  channel: MailingChannel,
  filters: MailingAudienceFilters,
): Promise<MailingPreviewResult> {
  const total = await countAudience(filters, channel);
  const sample = await fetchAudience(filters, channel, MAILING_PREVIEW_SAMPLE);
  return {
    count: total,
    sample: sample.map((member) => ({ associateId: member.associateId, name: member.name })),
    exceedsLimit: total > MAILING_MAX_RECIPIENTS,
  };
}

export interface CreateCampaignResult {
  id: number;
}

export async function createMailingCampaign(
  rawInput: unknown,
  userId: number,
): Promise<CreateCampaignResult> {
  const input = createMailingCampaignSchema.parse(rawInput);

  const unknownVariables = findUnknownTemplateVariables(input.templateBody);
  if (unknownVariables.length > 0) {
    throw new Error(
      `O template usa variáveis desconhecidas: ${unknownVariables
        .map((variable) => `{{${variable}}}`)
        .join(', ')}.`,
    );
  }

  const total = await countAudience(input.filters, input.channel);
  if (total > MAILING_MAX_RECIPIENTS) {
    throw new Error(
      `O público selecionado excede o limite de ${MAILING_MAX_RECIPIENTS} destinatários por campanha.`,
    );
  }

  const members = await fetchAudience(input.filters, input.channel, MAILING_MAX_RECIPIENTS);
  // Guarda contra corrida entre a contagem (contagem) e a seleção (members).
  if (members.length !== total) {
    throw new Error('Não foi possível montar a lista completa de destinatários. Tente novamente.');
  }

  const campaign: NewMailingCampaign = {
    name: input.name,
    channel: input.channel,
    subject: input.channel === 'email' ? input.subject : null,
    templateBody: input.templateBody,
    filters: input.filters as unknown as Record<string, unknown>,
    recipientCount: members.length,
    createdBy: userId,
  };

  const id = await db.transaction(async (tx) => {
    const campaignId = await insertCampaignWithRecipients(
      tx,
      campaign,
      members.map((member) => ({
        associateId: member.associateId,
        name: member.name,
        emailCiphertext: member.email ? encryptPii(member.email) : null,
      })),
    );
    await logAuditAction({
      adminId: userId,
      action: 'mailing.campaign.created',
      entityType: 'associate',
      metadata: { campaignId, channel: input.channel, recipientCount: members.length },
      executor: tx,
    });
    return campaignId;
  });

  return { id };
}

export async function startMailingCampaign(campaignId: number, userId: number): Promise<void> {
  const campaign = await getCampaignById(db, campaignId);
  if (!campaign) throw new Error('Campanha não encontrada.');
  if (campaign.channel !== 'email') {
    throw new Error('Somente campanhas por e-mail possuem envio em lote.');
  }
  if (campaign.status !== 'rascunho') {
    throw new Error('A campanha não pode ser iniciada a partir do status atual.');
  }

  await db.transaction(async (tx) => {
    await updateCampaignStatus(tx, campaignId, 'em_envio', { startedAt: new Date() });
    await logAuditAction({
      adminId: userId,
      action: 'mailing.campaign.started',
      entityType: 'associate',
      metadata: { campaignId },
      executor: tx,
    });
  });
}

export async function cancelMailingCampaign(campaignId: number, userId: number): Promise<void> {
  const campaign = await getCampaignById(db, campaignId);
  if (!campaign) throw new Error('Campanha não encontrada.');
  if (!['rascunho', 'em_envio'].includes(campaign.status)) {
    throw new Error('A campanha não pode ser cancelada no status atual.');
  }

  await db.transaction(async (tx) => {
    await updateCampaignStatus(tx, campaignId, 'cancelada');
    await cancelPendingRecipients(tx, campaignId);
    await logAuditAction({
      adminId: userId,
      action: 'mailing.campaign.cancelled',
      entityType: 'associate',
      metadata: { campaignId },
      executor: tx,
    });
  });
}

export interface ProcessMailingBatchResult {
  processed: number;
  sent: number;
  failed: number;
  skipped?: 'mailjet_not_configured' | 'sender_not_validated';
}

function buildContext(
  recipient: MailingRecipientContext | undefined,
  fallbackName: string,
  fallbackEmail: string | null,
): MailingTemplateContext {
  return {
    nome: recipient?.nome ?? fallbackName,
    matricula: recipient?.matricula ?? null,
    categoria: recipient?.categoria ?? null,
    situacao_associativa: recipient?.situacaoAssociativa ?? null,
    lotacao: recipient?.lotacao ?? null,
    padrao: recipient?.padrao ?? null,
    endereco_completo: recipient?.enderecoCompleto ?? null,
    bairro: recipient?.bairro ?? null,
    cidade: recipient?.cidade ?? null,
    uf: recipient?.uf ?? null,
    cep: recipient?.cep ?? null,
    email: fallbackEmail ?? recipient?.email ?? null,
    telefone: recipient?.telefone ?? null,
  };
}

/**
 * Processa um lote de envios da fila de campanhas de e-mail.
 * Executado pelo cron `/api/v1/mailing/process`; também pode ser chamado
 * manualmente em dev. Nunca loga PII (e-mails são gravados cifrados).
 */
export async function processMailingBatch(limit: number): Promise<ProcessMailingBatchResult> {
  const result: ProcessMailingBatchResult = { processed: 0, sent: 0, failed: 0 };

  if (!env.MAILJET_API_KEY || !env.MAILJET_SECRET_KEY) {
    logger.info('Envio em lote pulado: MAILJET não configurado.');
    return { ...result, skipped: 'mailjet_not_configured' };
  }
  if (!env.MAILJET_SENDER_VALIDATED) {
    logger.info('Envio em lote pulado: remetente MAILJET ainda não validado.');
    return { ...result, skipped: 'sender_not_validated' };
  }

  const campaigns = await db.query.mailingCampaigns.findMany({
    where: (campaign, { eq, and }) =>
      and(eq(campaign.channel, 'email'), eq(campaign.status, 'em_envio')),
    orderBy: (campaign, { asc }) => [asc(campaign.startedAt)],
  });

  let remaining = limit;

  for (const campaign of campaigns) {
    if (remaining <= 0) break;

    const pending = await claimPendingRecipients(db, campaign.id, remaining);
    if (pending.length === 0) {
      await finalizeAndAuditCampaign(campaign.id);
      continue;
    }

    const associateIds = pending
      .map((recipient) => recipient.associateId)
      .filter((associateId): associateId is number => associateId !== null);
    const recipientRows = await getMailingRecipientContexts(associateIds);
    const contextByAssociate = new Map(recipientRows.map((row) => [row.associateId, row] as const));

    for (const recipient of pending) {
      remaining -= 1;
      result.processed += 1;

      const liveCampaign = await getCampaignById(db, campaign.id);
      if (!liveCampaign || liveCampaign.status !== 'em_envio') {
        await markRecipientCancelled(db, recipient.id);
        continue;
      }

      const associate =
        recipient.associateId !== null ? contextByAssociate.get(recipient.associateId) : undefined;
      const snapshotEmail =
        recipient.emailCiphertext !== null ? decryptPii(recipient.emailCiphertext) : null;
      const email = snapshotEmail ?? associate?.email ?? null;

      if (!email) {
        await markRecipientResult(db, recipient.id, { ok: false, error: 'sem_destinatario' });
        result.failed += 1;
        continue;
      }

      const context = buildContext(associate, recipient.recipientName, email);
      try {
        await sendEmail({
          to: email,
          toName: context.nome ?? recipient.recipientName,
          subject: campaign.subject ?? '',
          htmlBody: renderTemplateHtml(campaign.templateBody, context),
          textBody: renderTemplateText(campaign.templateBody, context),
        });
        await markRecipientResult(db, recipient.id, { ok: true });
        result.sent += 1;
      } catch (error) {
        logger.warn('Falha ao enviar e-mail de campanha', {
          campaignId: campaign.id,
          recipientId: recipient.id,
          error: toSafeErrorLog(error),
        });
        await markRecipientResult(db, recipient.id, { ok: false, error: 'envio_falhou' });
        result.failed += 1;
      }
    }

    await finalizeAndAuditCampaign(campaign.id);
  }

  return result;
}

async function finalizeAndAuditCampaign(campaignId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const progress = await finalizeCampaignProgress(tx, campaignId);
    if (!progress.transitioned || !progress.terminalStatus) return;
    await logAuditAction({
      adminId: null,
      action:
        progress.terminalStatus === 'falhou'
          ? 'mailing.campaign.failed'
          : 'mailing.campaign.completed',
      entityType: 'associate',
      metadata: {
        campaignId,
        sent: progress.totals.sent,
        failed: progress.totals.failed,
      },
      executor: tx,
    });
  });
}

export async function generateCampaignEtiquetasPdf(campaignId: number): Promise<Uint8Array> {
  const campaign = await getCampaignById(db, campaignId);
  if (!campaign) throw new Error('Campanha não encontrada.');
  if (campaign.channel !== 'etiquetas') {
    throw new Error('A campanha não usa o canal de etiquetas.');
  }
  const associateIds = await getCampaignAssociateIds(campaignId);
  const recipients = (await getMailingRecipientContexts(associateIds)).map((recipient) => ({
    id: String(recipient.associateId),
    nome: recipient.nome,
    matricula: recipient.matricula,
    categoria: recipient.categoria,
    situacaoAssociativa: recipient.situacaoAssociativa,
    lotacao: recipient.lotacao,
    posto: recipient.lotacao,
    enderecoCompleto: recipient.enderecoCompleto,
    bairro: recipient.bairro,
    cidade: recipient.cidade,
    uf: recipient.uf,
    cep: recipient.cep,
    email: recipient.email,
    telefone: recipient.telefone,
  }));
  return generateEtiquetasFromRecipients({
    templateCode: '6182',
    mode: 'postal',
    recipients,
    selectedFields: DEFAULT_FIELDS_BY_MODE.postal,
  });
}
