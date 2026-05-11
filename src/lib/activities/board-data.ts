import { asc, desc, eq, sql } from 'drizzle-orm';
import type { AuthUser } from '@/lib/auth/config';
import { db } from '@/lib/db';
import { activities, admins, associates } from '@/lib/db/schema';
import type { BoardActivity, BoardAssociate, BoardPerson, Priority, Status } from './types';

const DEFAULT_ACTIVITY_LIMIT = 200;
const MAX_ACTIVITY_LIMIT = 500;
const PRIORITY_ORDER = {
  urgente: 4,
  alta: 3,
  normal: 2,
  baixa: 1,
} as const satisfies Record<Priority, number>;

export interface ActivitiesBoardData {
  initialActivities: BoardActivity[];
  people: BoardPerson[];
  associates: BoardAssociate[];
  currentUser: BoardPerson;
}

interface ActivityBoardRow {
  id: number;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  dueDate: string | null;
  completedAt: Date | null;
  assigneeId: number | null;
  assigneeName: string | null;
  associateId: number | null;
  associateName: string | null;
  tags: string[] | null;
}

export function mapActivityRowToBoardActivity(activity: ActivityBoardRow): BoardActivity {
  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    status: activity.status,
    priority: activity.priority,
    dueDate: activity.dueDate,
    completedAt: activity.completedAt?.toISOString() ?? null,
    assigneeId: activity.assigneeId,
    assigneeName: activity.assigneeName,
    associateId: activity.associateId,
    associateName: activity.associateName,
    tags: activity.tags ?? [],
    dueOffset: null,
  };
}

export async function getActivitiesBoardData(
  user: Pick<AuthUser, 'userId' | 'name' | 'role'>,
  options: { limit?: number; offset?: number } = {},
): Promise<ActivitiesBoardData> {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_ACTIVITY_LIMIT, 1), MAX_ACTIVITY_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);
  const priorityOrderSql = sql.raw(
    Object.entries(PRIORITY_ORDER)
      .map(([priority, order]) => `when '${priority}' then ${order}`)
      .join('\n          '),
  );

  const [activityRows, adminRows, associateRows] = await Promise.all([
    db
      .select({
        id: activities.id,
        title: activities.title,
        description: activities.description,
        status: activities.status,
        priority: activities.priority,
        dueDate: activities.dueDate,
        completedAt: activities.completedAt,
        assigneeId: activities.assigneeId,
        assigneeName: admins.name,
        associateId: activities.associateId,
        associateName: associates.fullName,
        tags: activities.tags,
      })
      .from(activities)
      .leftJoin(admins, eq(activities.assigneeId, admins.id))
      .leftJoin(associates, eq(activities.associateId, associates.id))
      .orderBy(
        asc(activities.status),
        desc(sql`case ${activities.priority}
          ${priorityOrderSql}
          else 0
        end`),
        asc(activities.dueDate),
      )
      .limit(limit)
      .offset(offset),
    db
      .select({
        id: admins.id,
        name: admins.name,
        role: admins.role,
      })
      .from(admins)
      .where(eq(admins.isActive, true))
      .orderBy(asc(admins.name)),
    db
      .select({
        id: associates.id,
        name: associates.fullName,
      })
      .from(associates)
      .where(eq(associates.associationStatus, 'ativo'))
      .orderBy(asc(associates.fullName))
      .limit(100),
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
    associates: associateRows,
    currentUser,
  };
}
