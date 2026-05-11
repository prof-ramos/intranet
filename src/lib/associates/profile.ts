import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { activities, associates } from '@/lib/db/schema';
import {
  canViewSensitiveFields,
  toActivityDTO,
  toAssociateProfileDTO,
  type AssociateProfileDTO,
  type Role,
} from '@/lib/associates/lgpd';
import { initialsFromName } from '@/lib/utils/initials';
import { formatLongDate as formatAssociateDate, yearsSinceDate } from '@/lib/utils/date';

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
  associate: AssociateProfileDTO;
  linkedActivities: AssociateLinkedActivity[];
  isAssociationActive: boolean;
  isFunctionalActive: boolean;
  joinedYears: number | null;
  careerYears: number | null;
  location: string | null;
  showSensitive: boolean;
  timeline: AssociateTimelineItem[];
}

export { initialsFromName, formatAssociateDate, yearsSinceDate };

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

export async function getAssociateProfileViewModel(
  associateId: number,
  role: Role,
): Promise<AssociateProfileViewModel | null> {
  const [rawAssociate] = await db
    .select()
    .from(associates)
    .where(eq(associates.id, associateId))
    .limit(1);

  if (!rawAssociate) {
    return null;
  }

  const associate = toAssociateProfileDTO(rawAssociate, role);
  const linkedActivities = await db
    .select({
      id: activities.id,
      title: activities.title,
      status: activities.status,
      dueDate: activities.dueDate,
    })
    .from(activities)
    .where(eq(activities.associateId, associate.id))
    .orderBy(asc(activities.dueDate), asc(activities.id))
    .limit(10);

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