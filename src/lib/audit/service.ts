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

function sanitizeSensitiveData<T>(value: T, visited = new WeakSet<object>()): T {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (visited.has(value)) {
    return '[circular]' as T;
  }
  visited.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSensitiveData(item, visited)) as T;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : sanitizeSensitiveData(entry, visited),
    ]),
  ) as T;
}

export async function logAuditAction(options: LogAuditOptions): Promise<void> {
  if (!Number.isInteger(options.adminId) || options.adminId <= 0) {
    throw new Error('Invalid audit actor.');
  }

  try {
    await db.insert(auditLogs).values({
      performedBy: options.adminId,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      changes: sanitizeSensitiveData(options.changes),
      metadata: sanitizeSensitiveData(options.metadata),
    });
  } catch (error) {
    console.error('[AUDIT_FAILURE]', {
      adminId: options.adminId,
      action: options.action,
      error,
    });
    // Não propaga o erro para não bloquear a operação principal
  }
}
