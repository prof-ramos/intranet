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
  status: '',
  associate: '',
  label: '',
  dueWeek: false,
  dueLate: false,
  openOnly: false,
};

const COLOR_TOKEN_PATTERN = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_COLOR_TOKEN = '#64748b';

export function safeColorToken(token: string): string {
  return COLOR_TOKEN_PATTERN.test(token) ? token : FALLBACK_COLOR_TOKEN;
}
