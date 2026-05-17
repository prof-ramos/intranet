import type { AuthUser } from '@/lib/auth/config';
import type { ActivitiesBoardData, BoardAssociate, BoardPerson } from './types';
import { findActivities, findActiveAdmins, findActiveAssociates, mapActivityRowToBoardActivity } from './repository';

function buildPeopleList(
  user: Pick<AuthUser, 'userId' | 'name' | 'role'>,
  adminRows: Array<{ id: number; name: string; role: BoardPerson['role'] }>,
): { currentUser: BoardPerson; people: BoardPerson[] } {
  const currentUser: BoardPerson = {
    id: user.userId,
    name: user.name,
    role: user.role,
  };

  const peopleById = new Map<number, BoardPerson>();
  peopleById.set(currentUser.id, currentUser);

  for (const admin of adminRows) {
    if (admin.id === currentUser.id) {
      continue;
    }

    peopleById.set(admin.id, {
      id: admin.id,
      name: admin.name,
      role: admin.role,
    });
  }

  return {
    currentUser,
    people: [...peopleById.values()],
  };
}

export async function getActivitiesBoardData(
  user: Pick<AuthUser, 'userId' | 'name' | 'role'>,
  options: { limit?: number; offset?: number } = {},
): Promise<ActivitiesBoardData> {
  const [activityRows, adminRows, associateRows] = await Promise.all([
    findActivities(options),
    findActiveAdmins(),
    findActiveAssociates(),
  ]);

  const { currentUser, people } = buildPeopleList(user, adminRows);

  return {
    initialActivities: activityRows.map(mapActivityRowToBoardActivity),
    people,
    associates: associateRows as BoardAssociate[],
    currentUser,
  };
}

export async function getActivitiesFormData(user: Pick<AuthUser, 'userId' | 'name' | 'role'>) {
  const [adminRows, associateRows] = await Promise.all([
    findActiveAdmins(),
    findActiveAssociates(),
  ]);

  const { currentUser, people } = buildPeopleList(user, adminRows);

  return {
    people,
    associates: associateRows as BoardAssociate[],
    currentUser,
  };
}

export { buildPeopleList };
