import { sqliteTable, integer, text, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const associates = sqliteTable('associates', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  sourceRowNumber: text('source_row_number'),
  fullName: text('full_name').notNull(),
  cpf: text('cpf'),
  primaryEmail: text('primary_email'),
  phone: text('phone'),
  whatsapp: text('whatsapp'),
  siape: text('siape'),
  functionalStatus: text('functional_status'),
  assignment: text('assignment'),
  assignmentStartDate: text('assignment_start_date'),
  locationCity: text('location_city'),
  locationCountry: text('location_country'),
  associationStatus: text('association_status').notNull().default('ativo'),
  joinedAt: text('joined_at'),
  associationCategory: text('association_category'),
  contributionStatus: text('contribution_status').notNull().default('pendente_migracao'),
  address: text('address'),
  secondaryEmail: text('secondary_email'),
  internalNotes: text('internal_notes'),
  birthDate: text('birth_date'),
  classPattern: text('class_pattern'),
  sourcePayload: text('source_payload'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index('idx_associates_cpf').on(table.cpf),
  index('idx_associates_siape').on(table.siape),
  index('idx_associates_name').on(table.fullName),
]);

export type Associate = typeof associates.$inferSelect;
export type NewAssociate = typeof associates.$inferInsert;
