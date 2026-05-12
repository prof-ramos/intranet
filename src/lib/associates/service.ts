import type { Role } from './lgpd';
import {
  toAssociateProfileDTO,
  toActivityDTO,
  canViewSensitiveFields,
} from './lgpd';
import {
  findAssociatesPaginated,
  findAssociateById,
  findLinkedActivities,
  updateAssociateById,
  type UpdateAssociateValues,
} from './repository';
import { functionalStatus as fsEnum, associationStatus as asEnum, contributionStatus as csEnum } from '@/lib/db/schema';
import { formatLongDate, yearsSinceDate } from '@/lib/utils/date';

type FsEnum = (typeof fsEnum.enumValues)[number];
type AsEnum = (typeof asEnum.enumValues)[number];
type CsEnum = (typeof csEnum.enumValues)[number];

const isFsEnum = (v: string): v is FsEnum => fsEnum.enumValues.includes(v as FsEnum);
const isAsEnum = (v: string): v is AsEnum => asEnum.enumValues.includes(v as AsEnum);
const isCsEnum = (v: string): v is CsEnum => csEnum.enumValues.includes(v as CsEnum);

export { formatLongDate as formatAssociateDate, yearsSinceDate };
export { initialsFromName } from '@/lib/utils/initials';

export interface AssociateLinkedActivity {
  id: number;
  title: string;
  status: string;
  dueDate: string | null;
}

export interface AssociateTimelineItem {
  date: string | Date | null;
  event: string;
  detail: string;
  tone: 'neutral' | 'pos' | 'neg';
}

export interface AssociateProfileViewModel {
  associate: ReturnType<typeof toAssociateProfileDTO>;
  linkedActivities: AssociateLinkedActivity[];
  isAssociationActive: boolean;
  isFunctionalActive: boolean;
  joinedYears: number | null;
  careerYears: number | null;
  location: string | null;
  showSensitive: boolean;
  timeline: AssociateTimelineItem[];
}

export interface EditAssociateDTO {
  id: number;
  fullName: string;
  cpf: string | null;
  siape: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  birthDate: string | null;
  address: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  assignment: string | null;
  assignmentStartDate: string | null;
  classPattern: string | null;
  associationCategory: string | null;
  functionalStatus: string | null;
  associationStatus: string;
  contributionStatus: string;
  internalNotes: string | null;
  canEditInternalNotes: boolean;
}

export function getAssociateStatusLabel(value: string | null) {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    inativo: 'Inativo',
    aposentado: 'Aposentado',
    cedido: 'Cedido',
    em_licenca: 'Em licença',
    em_dia: 'Em dia',
    inadimplente: 'Inadimplente',
    pendente_migracao: 'Pendente migração',
  };
  return value ? (labels[value] ?? value) : null;
}

export async function getAssociatesListPage(
  page: number,
  pageSize: number,
  searchQuery?: string,
) {
  return findAssociatesPaginated(page, pageSize, searchQuery);
}

export async function getAssociateForEdit(
  id: number,
  role: Role,
): Promise<EditAssociateDTO | null> {
  const row = await findAssociateById(id);
  if (!row) return null;

  return {
    id: row.id,
    fullName: row.fullName,
    cpf: row.cpf,
    siape: row.siape,
    primaryEmail: row.primaryEmail,
    secondaryEmail: row.secondaryEmail,
    phone: row.phone,
    whatsapp: row.whatsapp,
    birthDate: row.birthDate,
    address: row.address,
    locationCity: row.locationCity,
    locationCountry: row.locationCountry,
    assignment: row.assignment,
    assignmentStartDate: row.assignmentStartDate,
    classPattern: row.classPattern,
    associationCategory: row.associationCategory,
    functionalStatus: row.functionalStatus,
    associationStatus: row.associationStatus,
    contributionStatus: row.contributionStatus,
    internalNotes: row.internalNotes,
    canEditInternalNotes: role === 'admin',
  };
}

export interface UpdateAssociateInput {
  id: number;
  fullName: string;
  cpf?: string | null;
  siape?: string | null;
  primaryEmail?: string | null;
  secondaryEmail?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  birthDate?: string | null;
  address?: string | null;
  locationCity?: string | null;
  locationCountry?: string | null;
  assignment?: string | null;
  assignmentStartDate?: string | null;
  classPattern?: string | null;
  associationCategory?: string | null;
  functionalStatus?: string | null;
  associationStatus?: string | null;
  contributionStatus?: string | null;
  internalNotes?: string | null;
}

export async function updateAssociateData(input: UpdateAssociateInput) {
  const values: UpdateAssociateValues = {
    fullName: input.fullName,
    cpf: input.cpf,
    siape: input.siape,
    primaryEmail: input.primaryEmail,
    secondaryEmail: input.secondaryEmail,
    phone: input.phone,
    whatsapp: input.whatsapp,
    birthDate: input.birthDate,
    address: input.address,
    locationCity: input.locationCity,
    locationCountry: input.locationCountry,
    assignment: input.assignment,
    assignmentStartDate: input.assignmentStartDate,
    classPattern: input.classPattern,
    associationCategory: input.associationCategory,
  };

  if (input.functionalStatus !== undefined) {
    if (input.functionalStatus !== null && !isFsEnum(input.functionalStatus)) {
      throw new Error('functionalStatus inválido.');
    }
    values.functionalStatus = input.functionalStatus as FsEnum | null;
  }
  if (input.associationStatus !== undefined) {
    if (input.associationStatus !== null && !isAsEnum(input.associationStatus)) {
      throw new Error('associationStatus inválido.');
    }
    values.associationStatus = input.associationStatus as AsEnum;
  }
  if (input.contributionStatus !== undefined) {
    if (input.contributionStatus !== null && !isCsEnum(input.contributionStatus)) {
      throw new Error('contributionStatus inválido.');
    }
    values.contributionStatus = input.contributionStatus as CsEnum;
  }
  if (input.internalNotes !== undefined) values.internalNotes = input.internalNotes;

  await updateAssociateById(input.id, values);
}

export async function getAssociateProfile(
  associateId: number,
  role: Role,
): Promise<AssociateProfileViewModel | null> {
  const rawAssociate = await findAssociateById(associateId);
  if (!rawAssociate) return null;

  const associate = toAssociateProfileDTO(rawAssociate, role);
  const linkedActivities = await findLinkedActivities(associate.id);
  const location =
    [associate.locationCity, associate.locationCountry].filter(Boolean).join(' / ') || null;

  return {
    associate,
    linkedActivities: linkedActivities.map((activity) => toActivityDTO(activity, role)),
    isAssociationActive: associate.associationStatus === 'ativo',
    isFunctionalActive: associate.functionalStatus === 'ativo',
    joinedYears: yearsSinceDate(associate.joinedAt),
    careerYears: yearsSinceDate(associate.assignmentStartDate),
    location,
    showSensitive: canViewSensitiveFields(role),
    timeline: [
      {
        date: associate.updatedAt,
        event: 'Última atualização cadastral',
        detail: 'Registro sincronizado na base da intranet.',
        tone: 'neutral',
      },
      {
        date: associate.joinedAt,
        event: 'Adesão à ASOF',
        detail: associate.associationCategory ?? 'Categoria não informada.',
        tone: 'pos',
      },
      {
        date: associate.assignmentStartDate,
        event: 'Lotação registrada',
        detail: associate.assignment ?? 'Lotação não informada.',
        tone: 'neutral',
      },
    ],
  };
}
