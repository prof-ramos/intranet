import { unstable_cache } from 'next/cache';
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

export const countConsultationsByStatus = (status: Parameters<typeof repoCountByStatus>[0]) =>
  unstable_cache(
    async () => repoCountByStatus(status),
    ['consultations-count-by-status', String(status)],
    { revalidate: TTL_VOLATILE, tags: ['legal', 'dashboard'] },
  )();

export const countConsultationsStale = (days = 7) =>
  unstable_cache(async () => repoCountStale(days), ['consultations-stale-count', String(days)], {
    revalidate: TTL_VOLATILE,
    tags: ['legal', 'dashboard'],
  })();

export const countConsultationsSlaDueSoon = (days = 2) =>
  unstable_cache(
    async () => repoCountSlaDueSoon(days),
    ['consultations-sla-due-soon', String(days)],
    { revalidate: TTL_VOLATILE, tags: ['legal', 'dashboard'] },
  )();

export const countConsultationsRespondedThisMonth = unstable_cache(
  repoCountResponded,
  ['consultations-responded-month'],
  { revalidate: TTL_VOLATILE, tags: ['legal', 'dashboard'] },
);

export type { ConsultationListItem, GetConsultationsFilters } from './repository';
export { getConsultationsPaginated } from './repository';
export type { ConsultationDetail } from './repository';
export const getConsultationById = (id: number) =>
  unstable_cache(async () => repoGetById(id), ['consultation-detail', String(id)], {
    revalidate: 30,
    tags: ['legal', 'consultation-detail'],
  })();

export type { NoteItem } from './repository';
export const getNotesByEntity = (entityType: 'consultation' | 'process', entityId: number) =>
  unstable_cache(
    async () => repoGetNotes(entityType, entityId),
    ['legal-notes', entityType, String(entityId)],
    { revalidate: 15, tags: ['legal', 'legal-notes'] },
  )();
export type { PendingAction } from './repository';
export { getPendingActions } from './repository';

export { legalConsultationStatus };
