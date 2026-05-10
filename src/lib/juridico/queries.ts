import { unstable_cache } from 'next/cache';
import {
  countConsultationsByStatus as repoCountByStatus,
  countConsultationsStale as repoCountStale,
  countConsultationsSlaOverdue as repoCountSlaOverdue,
  countConsultationsRespondedThisMonth as repoCountResponded,
  getConsultationById as repoGetById,
  getNotesByEntity as repoGetNotes,
} from './repository';
import { legalConsultationStatus } from '@/lib/db/schema';

const TTL_VOLATILE = 30;

export const countConsultationsByStatus = unstable_cache(
  repoCountByStatus,
  ['consultations-count-by-status'],
  { revalidate: TTL_VOLATILE, tags: ['legal', 'dashboard'] },
);

export const countConsultationsStale = unstable_cache(
  repoCountStale,
  ['consultations-stale-count'],
  { revalidate: TTL_VOLATILE, tags: ['legal', 'dashboard'] },
);

export const countConsultationsSlaOverdue = unstable_cache(
  repoCountSlaOverdue,
  ['consultations-sla-overdue'],
  { revalidate: TTL_VOLATILE, tags: ['legal', 'dashboard'] },
);

export const countConsultationsRespondedThisMonth = unstable_cache(
  repoCountResponded,
  ['consultations-responded-month'],
  { revalidate: TTL_VOLATILE, tags: ['legal', 'dashboard'] },
);

export type { ConsultationListItem, GetConsultationsFilters } from './repository';
export { getConsultationsPaginated } from './repository';
export type { ConsultationDetail } from './repository';
export const getConsultationById = unstable_cache(
  (id: number) => repoGetById(id),
  ['consultation-detail'],
  { revalidate: 30, tags: ['legal', 'consultation-detail'] },
);

export type { NoteItem } from './repository';
export const getNotesByEntity = unstable_cache(
  (entityType: string, entityId: number) => repoGetNotes(entityType, entityId),
  ['legal-notes'],
  { revalidate: 15, tags: ['legal', 'legal-notes'] },
);
export type { PendingAction } from './repository';
export { getPendingActions } from './repository';

export { legalConsultationStatus };
