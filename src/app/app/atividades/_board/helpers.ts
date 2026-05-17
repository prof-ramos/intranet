// Re-export from the domain layer.
// UI components can keep importing from this module for convenience.
export {
  normalizeActivity,
  filterActivities,
  groupActivitiesByStatus,
  summarizeActivities,
  dateOnly,
  daysFromToday,
} from '@/lib/activities/transformations';
export { initialsFromName as initials } from '@/lib/utils/initials';
export { formatDueDate } from '@/lib/utils/date';
