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

export const paymentMethod = pgEnum('payment_method', [
  'folha',
  'boleto',
  'pix',
  'transferencia',
  'outros',
]);

export const associates = pgTable(
  'associates',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    sourceRowNumber: text('source_row_number'),
    fullName: text('full_name').notNull(),
    cpf: text('cpf'),
    cpfCiphertext: text('cpf_ciphertext'),
    cpfHash: text('cpf_hash'),
    primaryEmail: text('primary_email'),
    phone: text('phone'),
    whatsapp: text('whatsapp'),
    siape: text('siape'),
    siapeCiphertext: text('siape_ciphertext'),
    siapeHash: text('siape_hash'),
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
    paymentMethod: paymentMethod('payment_method').notNull().default('folha'),
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
    index('idx_associates_cpf_hash').on(table.cpfHash),
    index('idx_associates_siape_hash').on(table.siapeHash),
    index('idx_associates_name').on(table.fullName),
    index('idx_associates_association_status').on(table.associationStatus),
    index('idx_associates_contribution_status').on(table.contributionStatus),
    index('idx_associates_status_name').on(table.associationStatus, table.fullName),
  ],
);

export type Associate = typeof associates.$inferSelect;
export type NewAssociate = typeof associates.$inferInsert;
