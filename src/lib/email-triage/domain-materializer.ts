import { db } from '@/lib/db';
import { and, eq, inArray } from 'drizzle-orm';
import { legalConsultations } from '@/lib/db/schema/legal-consultations';
import { lawyers } from '@/lib/db/schema/lawyers';
import { emailTriagens } from '@/lib/db/schema/email-triage';
import { createConsultationService } from '@/lib/juridico/service';
import { createActivityService } from '@/lib/activities/service';
import { resolveSystemBotUser } from '@/lib/system-users';
import { buildCorrelationContext } from './correlation-context';
import { createLogger } from '@/lib/logger';
import type { EmailPayload, EmailTriageResult } from './schema';

const log = createLogger('domain-materializer');

async function identifyLawyerId(
  advogadoEmail: string | null,
  sender: string,
): Promise<number | null> {
  for (const email of [advogadoEmail, sender].filter(Boolean) as string[]) {
    const [row] = await db
      .select({ id: lawyers.id })
      .from(lawyers)
      .where(eq(lawyers.email, email.toLowerCase().trim()))
      .limit(1);
    if (row) return row.id;
  }
  return null;
}

async function findOpenConsultationId(
  threadId: string,
  associateId: number | null,
  lawyerId: number | null,
): Promise<number | null> {
  const [byThread] = await db
    .select({ id: legalConsultations.id })
    .from(legalConsultations)
    .where(
      and(
        eq(legalConsultations.threadId, threadId),
        inArray(legalConsultations.status, ['aberta', 'aguardando_escritorio']),
      ),
    )
    .limit(1);
  if (byThread) return byThread.id;

  if (associateId && lawyerId) {
    // Only auto-link when exactly 1 open consultation exists for this pair.
    // 0 → create new; 2+ → ambiguous matters, create new to avoid wrong linkage.
    const candidates = await db
      .select({ id: legalConsultations.id })
      .from(legalConsultations)
      .where(
        and(
          eq(legalConsultations.associateId, associateId),
          eq(legalConsultations.lawyerId, lawyerId),
          inArray(legalConsultations.status, ['aberta', 'aguardando_escritorio']),
        ),
      )
      .limit(2);
    if (candidates.length === 1) return candidates[0].id;
  }

  return null;
}

/**
 * Materializes a juridico email triage into domain objects:
 * - finds or creates a Consulta Jurídica
 * - creates an Atividade with 5-day deadline
 * - links email_triagens to the consultation
 *
 * Non-throwing: all steps are wrapped individually so a partial failure
 * does not prevent the remaining steps from running.
 */
export async function materializarNoDominio(
  payload: EmailPayload,
  result: EmailTriageResult,
  triageId: number,
): Promise<void> {
  if (result.categoria !== 'juridico') return;

  // Idempotency: skip if this triage was already materialized.
  // persistTriage upserts on message_id, so retries reuse the same triageId;
  // a pre-set consultationId means activities and domain links already exist.
  const [triageRow] = await db
    .select({ consultationId: emailTriagens.consultationId })
    .from(emailTriagens)
    .where(eq(emailTriagens.id, triageId))
    .limit(1);
  if (triageRow?.consultationId != null) {
    log.info('Email already materialized, skipping.', { triageId });
    return;
  }

  let botUserId: number;
  try {
    botUserId = await resolveSystemBotUser();
  } catch (err) {
    log.error('Cannot materialize: system bot user unavailable.', { triageId }, err instanceof Error ? err : undefined);
    return;
  }

  // 1. Identify lawyer
  const lawyerId = await identifyLawyerId(result.advogado_email, payload.sender).catch(() => null);

  // 2. Find associate via correlation context (sender may be Gabriel when forwarding)
  const context = await buildCorrelationContext(payload).catch(() => ({ associate: null, consultations: [] as { id: number }[] }));
  const associateId = context.associate?.id ?? null;

  // 3. Find or create consultation
  let consultationId: number | null = null;
  try {
    const existingId = await findOpenConsultationId(payload.thread_id, associateId, lawyerId);

    if (existingId !== null) {
      consultationId = existingId;
      await db
        .update(legalConsultations)
        .set({ lastInteractionAt: new Date(), threadId: payload.thread_id })
        .where(eq(legalConsultations.id, consultationId));
      log.info('Linked email to existing consultation.', { triageId, consultationId });
    } else {
      const created = await createConsultationService({
        title: payload.subject.slice(0, 255) || 'Consulta via Controller ASOF',
        questionSummary: result.resumo,
        questionFullText: null,
        associateId,
        lawyerId,
        threadId: payload.thread_id,
        slaDays: 5,
        createdBy: botUserId,
      });
      consultationId = created.id;
      log.info('Created new consultation from email.', { triageId, consultationId });
    }
  } catch (err) {
    log.warn('Failed to find/create consultation (non-fatal).', { triageId }, err instanceof Error ? err : undefined);
  }

  // 4. Create Atividade with 5-day deadline
  try {
    const dueDate = new Date(payload.received_at);
    dueDate.setDate(dueDate.getDate() + 5);
    const priority =
      result.nivel_risco === 'critico' || result.nivel_risco === 'alto'
        ? ('urgente' as const)
        : ('normal' as const);

    await createActivityService({
      title: `[Controller] ${payload.subject}`.slice(0, 255),
      description: result.resumo,
      status: 'em_andamento',
      priority,
      assigneeId: null,
      associateId,
      dueDate: dueDate.toISOString(),
      tags: ['controller', 'email', 'juridico'],
      createdBy: botUserId,
    });
  } catch (err) {
    log.warn('Failed to create activity for email (non-fatal).', { triageId }, err instanceof Error ? err : undefined);
  }

  // 5. Link email_triagens to consultation
  if (consultationId !== null) {
    try {
      await db
        .update(emailTriagens)
        .set({ consultationId, lawyerId })
        .where(eq(emailTriagens.id, triageId));
    } catch (err) {
      log.warn('Failed to link triage to consultation (non-fatal).', { triageId }, err instanceof Error ? err : undefined);
    }
  }
}
