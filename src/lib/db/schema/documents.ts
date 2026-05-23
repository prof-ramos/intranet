import { bigint, integer, pgEnum, pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { admins } from './admins';

export const documentCategory = pgEnum('document_category', [
  'modelo_contrato',
  'contrato',
  'minuta',
  'estatuto',
  'ata',
  'oficio',
  'rh',
  'evento',
  'nota_fiscal',
  'comprovante',
  'outro',
]);

export const documents = pgTable(
  'documents',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    description: text('description'),
    category: documentCategory('category').notNull(),
    storagePath: text('storage_path').notNull(),
    fileSize: integer('file_size').notNull(),
    fileType: text('file_type').notNull(),
    uploadedBy: bigint('uploaded_by', { mode: 'number' })
      .notNull()
      .references(() => admins.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_documents_category').on(table.category),
    index('idx_documents_created_at').on(table.createdAt),
    index('idx_documents_uploaded_by').on(table.uploadedBy),
    index('idx_documents_name_trgm').using('gin', table.name.op('gin_trgm_ops')),
    index('idx_documents_description_trgm').using('gin', table.description.op('gin_trgm_ops')),
  ],
);

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
