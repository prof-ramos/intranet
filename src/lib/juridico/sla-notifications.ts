import { db } from '@/lib/db';
import { legalConsultations } from '@/lib/db/schema';
import { and, ne } from 'drizzle-orm';
import { isSlaDueSoonSql } from './sla';
import { emitSlaWarning } from '@/lib/events';

export async function checkAndEmitSlaWarnings(): Promise<void> {
  const dueSoon = await db
    .select({
      id: legalConsultations.id,
      internalNumber: legalConsultations.internalNumber,
      title: legalConsultations.title,
      slaDueDate: legalConsultations.slaDueDate,
      createdBy: legalConsultations.createdBy,
    })
    .from(legalConsultations)
    .where(
      and(
        ne(legalConsultations.status, 'arquivada'),
        isSlaDueSoonSql(legalConsultations.slaDueDate),
      ),
    );

  await Promise.allSettled(
    dueSoon
      .filter((c) => c.slaDueDate !== null && c.createdBy !== null)
      .map((c) =>
        emitSlaWarning({
          consultationId: c.id,
          internalNumber: c.internalNumber,
          title: c.title,
          slaDueDate: c.slaDueDate!.toISOString(),
          recipientId: c.createdBy!,
        }),
      ),
  );
}
