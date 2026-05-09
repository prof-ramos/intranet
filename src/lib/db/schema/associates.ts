import {
  bigint,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const associationStatus = pgEnum('association_status', ['ativo', 'inativo']);
export const contributionStatus = pgEnum('contribution_status', [
  'em_dia',
  'inadimplente',
  'pendente_migracao',
]);
export const functionalStatus = pgEnum('functional_status', [
  'ativo',
  'aposentado',
  'cedido',
  'em_licenca',
]);

export const associates = pgTable(
  'associates',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    sourceRowNumber: text('source_row_number'),
    fullName: text('full_name').notNull(),
    cpf: text('cpf'),
    primaryEmail: text('primary_email'),
    phone: text('phone'),
    whatsapp: text('whatsapp'),
    siape: text('siape'),
    functionalStatus: functionalStatus('functional_status'),
    assignment: text('assignment'),
    assignmentStartDate: date('assignment_start_date', { mode: 'string' }),
    locationCity: text('location_city'),
    locationCountry: text('location_country'),
    associationStatus: associationStatus('association_status').notNull().default('ativo'),
    joinedAt: timestamp('joined_at', { mode: 'string', withTimezone: true }),
    associationCategory: text('association_category'),
    contributionStatus: contributionStatus('contribution_status')
      .notNull()
      .default('pendente_migracao'),
    address: text('address'),
    secondaryEmail: text('secondary_email'),
    internalNotes: text('internal_notes'),
    birthDate: date('birth_date', { mode: 'string' }),
    classPattern: text('class_pattern'),
    sourcePayload: text('source_payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('idx_associates_cpf').on(table.cpf),
    uniqueIndex('idx_associates_siape').on(table.siape),
    uniqueIndex('idx_associates_primary_email').on(table.primaryEmail),
    index('idx_associates_name').on(table.fullName),
    index('idx_associates_association_status').on(table.associationStatus),
    index('idx_associates_contribution_status').on(table.contributionStatus),
    index('idx_associates_status_name').on(table.associationStatus, table.fullName),
  ],
);

export type Associate = typeof associates.$inferSelect;
export type NewAssociate = typeof associates.$inferInsert;
