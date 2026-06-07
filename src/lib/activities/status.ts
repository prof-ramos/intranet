import { ACTIVITY_STATUSES, ACTIVITY_PRIORITIES } from './types';
import type { Priority, Status } from './types';
import { statusStyles } from '@/lib/ui/tokens';
import { createEnumMetadata } from '@/lib/ui/create-enum-metadata';

const meta = createEnumMetadata({
  values: ACTIVITY_STATUSES,
  labels: {
    a_fazer: statusStyles.a_fazer.label,
    em_andamento: statusStyles.em_andamento.label,
    aguardando_terceiros: statusStyles.aguardando_terceiros.label,
    concluido: statusStyles.concluido.label,
  },
});

export const ACTIVITY_STATUS_LABELS = meta.LABELS;

export const ACTIVITY_STATUS_OPTIONS = meta.OPTIONS.map((opt) => ({
  ...opt,
  accent: statusStyles[opt.value].accent,
})) as readonly { value: Status; label: string; accent: string }[];

export const isActivityStatus = meta.isStatus;

export function isActivityPriority(value: string): value is Priority {
  return ACTIVITY_PRIORITIES.includes(value as Priority);
}

export const getActivityStatusLabel = meta.getLabel;
