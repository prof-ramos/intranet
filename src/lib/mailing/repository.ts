import { and, count, eq, inArray, sql } from 'drizzle-orm';
import type { DbExecutor } from '@/lib/db';
import { mailingCampaigns, mailingRecipients, type NewMailingCampaign } from '@/lib/db/schema';
import type { MailingCampaignStatus } from './types';
import { MAILING_MAX_ATTEMPTS, MAILING_STALE_CLAIM_MS } from './types';

export interface MailingRecipientSnapshot {
  associateId: number;
  name: string;
  emailCiphertext: string | null;
}

export interface ClaimedMailingRecipient {
  id: number;
  associateId: number | null;
  recipientName: string;
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

const CLAIMABLE_STATUSES = ['pendente', 'enviando'] as const;

function isClaimableStatus(
  status: (typeof mailingRecipients.$inferSelect)['status'],
): status is (typeof CLAIMABLE_STATUSES)[number] {
  return status === 'pendente' || status === 'enviando';
}

export async function claimPendingRecipients(
  tx: DbExecutor,
  campaignId: number,
  limit: number,
): Promise<ClaimedMailingRecipient[]> {
  if (!Number.isInteger(limit) || limit < 1) return [];

  const staleBefore = new Date(Date.now() - MAILING_STALE_CLAIM_MS);

  return tx
    .update(mailingRecipients)
    .set({ status: 'enviando', updatedAt: new Date() })
    .where(
      inArray(
        mailingRecipients.id,
        sql`(
          SELECT mr.id
          FROM mailing_recipients mr
          INNER JOIN mailing_campaigns mc ON mc.id = mr.campaign_id
          WHERE mr.campaign_id = ${campaignId}
            AND mc.status = 'em_envio'
            AND (
              mr.status = 'pendente'
              OR (mr.status = 'enviando' AND mr.updated_at < ${staleBefore})
            )
          ORDER BY mr.id ASC
          LIMIT ${limit}
          FOR UPDATE OF mr SKIP LOCKED
        )`,
      ),
    )
    .returning({
      id: mailingRecipients.id,
      associateId: mailingRecipients.associateId,
      recipientName: mailingRecipients.recipientName,
      emailCiphertext: mailingRecipients.emailCiphertext,
    });
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
  if (!current || !isClaimableStatus(current.status)) return;

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
    .where(
      and(
        eq(mailingRecipients.id, recipientId),
        inArray(mailingRecipients.status, CLAIMABLE_STATUSES),
      ),
    );
}

export async function markRecipientCancelled(tx: DbExecutor, recipientId: number): Promise<void> {
  await tx
    .update(mailingRecipients)
    .set({ status: 'cancelado' })
    .where(
      and(
        eq(mailingRecipients.id, recipientId),
        inArray(mailingRecipients.status, CLAIMABLE_STATUSES),
      ),
    );
}

export async function cancelPendingRecipients(tx: DbExecutor, campaignId: number): Promise<void> {
  await tx
    .update(mailingRecipients)
    .set({ status: 'cancelado' })
    .where(
      and(eq(mailingRecipients.campaignId, campaignId), eq(mailingRecipients.status, 'pendente')),
    );
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
    if (row.status === 'pendente' || row.status === 'enviando')
      totals.pending = totals.pending + row.total;
  }
  return totals;
}

/**
 * Atualiza os contadores da campanha a partir dos destinatários e, quando não
 * restam destinatários pendentes/em envio, marca como concluída somente se
 * ainda estiver `em_envio` — nunca sobrescreve `cancelada`.
 */
export async function finalizeCampaignProgress(tx: DbExecutor, campaignId: number): Promise<void> {
  const totals = await getCampaignRecipientTotals(tx, campaignId);
  await tx
    .update(mailingCampaigns)
    .set({
      sentCount: totals.sent,
      failedCount: totals.failed,
    })
    .where(eq(mailingCampaigns.id, campaignId));

  if (totals.pending > 0) return;

  await tx
    .update(mailingCampaigns)
    .set({ status: 'concluida', completedAt: new Date() })
    .where(and(eq(mailingCampaigns.id, campaignId), eq(mailingCampaigns.status, 'em_envio')));
}
