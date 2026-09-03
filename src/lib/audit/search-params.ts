const AUDIT_ENTITY_TYPES = [
  'associate',
  'admin',
  'activity',
  'assignment',
  'legal_consultation',
  'legal_process',
  'finance',
  'monthly_payment',
  'official_letter',
  'domain_event',
  'webhook_subscription',
] as const;

type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export interface AuditSearchParams {
  /** @deprecated Prefer keyset `cursor`; retained for deep-link compatibility. */
  page: number;
  /** Keyset cursor: `${createdAtMs}_${id}` for (created_at DESC, id DESC). */
  cursor: string;
  entityType: AuditEntityType | '';
  q: string;
  de: string;
  ate: string;
}

export interface AuditKeysetCursor {
  createdAt: Date;
  id: number;
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function encodeAuditCursor(createdAt: Date, id: number): string {
  return `${createdAt.getTime()}_${id}`;
}

export function parseAuditCursor(raw: string | undefined): AuditKeysetCursor | null {
  if (!raw) return null;
  const match = /^(\d+)_(\d+)$/.exec(raw.trim());
  if (!match) return null;
  const createdAtMs = Number(match[1]);
  const id = Number(match[2]);
  if (!Number.isSafeInteger(createdAtMs) || !Number.isSafeInteger(id) || id <= 0) return null;
  const createdAt = new Date(createdAtMs);
  if (Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

export function parseAuditSearchParams(params: {
  page?: string;
  cursor?: string;
  tipo?: string;
  q?: string;
  de?: string;
  ate?: string;
}): AuditSearchParams {
  const page =
    params.page && /^\d+$/.test(params.page) && Number.parseInt(params.page, 10) > 0
      ? Number.parseInt(params.page, 10)
      : 1;
  const entityType = AUDIT_ENTITY_TYPES.includes(params.tipo as AuditEntityType)
    ? (params.tipo as AuditEntityType)
    : '';
  const q = (params.q ?? '').trim().slice(0, 80);
  const de = params.de && isValidDateString(params.de) ? params.de : '';
  const ate = params.ate && isValidDateString(params.ate) ? params.ate : '';
  const cursor = parseAuditCursor(params.cursor) ? (params.cursor as string).trim() : '';

  return { page, cursor, entityType, q, de, ate };
}
