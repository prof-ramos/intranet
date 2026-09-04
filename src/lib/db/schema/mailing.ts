import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { admins } from './admins';
import { associates } from './associates';

export const mailingChannel = pgEnum('mailing_channel', ['email', 'etiquetas']);

export const mailingCampaignStatus = pgEnum('mailing_campaign_status', [
  'rascunho',
  'em_envio',
  'concluida',
  'falhou',
  'cancelada',
]);

export const mailingRecipientStatus = pgEnum('mailing_recipient_status', [
  'pendente',
  'enviado',
  'falhou',
  'cancelado',
]);

export const mailingCampaigns = pgTable(
  'mailing_campaigns',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    channel: mailingChannel('channel').notNull(),
    subject: text('subject'),
    templateBody: text('template_body').notNull(),
    status: mailingCampaignStatus('status').notNull().default('rascunho'),
    filters: jsonb('filters').$type<Record<string, unknown>>().notNull(),
    recipientCount: integer('recipient_count').notNull(),
    sentCount: integer('sent_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    createdBy: bigint('created_by', { mode: 'number' }).references(() => admins.id, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_mailing_campaigns_created_by').on(table.createdBy),
    index('idx_mailing_campaigns_status_created_at').on(table.status, table.createdAt),
  ],
);

export const mailingRecipients = pgTable(
  'mailing_recipients',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    campaignId: bigint('campaign_id', { mode: 'number' })
      .notNull()
      .references(() => mailingCampaigns.id, { onDelete: 'cascade' }),
    associateId: bigint('associate_id', { mode: 'number' }).references(() => associates.id, {
      onDelete: 'set null',
    }),
    recipientName: text('recipient_name').notNull(),
    emailCiphertext: text('email_ciphertext'),
    status: mailingRecipientStatus('status').notNull().default('pendente'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('idx_mailing_recipients_campaign_associate').on(
      table.campaignId,
      table.associateId,
    ),
    index('idx_mailing_recipients_campaign_status').on(table.campaignId, table.status),
    index('idx_mailing_recipients_pending')
      .on(table.campaignId)
      .where(sql`${table.status} = 'pendente'`),
  ],
);

export type MailingCampaign = typeof mailingCampaigns.$inferSelect;
export type NewMailingCampaign = typeof mailingCampaigns.$inferInsert;
export type MailingRecipient = typeof mailingRecipients.$inferSelect;
export type NewMailingRecipient = typeof mailingRecipients.$inferInsert;
