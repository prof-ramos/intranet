import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { paymentMethod } from './enums';

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

// Legacy migration enums (migration 0020)
export const sex = pgEnum('sex', ['M', 'F']);
export const maritalStatus = pgEnum('marital_status', [
  'solteiro',
  'casado',
  'divorciado',
  'viuvo',
  'separado',
  'outros', // TODO: normalize over time — legacy catch-all for 285 records
]);
export const missionType = pgEnum('mission_type', ['permanente', 'transitoria']);
export const careerOrigin = pgEnum('career_origin', ['brasil', 'exterior', 'outros_orgaos']);

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
    primaryEmailCiphertext: text('primary_email_ciphertext'),
    primaryEmailHash: text('primary_email_hash'),
    phone: text('phone'),
    phoneCiphertext: text('phone_ciphertext'),
    phoneHash: text('phone_hash'),
    address: text('address'),
    addressCiphertext: text('address_ciphertext'),
    addressHash: text('address_hash'),
    whatsapp: text('whatsapp'),
    whatsappCiphertext: text('whatsapp_ciphertext'),
    whatsappHash: text('whatsapp_hash'),
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
    secondaryEmail: text('secondary_email'),
    internalNotes: text('internal_notes'),
    // Personal (non-PII) — legacy migration 0020
    sex: sex('sex'),
    maritalStatus: maritalStatus('marital_status'),
    birthCity: text('birth_city'), // Naturalidade
    birthState: text('birth_state'), // UF naturalidade — AC sentinel = "a confirmar", mapped to null on import

    // PII — RG triple-column pattern (legacy migration 0020)
    rg: text('rg'), // plaintext — nullable, mutually exclusive with rgCiphertext via CHECK
    rgCiphertext: text('rg_ciphertext'),
    rgHash: text('rg_hash'),
    // rgIssuer and rgState are metadata, not PII — document issuer info does not identify a person alone
    rgIssuer: text('rg_issuer'), // Órgão Expedidor
    rgState: text('rg_state'), // UF RG — AC sentinel mapped to null on import
    rgExpeditionDate: date('rg_expedition_date', { mode: 'string' }),

    // Address sub-components (non-PII individually — street-level address is in `address` PII column)
    addressState: text('address_state'), // UF_3 — AC sentinel mapped to null on import
    neighborhood: text('neighborhood'), // Bairro
    zipCode: text('zip_code'), // C.E.P.

    // Functional — legacy migration 0020
    missionType: missionType('mission_type'),
    careerOrigin: careerOrigin('career_origin'),
    admissionDate: date('admission_date', { mode: 'string' }),
    inaugurationDate: date('inauguration_date', { mode: 'string' }),
    cancellationDate: date('cancellation_date', { mode: 'string' }),
    ceocMember: boolean('ceoc_member'),
    caocMember: boolean('caoc_member'),
    numberOfDependents: integer('number_of_dependents'), // denormalized cache — cross-check with dependents table

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
    index('idx_associates_primary_email_hash').on(table.primaryEmailHash),
    index('idx_associates_phone_hash').on(table.phoneHash),
    index('idx_associates_address_hash').on(table.addressHash),
    index('idx_associates_whatsapp_hash').on(table.whatsappHash),
    index('idx_associates_rg_hash').on(table.rgHash),
    index('idx_associates_association_status').on(table.associationStatus),
    index('idx_associates_contribution_status').on(table.contributionStatus),
    index('idx_associates_status_name').on(table.associationStatus, table.fullName),
    index('idx_associates_name_trgm').using('gin', table.fullName.op('gin_trgm_ops')),
    check('chk_associates_cpf_pii', sql`${table.cpf} IS NULL OR ${table.cpfCiphertext} IS NULL`),
    check(
      'chk_associates_email_pii',
      sql`${table.primaryEmail} IS NULL OR ${table.primaryEmailCiphertext} IS NULL`,
    ),
    check('chk_associates_phone_pii', sql`${table.phone} IS NULL OR ${table.phoneCiphertext} IS NULL`),
    check(
      'chk_associates_address_pii',
      sql`${table.address} IS NULL OR ${table.addressCiphertext} IS NULL`,
    ),
    check(
      'chk_associates_whatsapp_pii',
      sql`${table.whatsapp} IS NULL OR ${table.whatsappCiphertext} IS NULL`,
    ),
    check('chk_associates_siape_pii', sql`${table.siape} IS NULL OR ${table.siapeCiphertext} IS NULL`),
    check('chk_associates_rg_pii', sql`${table.rg} IS NULL OR ${table.rgCiphertext} IS NULL`),
  ],
);

export type Associate = typeof associates.$inferSelect;
export type NewAssociate = typeof associates.$inferInsert;
