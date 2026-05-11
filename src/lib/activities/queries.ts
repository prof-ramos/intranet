import type { AuthUser } from '@/lib/auth/config';
import type { ActivitiesBoardData, BoardAssociate, BoardPerson } from './types';
import { findActivities, findActiveAdmins, findActiveAssociates, mapActivityRowToBoardActivity } from './repository';

export async function getActivitiesBoardData(
  user: Pick<AuthUser, 'userId' | 'name' | 'role'>,
  options: { limit?: number; offset?: number } = {},
): Promise<ActivitiesBoardData> {
  const [activityRows, adminRows, associateRows] = await Promise.all([
    findActivities(options),
    findActiveAdmins(),
    findActiveAssociates(),
  ]);

  const currentUser: BoardPerson = {
    id: user.userId,
    name: user.name,
    role: user.role,
  };

  const peopleById = new Map<number, BoardPerson>();
  peopleById.set(currentUser.id, currentUser);
  for (const admin of adminRows) {
    peopleById.set(admin.id, {
      id: admin.id,
      name: admin.name,
      role: admin.role,
    });
  }

  return {
    initialActivities: activityRows.map(mapActivityRowToBoardActivity),
    people: [...peopleById.values()],
    associates: associateRows as BoardAssociate[],
    currentUser,
  };
}

export async function getActivitiesFormData(user: Pick<AuthUser, 'userId' | 'name' | 'role'>) {
  const [adminRows, associateRows] = await Promise.all([
    findActiveAdmins(),
    findActiveAssociates(),
  ]);

  const currentUser: BoardPerson = {
    id: user.userId,
    name: user.name,
    role: user.role,
  };

  const peopleById = new Map<number, BoardPerson>();
  peopleById.set(currentUser.id, currentUser);
  for (const admin of adminRows) {
    peopleById.set(admin.id, {
      id: admin.id,
      name: admin.name,
      role: admin.role,
    });
  }

  return {
    people: [...peopleById.values()],
    associates: associateRows as BoardAssociate[],
    currentUser,
  };
}