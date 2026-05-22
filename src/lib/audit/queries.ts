import { db } from '@/lib/db';
import { auditLogs } from '@/lib/db/schema/audit';
import { and, desc, eq } from 'drizzle-orm';

export interface AssociateAuditEvent {
  action: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export async function getAssociateAuditHistory(
  associateId: number,
  limit = 20,
): Promise<AssociateAuditEvent[]> {
  const rows = await db
    .select({
      action: auditLogs.action,
      changes: auditLogs.changes,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, 'associate'), eq(auditLogs.entityId, associateId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    action: r.action,
    changes: r.changes as Record<string, unknown> | null,
    metadata: r.metadata as Record<string, unknown> | null,
    createdAt: r.createdAt,
  }));
}
