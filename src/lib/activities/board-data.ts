// Re-export from the new domain layer.
// Consumers can migrate to @/lib/activities/queries directly.
export { getActivitiesBoardData } from './queries';
export type { ActivitiesBoardData } from './types';
export { mapActivityRowToBoardActivity } from './repository';