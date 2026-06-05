import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
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

export async function findActivities(options: { limit?: number; offset?: number } = {}) {
  const limit = Math.min(Math.max(options.limit ?? DEFAULT_ACTIVITY_LIMIT, 1), MAX_ACTIVITY_LIMIT);
  const offset = Math.max(options.offset ?? 0, 0);
  const priorityOrderSql = sql.raw(
    Object.entries(PRIORITY_ORDER)
      .map(([priority, order]) => `when '${priority}' then ${order}`)
      .join('\n          '),
  );

  return db
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
    .offset(offset);
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
    .where(eq(associates.associationStatus, 'ativo'))
    .orderBy(asc(associates.fullName))
    .limit(100);
}

export async function insertActivity(input: {
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  assigneeId: number | null;
  associateId: number | null;
  dueDate: string | null;
  tags: string[];
  createdBy: number;
}) {
  const [row] = await db
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

export async function findActivityById(id: number): Promise<Activity | null> {
  const [row] = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
  return row ?? null;
}

export async function updateActivityById(
  id: number,
  patch: Partial<Pick<Activity, 'status' | 'priority' | 'dueDate' | 'completedAt' | 'assigneeId'>>,
  expectedUpdatedAt?: Date | null,
): Promise<Activity | null> {
  const whereClause = expectedUpdatedAt
    ? (() => {
        const expectedIso = expectedUpdatedAt.toISOString();
        return and(
          eq(activities.id, id),
          sql`${activities.updatedAt} >= ${expectedIso}::timestamptz AND ${activities.updatedAt} < (${expectedIso}::timestamptz + interval '1 millisecond')`,
        );
      })()
    : eq(activities.id, id);

  const [row] = await db
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
