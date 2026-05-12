import { db } from '@/lib/db';
import { auditLogs, type NewAuditLog } from '@/lib/db/schema/audit';

export interface LogAuditOptions {
  adminId: number;
  action: string;
  entityType: NewAuditLog['entityType'];
  entityId?: number | null;
  changes?: NewAuditLog['changes'];
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEY_PATTERN = /cpf|siape|email|endereco|address|rg|telefone|phone|whatsapp/i;

function sanitizeSensitiveData<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitiveData(item)) as T;
  }
  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : sanitizeSensitiveData(entry),
    ]),
  ) as T;
}

export async function logAuditAction(options: LogAuditOptions): Promise<void> {
  if (!Number.isInteger(options.adminId) || options.adminId <= 0) {
    throw new Error('Invalid audit actor.');
  }

  await db.insert(auditLogs).values({
    performedBy: options.adminId,
    action: options.action,
    entityType: options.entityType,
    entityId: options.entityId,
    changes: sanitizeSensitiveData(options.changes),
    metadata: sanitizeSensitiveData(options.metadata),
  });
}
