import { businessDateOnly, dateOnly, daysFromToday } from '@/lib/utils/date';
import type { BoardActivity, Filters, Status } from './types';
import { parsePositiveIntParam } from '@/lib/routing/params';

export { dateOnly, daysFromToday };

export function deriveCompletedAt(
  nextStatus: string,
  currentStatus: string,
  currentCompletedAt: string | null,
  now: Date = new Date(),
): string | null {
  if (nextStatus === 'concluido') return currentCompletedAt ?? businessDateOnly(now);
  if (currentStatus === 'concluido') return null;
  return currentCompletedAt;
}

export function normalizeActivity(activity: BoardActivity): BoardActivity {
  const dueDate = dateOnly(activity.dueDate);
  return {
    ...activity,
    dueDate,
    completedAt: dateOnly(activity.completedAt),
    tags: Array.isArray(activity.tags) ? activity.tags : [],
    dueOffset: daysFromToday(dueDate),
  };
}

export function filterActivities(
  items: BoardActivity[],
  filters: Filters,
  currentUserId: number,
): BoardActivity[] {
  const query = filters.query?.toLowerCase();
  return items.filter((activity) => {
    if (filters.scope === 'minhas' && activity.assigneeId !== currentUserId) return false;
    if (query && !activity.title.toLowerCase().includes(query)) {
      return false;
    }
    if (filters.assignee) {
      const assigneeId = parsePositiveIntParam(filters.assignee);
      if (assigneeId !== null && activity.assigneeId !== assigneeId) return false;
    }
    if (filters.priority && activity.priority !== filters.priority) return false;
    if (filters.status && activity.status !== filters.status) return false;
    if (filters.associate === '__any' && activity.associateId == null) return false;
    if (filters.associate && filters.associate !== '__any') {
      const associateId = parsePositiveIntParam(filters.associate);
      if (associateId !== null && activity.associateId !== associateId) return false;
    }
    if (filters.dueWeek) {
      const offset = activity.dueOffset;
      if (offset == null || offset < 0 || offset > 7) return false;
    }
    if (filters.dueLate) {
      const offset = activity.dueOffset;
      if (offset == null || offset >= 0 || activity.status === 'concluido') return false;
    }
    if (filters.openOnly && activity.status === 'concluido') return false;
    return true;
  });
}

export function groupActivitiesByStatus(
  activities: BoardActivity[],
): Record<Status, BoardActivity[]> {
  const result: Record<Status, BoardActivity[]> = {
    a_fazer: [],
    em_andamento: [],
    aguardando_terceiros: [],
    concluido: [],
  };
  for (const activity of activities) {
    if (!Object.prototype.hasOwnProperty.call(result, activity.status)) {
      throw new Error(
        `groupActivitiesByStatus: invalid status "${activity.status}" for activity ${activity.id}`,
      );
    }
    result[activity.status].push(activity);
  }
  return result;
}

export function summarizeActivities(activities: BoardActivity[]): {
  byStatus: Record<Status, number>;
  late: number;
  total: number;
} {
  const byStatus: Record<Status, number> = {
    a_fazer: 0,
    em_andamento: 0,
    aguardando_terceiros: 0,
    concluido: 0,
  };
  let late = 0;

  for (const activity of activities) {
    byStatus[activity.status] += 1;
    const offset = activity.dueOffset;
    if (offset !== null && offset < 0 && activity.status !== 'concluido') {
      late += 1;
    }
  }

  return { byStatus, late, total: activities.length };
}
