import { statusStyles } from '@/lib/ui/tokens';
import type { Filters } from './types';

export const columns = [
  { key: 'a_fazer', title: statusStyles.a_fazer.label, accent: statusStyles.a_fazer.accent },
  {
    key: 'em_andamento',
    title: statusStyles.em_andamento.label,
    accent: statusStyles.em_andamento.accent,
  },
  {
    key: 'aguardando_terceiros',
    title: statusStyles.aguardando_terceiros.label,
    accent: statusStyles.aguardando_terceiros.accent,
  },
  { key: 'concluido', title: statusStyles.concluido.label, accent: statusStyles.concluido.accent },
] as const;

export const defaultFilters: Filters = {
  scope: 'todas',
  query: '',
  assignee: '',
  priority: '',
  associate: '',
  dueWeek: false,
  dueLate: false,
  openOnly: false,
};
