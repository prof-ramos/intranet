import { ACTIVITY_STATUSES } from './types';
import type { Status } from './types';
import { statusStyles } from '@/lib/ui/tokens';

export const ACTIVITY_STATUS_LABELS: Record<Status, string> = {
  a_fazer: statusStyles.a_fazer.label,
  em_andamento: statusStyles.em_andamento.label,
  aguardando_terceiros: statusStyles.aguardando_terceiros.label,
  concluido: statusStyles.concluido.label,
};

export const ACTIVITY_STATUS_OPTIONS = ACTIVITY_STATUSES.map((value) => ({
  value,
  label: ACTIVITY_STATUS_LABELS[value],
  accent: statusStyles[value].accent,
})) as readonly { value: Status; label: string; accent: string }[];

export function isActivityStatus(value: string): value is Status {
  return ACTIVITY_STATUSES.includes(value as Status);
}

export function getActivityStatusLabel(value: string): string {
  if (isActivityStatus(value)) {
    return ACTIVITY_STATUS_LABELS[value];
  }
  return value;
}