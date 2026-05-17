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
  page: number;
  entityType: AuditEntityType | '';
  q: string;
  de: string;
  ate: string;
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export function parseAuditSearchParams(params: {
  page?: string;
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

  return { page, entityType, q, de, ate };
}
