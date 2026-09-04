import { and, asc, count, eq } from 'drizzle-orm';
import type { DbExecutor } from '@/lib/db';
import { mailingCampaigns, mailingRecipients, type NewMailingCampaign } from '@/lib/db/schema';
import type { MailingCampaignStatus } from './types';
import { MAILING_MAX_ATTEMPTS } from './types';

export interface MailingRecipientSnapshot {
  associateId: number;
  name: string;
  emailCiphertext: string | null;
}

export async function insertCampaignWithRecipients(
  tx: DbExecutor,
  campaign: NewMailingCampaign,
  recipients: MailingRecipientSnapshot[],
): Promise<number> {
  const [inserted] = await tx
    .insert(mailingCampaigns)
    .values(campaign)
    .returning({ id: mailingCampaigns.id });
  if (!inserted) {
    throw new Error('Não foi possível criar a campanha.');
  }
  if (recipients.length > 0) {
    await tx.insert(mailingRecipients).values(
      recipients.map((recipient) => ({
        campaignId: inserted.id,
        associateId: recipient.associateId,
        recipientName: recipient.name,
        emailCiphertext: recipient.emailCiphertext,
      })),
    );
  }
  return inserted.id;
}

export async function getCampaignById(tx: DbExecutor, id: number) {
  const [campaign] = await tx.select().from(mailingCampaigns).where(eq(mailingCampaigns.id, id));
  return campaign ?? null;
}

export async function updateCampaignStatus(
  tx: DbExecutor,
  id: number,
  status: MailingCampaignStatus,
  extra?: { startedAt?: Date; completedAt?: Date },
): Promise<void> {
  await tx
    .update(mailingCampaigns)
    .set({
      status,
      ...(extra?.startedAt ? { startedAt: extra.startedAt } : {}),
      ...(extra?.completedAt ? { completedAt: extra.completedAt } : {}),
    })
    .where(eq(mailingCampaigns.id, id));
}

export async function markRecipientResult(
  tx: DbExecutor,
  recipientId: number,
  result: { ok: boolean; error?: string },
): Promise<void> {
  const [current] = await tx
    .select({ attempts: mailingRecipients.attempts, status: mailingRecipients.status })
    .from(mailingRecipients)
    .where(eq(mailingRecipients.id, recipientId));
  if (!current || current.status !== 'pendente') return;

  const attempts = current.attempts + 1;
  const exhausted = attempts >= MAILING_MAX_ATTEMPTS;

  await tx
    .update(mailingRecipients)
    .set(
      result.ok
        ? { status: 'enviado', attempts, sentAt: new Date(), lastError: null }
        : {
            status: exhausted ? 'falhou' : 'pendente',
            attempts,
            lastError: result.error ?? null,
          },
    )
    .where(eq(mailingRecipients.id, recipientId));
}

export async function cancelPendingRecipients(tx: DbExecutor, campaignId: number): Promise<void> {
  await tx
    .update(mailingRecipients)
    .set({ status: 'cancelado' })
    .where(
      and(eq(mailingRecipients.campaignId, campaignId), eq(mailingRecipients.status, 'pendente')),
    );
}

export async function getPendingRecipients(
  tx: DbExecutor,
  campaignId: number,
  limit: number,
): Promise<{ id: number; associateId: number | null; emailCiphertext: string | null }[]> {
  return tx
    .select({
      id: mailingRecipients.id,
      associateId: mailingRecipients.associateId,
      emailCiphertext: mailingRecipients.emailCiphertext,
    })
    .from(mailingRecipients)
    .where(
      and(eq(mailingRecipients.campaignId, campaignId), eq(mailingRecipients.status, 'pendente')),
    )
    .orderBy(asc(mailingRecipients.id))
    .limit(limit);
}

export interface CampaignRecipientTotals {
  sent: number;
  failed: number;
  pending: number;
}

export async function getCampaignRecipientTotals(
  tx: DbExecutor,
  campaignId: number,
): Promise<CampaignRecipientTotals> {
  const rows = await tx
    .select({ status: mailingRecipients.status, total: count() })
    .from(mailingRecipients)
    .where(eq(mailingRecipients.campaignId, campaignId))
    .groupBy(mailingRecipients.status);

  const totals: CampaignRecipientTotals = { sent: 0, failed: 0, pending: 0 };
  for (const row of rows) {
    if (row.status === 'enviado') totals.sent = row.total;
    if (row.status === 'falhou') totals.failed = row.total;
    if (row.status === 'pendente') totals.pending = row.total;
  }
  return totals;
}

/**
 * Atualiza os contadores da campanha a partir dos destinatários e, quando não
 * restam destinatários pendentes, marca a campanha como concluída.
 */
export async function finalizeCampaignProgress(tx: DbExecutor, campaignId: number): Promise<void> {
  const totals = await getCampaignRecipientTotals(tx, campaignId);
  const completed = totals.pending === 0;
  await tx
    .update(mailingCampaigns)
    .set({
      sentCount: totals.sent,
      failedCount: totals.failed,
      ...(completed ? { status: 'concluida', completedAt: new Date() } : {}),
    })
    .where(eq(mailingCampaigns.id, campaignId));
}
