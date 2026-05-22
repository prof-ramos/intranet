import { sql } from 'drizzle-orm';
import { bigint, index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { admins } from '@/lib/db/schema/admins';
import { legalProcesses } from '@/lib/db/schema/legal-processes';

export const legalOpinionTags = pgTable(
  'legal_opinion_tags',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_legal_opinion_tags_name').on(table.name)],
);

export const legalOpinions = pgTable(
  'legal_opinions',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    tags: jsonb('tags')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    attachments: jsonb('attachments')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`),
    relatedProcessId: bigint('related_process_id', { mode: 'number' }).references(
      () => legalProcesses.id,
      {
        onDelete: 'set null',
      },
    ),
    createdBy: bigint('created_by', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_legal_opinions_created_by').on(table.createdBy),
    index('idx_legal_opinions_related_process').on(table.relatedProcessId),
    index('idx_legal_opinions_created_at').on(table.createdAt),
  ],
);

export type LegalOpinionTag = typeof legalOpinionTags.$inferSelect;
export type NewLegalOpinionTag = typeof legalOpinionTags.$inferInsert;
export type LegalOpinion = typeof legalOpinions.$inferSelect;
export type NewLegalOpinion = typeof legalOpinions.$inferInsert;
