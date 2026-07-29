import type { Associate } from '@/lib/db/schema/associates';
import type { AuthRole } from '@/lib/auth/config';
import { getExportableFields } from './field-registry';

// LGPD field classification for associate data
export const SENSITIVE_FIELDS: Set<keyof Associate> = new Set([
  'cpf',
  'cpfCiphertext',
  'cpfHash',
  'siape',
  'siapeCiphertext',
  'siapeHash',
  'primaryEmail',
  'primaryEmailCiphertext',
  'primaryEmailHash',
  'phone',
  'phoneCiphertext',
  'phoneHash',
  'address',
  'addressCiphertext',
  'addressHash',
  'whatsapp',
  'whatsappCiphertext',
  'whatsappHash',
  'rg',
  'rgCiphertext',
  'rgHash',
  'birthDate',
  'secondaryEmail',
  'neighborhood',
  'zipCode',
  'internalNotes',
  'sourcePayload',
]);

export const PUBLIC_FIELDS: Set<keyof Associate> = new Set([
  'id',
  'fullName',
  'sex',
  'maritalStatus',
  'birthCity',
  'birthState',
  'rgIssuer',
  'rgState',
  'rgExpeditionDate',
  'assignment',
  'locationCity',
  'locationCountry',
  'addressState',
  'classPattern',
  'functionalStatus',
  'associationStatus',
  'contributionStatus',
  'joinedAt',
  'associationCategory',
  'assignmentStartDate',
  'missionType',
  'careerOrigin',
  'admissionDate',
  'inaugurationDate',
  'retirementDate',
  'leaveDate',
  'cancellationDate',
  'paymentMethod',
  'ceocMember',
  'caocMember',
  'updatedAt',
]);

export type Sensitivity = 'sensitive' | 'public';

export function maskCpf(cpf: string | null): string | null {
  if (!cpf || cpf.length < 11) return cpf;
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

export function maskSiape(siape: string | null): string | null {
  if (!siape || siape.length < 4) return siape;
  return `${siape.slice(0, 2)}****${siape.slice(-2)}`;
}

function maskPhone(phone: string | null): string | null {
  if (!phone || phone.length < 8) return phone;
  return `(**) ****-${phone.slice(-4)}`;
}

function maskEmail(email: string | null): string | null {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}***` : '***';
  return `${maskedLocal}@${domain}`;
}

export type Role = AuthRole;

/** Whether the role can view sensitive (LGPD-protected) fields. */
export function canViewSensitiveFields(_role: Role): boolean {
  // All authenticated users see full data — this is an internal system for
  // secretaria, diretoria, and admin. Masking functions remain available for
  // future exports to third parties.
  return true;
}

/** Return a view of an associate respecting LGPD role boundaries. */
export function toAssociateProfileDTO(associate: Associate, role: Role): Associate {
  if (canViewSensitiveFields(role)) {
    return associate;
  }

  // For secretaria (and any future restricted role), mask or null out sensitive fields
  return {
    ...associate,
    cpf: maskCpf(associate.cpf),
    siape: maskSiape(associate.siape),
    birthDate: null,
    address: null,
    primaryEmail: maskEmail(associate.primaryEmail),
    secondaryEmail: maskEmail(associate.secondaryEmail),
    phone: maskPhone(associate.phone),
    whatsapp: maskPhone(associate.whatsapp),
    internalNotes: null,
  };
}

export type AssociateProfileDTO = ReturnType<typeof toAssociateProfileDTO>;

export interface ActivityLinkDTO {
  id: number;
  title: string;
  status: string;
  dueDate: string | null;
}

export function toActivityDTO(activity: ActivityLinkDTO, role: Role): ActivityLinkDTO {
  if (canViewSensitiveFields(role)) {
    return activity;
  }

  return {
    ...activity,
    title: 'Atividade vinculada',
  };
}

/** Export fields annotated with LGPD sensitivity for explicit allowlisting. */
export interface AnnotatedField {
  key: string;
  label: string;
  sensitivity: Sensitivity;
}

/**
 * Derived from `field-registry.ts`'s `exportEligible` flag — exclusion (e.g.
 * `internalNotes`) is registry data, not an omission from this list.
 */
export const ASSOCIATE_EXPORT_FIELDS: AnnotatedField[] = getExportableFields().map((field) => ({
  key: field.key,
  label: field.label,
  sensitivity: field.sensitivity,
}));

/** Filters export fields by role. Admin/diretoria see everything; secretaria sees only public fields. */
export function filterExportFieldsByRole(fields: AnnotatedField[], role: Role): AnnotatedField[] {
  if (canViewSensitiveFields(role)) return fields;
  return fields.filter((f) => f.sensitivity === 'public');
}
