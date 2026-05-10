import { requireAuth } from '@/lib/auth/require-auth';
import { db } from '@/lib/db';
import { activities, admins, associates } from '@/lib/db/schema';
import { AtividadesBoard, type BoardActivity, type BoardPerson } from './AtividadesBoard';
import { asc, desc, eq, sql } from 'drizzle-orm';

export default async function AtividadesPage() {
  const user = await requireAuth();

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
          when 'urgente' then 4
          when 'alta' then 3
          when 'normal' then 2
          else 1
        end`),
        asc(activities.dueDate),
      ),
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

  const initialActivities: BoardActivity[] = activityRows.map((activity) => ({
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
  }));

  return (
    <AtividadesBoard
      initialActivities={initialActivities}
      people={[...peopleById.values()]}
      associates={associateRows}
      currentUser={currentUser}
    />
  );
}
