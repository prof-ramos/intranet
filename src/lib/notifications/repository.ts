import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import { db } from '@/lib/db';
import * as schema from '@/lib/db/schema';
import { notifications, type NewNotification } from '@/lib/db/schema';

export type NotificationsTx =
  | typeof db
  | PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;

export interface NotificationListItem {
  id: number;
  userId: number;
  actorId: number | null;
  type: (typeof notifications.$inferSelect)['type'];
  title: string;
  message: string;
  href: string | null;
  entityType: (typeof notifications.$inferSelect)['entityType'];
  entityId: number | null;
  readAt: Date | null;
  createdAt: Date;
}

export async function createNotification(input: NewNotification, tx: NotificationsTx = db) {
  const [created] = await tx
    .insert(notifications)
    .values(input)
    .onConflictDoNothing({
      target: [notifications.userId, notifications.dedupeKey],
      where: sql`${notifications.dedupeKey} is not null`,
    })
    .returning();

  if (created) {
    return created;
  }

  if (!input.dedupeKey) {
    return null;
  }

  const [existing] = await tx
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, input.userId), eq(notifications.dedupeKey, input.dedupeKey)))
    .orderBy(desc(notifications.createdAt))
    .limit(1);

  return existing ?? null;
}

export async function listNotificationsForUser(userId: number, limit = 20, tx: NotificationsTx = db) {
  return tx
    .select({
      id: notifications.id,
      userId: notifications.userId,
      actorId: notifications.actorId,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      href: notifications.href,
      entityType: notifications.entityType,
      entityId: notifications.entityId,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt), desc(notifications.id))
    .limit(limit);
}

export async function countUnreadNotificationsForUser(userId: number, tx: NotificationsTx = db) {
  const [result] = await tx
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return result?.count ?? 0;
}

export async function markNotificationRead(input: { id: number; userId: number }, tx: NotificationsTx = db) {
  const [updated] = await tx
    .update(notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(notifications.id, input.id),
        eq(notifications.userId, input.userId),
        isNull(notifications.readAt),
      ),
    )
    .returning();
  return updated ?? null;
}

export async function markAllNotificationsRead(userId: number, tx: NotificationsTx = db) {
  return tx
    .update(notifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning({
      id: notifications.id,
    });
}

export async function findNotificationByIdForUser(input: { id: number; userId: number }, tx: NotificationsTx = db) {
  const [notification] = await tx
    .select()
    .from(notifications)
    .where(and(eq(notifications.id, input.id), eq(notifications.userId, input.userId)))
    .orderBy(asc(notifications.id))
    .limit(1);
  return notification ?? null;
}
