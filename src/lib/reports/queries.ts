import { db } from '@/lib/db';
import { associates } from '@/lib/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { decryptPiiField } from '@/lib/crypto/pii';

import type {
  functionalStatus as FunctionalStatusEnum,
  associationStatus as AssociationStatusEnum,
  contributionStatus as ContributionStatusEnum,
  missionType as MissionTypeEnum,
  careerOrigin as CareerOriginEnum,
} from '@/lib/db/schema/associates';
import type { paymentMethod as PaymentMethodEnum } from '@/lib/db/schema/enums';

interface ReportFilters {
  functionalStatus?: (typeof FunctionalStatusEnum.enumValues)[number];
  associationStatus?: (typeof AssociationStatusEnum.enumValues)[number];
  contributionStatus?: (typeof ContributionStatusEnum.enumValues)[number];
  missionType?: (typeof MissionTypeEnum.enumValues)[number];
  careerOrigin?: (typeof CareerOriginEnum.enumValues)[number];
  paymentMethod?: (typeof PaymentMethodEnum.enumValues)[number];
  birthMonth?: number;
}

export type ReportAssociate = {
  id: number;
  fullName: string | null;
  sex: string | null;
  maritalStatus: string | null;
  birthDate: string | null;
  birthCity: string | null;
  birthState: string | null;
  cpf: string | null;
  rg: string | null;
  rgIssuer: string | null;
  rgState: string | null;
  rgExpeditionDate: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  neighborhood: string | null;
  addressState: string | null;
  zipCode: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  siape: string | null;
  assignment: string | null;
  assignmentStartDate: string | null;
  classPattern: string | null;
  functionalStatus: string | null;
  associationStatus: string | null;
  contributionStatus: string | null;
  joinedAt: string | null;
  associationCategory: string | null;
  missionType: string | null;
  careerOrigin: string | null;
  admissionDate: string | null;
  inaugurationDate: string | null;
  cancellationDate: string | null;
  paymentMethod: string | null;
  ceocMember: boolean | null;
  caocMember: boolean | null;
};

// Select columns including ciphertext for PII decryption
const reportColumns = {
  id: associates.id,
  fullName: associates.fullName,
  sex: associates.sex,
  maritalStatus: associates.maritalStatus,
  birthDate: associates.birthDate,
  birthCity: associates.birthCity,
  birthState: associates.birthState,
  cpf: associates.cpf,
  cpfCiphertext: associates.cpfCiphertext,
  rg: associates.rg,
  rgCiphertext: associates.rgCiphertext,
  rgIssuer: associates.rgIssuer,
  rgState: associates.rgState,
  rgExpeditionDate: associates.rgExpeditionDate,
  primaryEmail: associates.primaryEmail,
  primaryEmailCiphertext: associates.primaryEmailCiphertext,
  secondaryEmail: associates.secondaryEmail,
  phone: associates.phone,
  phoneCiphertext: associates.phoneCiphertext,
  whatsapp: associates.whatsapp,
  whatsappCiphertext: associates.whatsappCiphertext,
  address: associates.address,
  addressCiphertext: associates.addressCiphertext,
  neighborhood: associates.neighborhood,
  addressState: associates.addressState,
  zipCode: associates.zipCode,
  locationCity: associates.locationCity,
  locationCountry: associates.locationCountry,
  siape: associates.siape,
  siapeCiphertext: associates.siapeCiphertext,
  assignment: associates.assignment,
  assignmentStartDate: associates.assignmentStartDate,
  classPattern: associates.classPattern,
  functionalStatus: associates.functionalStatus,
  associationStatus: associates.associationStatus,
  contributionStatus: associates.contributionStatus,
  joinedAt: associates.joinedAt,
  associationCategory: associates.associationCategory,
  missionType: associates.missionType,
  careerOrigin: associates.careerOrigin,
  admissionDate: associates.admissionDate,
  inaugurationDate: associates.inaugurationDate,
  cancellationDate: associates.cancellationDate,
  paymentMethod: associates.paymentMethod,
  ceocMember: associates.ceocMember,
  caocMember: associates.caocMember,
};

export async function getAssociatesForReport(
  filters: ReportFilters = {},
): Promise<ReportAssociate[]> {
  const conditions = [];

  if (filters.functionalStatus) {
    conditions.push(eq(associates.functionalStatus, filters.functionalStatus));
  }

  if (filters.associationStatus) {
    conditions.push(eq(associates.associationStatus, filters.associationStatus));
  }

  if (filters.contributionStatus) {
    conditions.push(eq(associates.contributionStatus, filters.contributionStatus));
  }

  if (filters.missionType) {
    conditions.push(eq(associates.missionType, filters.missionType));
  }

  if (filters.careerOrigin) {
    conditions.push(eq(associates.careerOrigin, filters.careerOrigin));
  }

  if (filters.paymentMethod) {
    conditions.push(eq(associates.paymentMethod, filters.paymentMethod));
  }

  if (filters.birthMonth !== undefined) {
    conditions.push(
      sql`extract(month from ${associates.birthDate})::integer = ${filters.birthMonth}`,
    );
  }

  const rows = await db
    .select(reportColumns)
    .from(associates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(associates.fullName));

  return rows.map((row) => ({
    id: row.id,
    fullName: row.fullName,
    sex: row.sex,
    maritalStatus: row.maritalStatus,
    birthDate: row.birthDate,
    birthCity: row.birthCity,
    birthState: row.birthState,
    // Decrypt PII fields with ciphertext fallback
    cpf: decryptPiiField(row.cpfCiphertext ?? null, row.cpf ?? null),
    rg: decryptPiiField(row.rgCiphertext ?? null, row.rg ?? null),
    rgIssuer: row.rgIssuer,
    rgState: row.rgState,
    rgExpeditionDate: row.rgExpeditionDate,
    primaryEmail: decryptPiiField(row.primaryEmailCiphertext ?? null, row.primaryEmail ?? null),
    secondaryEmail: row.secondaryEmail,
    phone: decryptPiiField(row.phoneCiphertext ?? null, row.phone ?? null),
    whatsapp: decryptPiiField(row.whatsappCiphertext ?? null, row.whatsapp ?? null),
    address: decryptPiiField(row.addressCiphertext ?? null, row.address ?? null),
    neighborhood: row.neighborhood,
    addressState: row.addressState,
    zipCode: row.zipCode,
    locationCity: row.locationCity,
    locationCountry: row.locationCountry,
    siape: decryptPiiField(row.siapeCiphertext ?? null, row.siape ?? null),
    assignment: row.assignment,
    assignmentStartDate: row.assignmentStartDate,
    classPattern: row.classPattern,
    functionalStatus: row.functionalStatus,
    associationStatus: row.associationStatus,
    contributionStatus: row.contributionStatus,
    joinedAt: row.joinedAt,
    associationCategory: row.associationCategory,
    missionType: row.missionType,
    careerOrigin: row.careerOrigin,
    admissionDate: row.admissionDate,
    inaugurationDate: row.inaugurationDate,
    cancellationDate: row.cancellationDate,
    paymentMethod: row.paymentMethod,
    ceocMember: row.ceocMember,
    caocMember: row.caocMember,
  }));
}

export type { ReportFilters };