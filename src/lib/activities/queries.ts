import type { AuthUser } from '@/lib/auth/config';
import type { ActivitiesBoardData, BoardAssociate, BoardPerson } from './types';
import {
  findActivities,
  findActivityBoardRowById,
  findActiveAdmins,
  findActiveAssociates,
  mapActivityRowToBoardActivity,
} from './repository';

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
  options: { limit?: number; offset?: number; openActivityId?: number | null } = {},
): Promise<ActivitiesBoardData> {
  const [activityRows, openedActivityRow, adminRows, associateRows] = await Promise.all([
    findActivities({ limit: options.limit, offset: options.offset }),
    options.openActivityId
      ? findActivityBoardRowById(options.openActivityId)
      : Promise.resolve(null),
    findActiveAdmins(),
    findActiveAssociates(),
  ]);
  const completeActivityRows =
    openedActivityRow && !activityRows.some((activity) => activity.id === openedActivityRow.id)
      ? [...activityRows, openedActivityRow]
      : activityRows;

  const { currentUser, people } = buildPeopleList(user, adminRows);

  return {
    initialActivities: completeActivityRows.map(mapActivityRowToBoardActivity),
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
