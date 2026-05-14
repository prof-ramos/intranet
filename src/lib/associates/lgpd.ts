import type { Associate } from '@/lib/db/schema/associates';
import type { AuthRole } from '@/lib/auth/config';
import { isPrivilegedRole } from '@/lib/auth/authorization';

// LGPD field classification for associate data
export const SENSITIVE_FIELDS: Set<keyof Associate> = new Set([
  'cpf',
  'siape',
  'address',
  'birthDate',
  'primaryEmail',
  'secondaryEmail',
  'phone',
  'whatsapp',
  'internalNotes',
]);

export const PUBLIC_FIELDS: Set<keyof Associate> = new Set([
  'id',
  'fullName',
  'assignment',
  'locationCity',
  'locationCountry',
  'classPattern',
  'functionalStatus',
  'associationStatus',
  'contributionStatus',
  'joinedAt',
  'associationCategory',
  'assignmentStartDate',
  'updatedAt',
]);

export type Sensitivity = 'sensitive' | 'public';

function maskCpf(cpf: string | null): string | null {
  if (!cpf || cpf.length < 11) return cpf;
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
}

function maskSiape(siape: string | null): string | null {
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
export function canViewSensitiveFields(role: Role): boolean {
  return isPrivilegedRole(role);
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

/** List view fields — kept in sync with AssociateListItem from queries.ts. */
export const ASSOCIATE_LIST_FIELDS = [
  'id',
  'fullName',
  'assignment',
  'classPattern',
  'primaryEmail',
  'functionalStatus',
] as const;

/** Export fields annotated with LGPD sensitivity for explicit allowlisting. */
export interface AnnotatedField {
  key: string;
  label: string;
  sensitivity: Sensitivity;
}

export const ASSOCIATE_EXPORT_FIELDS: AnnotatedField[] = [
  { key: 'fullName', label: 'Nome', sensitivity: 'public' },
  { key: 'primaryEmail', label: 'E-mail', sensitivity: 'sensitive' },
  { key: 'secondaryEmail', label: 'E-mail Secundário', sensitivity: 'sensitive' },
  { key: 'birthDate', label: 'Data de Nascimento', sensitivity: 'sensitive' },
  { key: 'cpf', label: 'CPF', sensitivity: 'sensitive' },
  { key: 'address', label: 'Endereço', sensitivity: 'sensitive' },
  { key: 'locationCity', label: 'Cidade', sensitivity: 'public' },
  { key: 'locationCountry', label: 'País', sensitivity: 'public' },
  { key: 'phone', label: 'Telefone', sensitivity: 'sensitive' },
  { key: 'whatsapp', label: 'Celular/WhatsApp', sensitivity: 'sensitive' },
  { key: 'siape', label: 'Matrícula SIAPE', sensitivity: 'sensitive' },
  { key: 'assignment', label: 'Lotação', sensitivity: 'public' },
  { key: 'assignmentStartDate', label: 'Data da Lotação', sensitivity: 'public' },
  { key: 'classPattern', label: 'Classe e Padrão', sensitivity: 'public' },
  { key: 'functionalStatus', label: 'Situação Funcional', sensitivity: 'public' },
  { key: 'associationStatus', label: 'Situação Associativa', sensitivity: 'public' },
  { key: 'contributionStatus', label: 'Contribuição', sensitivity: 'public' },
  { key: 'joinedAt', label: 'Data de Adesão', sensitivity: 'public' },
  { key: 'associationCategory', label: 'Categoria', sensitivity: 'public' },
];

/** Filters export fields by role. Admin/diretoria see everything; secretaria sees only public fields. */
export function filterExportFieldsByRole(fields: AnnotatedField[], role: Role): AnnotatedField[] {
  if (canViewSensitiveFields(role)) return fields;
  return fields.filter((f) => f.sensitivity === 'public');
}
