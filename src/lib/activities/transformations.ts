import { dateOnly, daysFromToday } from '@/lib/utils/date';
import type { BoardActivity, Filters, Status } from './types';

export { dateOnly, daysFromToday };

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
  return items.filter((activity) => {
    if (filters.scope === 'minhas' && activity.assigneeId !== currentUserId) return false;
    if (filters.query && !activity.title.toLowerCase().includes(filters.query.toLowerCase())) {
      return false;
    }
    if (filters.assignee) {
      const assigneeId = Number(filters.assignee);
      if (Number.isFinite(assigneeId) && activity.assigneeId !== assigneeId) return false;
    }
    if (filters.priority && activity.priority !== filters.priority) return false;
    if (filters.associate === '__any' && activity.associateId == null) return false;
    if (filters.associate && filters.associate !== '__any') {
      const associateId = Number(filters.associate);
      if (Number.isFinite(associateId) && activity.associateId !== associateId) return false;
    }
    if (filters.dueWeek) {
      const offset = activity.dueOffset;
      if (offset === null || offset < 0 || offset > 7) return false;
    }
    if (filters.dueLate) {
      const offset = activity.dueOffset;
      if (offset === null || offset >= 0 || activity.status === 'concluido') return false;
    }
    return true;
  });
}

export function groupActivitiesByStatus(activities: BoardActivity[]): Record<Status, BoardActivity[]> {
  const result: Record<Status, BoardActivity[]> = {
    a_fazer: [],
    em_andamento: [],
    aguardando_terceiros: [],
    concluido: [],
  };
  for (const activity of activities) {
    if (!Object.prototype.hasOwnProperty.call(result, activity.status)) {
      throw new Error(`groupActivitiesByStatus: invalid status "${activity.status}" for activity ${activity.id}`);
    }
    result[activity.status].push(activity);
  }
  return result;
}