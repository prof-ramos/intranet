import { withCache } from '@/lib/cache/with-cache';
import {
  countConsultationsByStatus as repoCountByStatus,
  countConsultationsStale as repoCountStale,
  countConsultationsSlaDueSoon as repoCountSlaDueSoon,
  countConsultationsRespondedThisMonth as repoCountResponded,
  getConsultationById as repoGetById,
  getNotesByEntity as repoGetNotes,
} from './repository';
import { legalConsultationStatus } from '@/lib/db/schema';

const TTL_VOLATILE = 30;

export const countConsultationsByStatus = withCache({
  fn: repoCountByStatus,
  keyFn: (status) => ['consultations-count-by-status', String(status)],
  ttl: TTL_VOLATILE,
  tags: ['legal:summary'],
});

export const countConsultationsStale = (days = 7) =>
  withCache({
    fn: () => repoCountStale(days),
    keyFn: () => ['consultations-stale-count', String(days)],
    ttl: TTL_VOLATILE,
    tags: ['legal:summary'],
  })();

export const countConsultationsSlaDueSoon = (days = 2) =>
  withCache({
    fn: () => repoCountSlaDueSoon(days),
    keyFn: () => ['consultations-sla-due-soon', String(days)],
    ttl: TTL_VOLATILE,
    tags: ['legal:summary'],
  })();

export const countConsultationsRespondedThisMonth = withCache({
  fn: repoCountResponded,
  keyFn: () => ['consultations-responded-month'],
  ttl: TTL_VOLATILE,
  tags: ['legal:summary'],
});

export type { ConsultationListItem, GetConsultationsFilters } from './repository';
export { getConsultationsPaginated } from './repository';
export type { ConsultationDetail } from './repository';

export const getConsultationById = withCache({
  fn: repoGetById,
  keyFn: (id: number) => ['consultation-detail', String(id)],
  ttl: 30,
  tags: ['legal:consultation-detail'],
});

export type { NoteItem } from './repository';

export const getNotesByEntity = withCache({
  fn: repoGetNotes,
  keyFn: (entityType: 'consultation' | 'process', entityId: number) => [
    'legal-notes',
    entityType,
    String(entityId),
  ],
  ttl: 15,
  tags: ['legal:notes'],
});

export type { PendingAction } from './repository';
export { getPendingActions } from './repository';

export { legalConsultationStatus };
