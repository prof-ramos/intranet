import { and, asc, desc, eq, getTableColumns, sql } from 'drizzle-orm';
import { db, type DbExecutor } from '@/lib/db';
import { activities, admins, associates, auditLogs, type Activity } from '@/lib/db/schema';
import type { BoardActivity, Priority, Status } from './types';

const DEFAULT_ACTIVITY_LIMIT = 200;
const MAX_ACTIVITY_LIMIT = 500;

const PRIORITY_ORDER = {
  urgente: 4,
  alta: 3,
  normal: 2,
  baixa: 1,
} as const satisfies Record<Priority, number>;

const STATUS_ORDER = {
  a_fazer: 0,
  em_andamento: 1,
  aguardando_terceiros: 2,
  concluido: 3,
} as const satisfies Record<Status, number>;

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

function compareBoardRows(left: ActivityBoardRow, right: ActivityBoardRow): number {
  const statusOrder = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
  if (statusOrder !== 0) return statusOrder;

  const priorityOrder = PRIORITY_ORDER[right.priority] - PRIORITY_ORDER[left.priority];
  if (priorityOrder !== 0) return priorityOrder;

  if (left.dueDate !== right.dueDate) {
    if (left.dueDate === null) return 1;
    if (right.dueDate === null) return -1;
    const dueDateOrder = left.dueDate.localeCompare(right.dueDate);
    if (dueDateOrder !== 0) return dueDateOrder;
  }

  return right.id - left.id;
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

export async function findActivities(options: { limit?: number; offset?: number } = {}) {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_ACTIVITY_LIMIT, 1), MAX_ACTIVITY_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);

  // The board is deliberately bounded. Keep open work ahead of completed work,
  // then select the most recently changed rows so a newly-created card cannot
  // fall outside the window merely because older rows have the same board rank.
  // Sort the selected window back into board order before returning it to the UI.
  const rows = await db
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
      asc(sql`case when ${activities.status} = 'concluido' then 1 else 0 end`),
      desc(activities.updatedAt),
      desc(activities.id),
    )
    .limit(limit)
    .offset(offset);

  return rows.sort(compareBoardRows);
}

export async function findActiveAdmins() {
  return db
    .select({
      id: admins.id,
      name: admins.name,
      role: admins.role,
    })
    .from(admins)
    .where(eq(admins.isActive, true))
    .orderBy(asc(admins.name));
}

export async function findActiveAssociates() {
  return db
    .select({
      id: associates.id,
      name: associates.fullName,
    })
    .from(associates)
    .orderBy(asc(associates.fullName))
    .limit(100);
}

export async function insertActivity(
  input: {
    title: string;
    description: string | null;
    status: Status;
    priority: Priority;
    assigneeId: number | null;
    associateId: number | null;
    dueDate: string | null;
    tags: string[];
    createdBy: number;
  },
  executor: DbExecutor = db,
) {
  const [row] = await executor
    .insert(activities)
    .values({
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assigneeId: input.assigneeId,
      associateId: input.associateId,
      dueDate: input.dueDate,
      tags: input.tags,
      createdBy: input.createdBy,
    })
    .returning();
  return row;
}

export type VersionedActivity = Activity & { revision: number };

export async function findActivityById(
  id: number,
  executor: DbExecutor = db,
): Promise<VersionedActivity | null> {
  const [row] = await executor
    .select({
      ...getTableColumns(activities),
      // `xmin` changes on every PostgreSQL row version and is therefore a
      // precise compare-and-swap token, unlike the millisecond Date exposed by
      // the JS driver.
      revision: sql<number>`xmin::text::bigint`,
    })
    .from(activities)
    .where(eq(activities.id, id))
    .limit(1);
  return row ?? null;
}

export async function updateActivityById(
  id: number,
  patch: Partial<Pick<Activity, 'status' | 'priority' | 'dueDate' | 'completedAt' | 'assigneeId'>>,
  expectedRevision?: number,
  executor: DbExecutor = db,
): Promise<Activity | null> {
  let whereClause = eq(activities.id, id);
  if (expectedRevision !== undefined) {
    const combined = and(
      eq(activities.id, id),
      sql`xmin = ${expectedRevision}::text::xid`,
    );
    if (combined) {
      whereClause = combined;
    }
  }

  const [row] = await executor
    .update(activities)
    .set({
      ...patch,
      updatedAt: sql`now()`,
    })
    .where(whereClause)
    .returning();

  return row ?? null;
}

interface ActivityTimelineRow {
  id: number;
  action: string;
  actorName: string | null;
  createdAt: Date;
  changes: {
    old: Record<string, unknown>;
    new: Record<string, unknown>;
  } | null;
}

export async function listActivityTimeline(
  activityId: number,
  limit = 10,
): Promise<ActivityTimelineRow[]> {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      actorName: admins.name,
      createdAt: auditLogs.createdAt,
      changes: auditLogs.changes,
    })
    .from(auditLogs)
    .leftJoin(admins, eq(auditLogs.performedBy, admins.id))
    .where(and(eq(auditLogs.entityType, 'activity'), eq(auditLogs.entityId, activityId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(Math.min(Math.max(limit, 1), 20)) as Promise<ActivityTimelineRow[]>;
}
