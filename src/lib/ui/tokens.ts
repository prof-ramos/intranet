export const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2';

export const focusWithinClass =
  'focus-within:ring-2 focus-within:ring-[#76AEEA] focus-within:ring-offset-2';

export const mobileTouchTargetClass = 'min-h-11 min-w-11';

export const desktopDenseControlClass = 'min-h-11 lg:min-h-8';

export const compactActionClass = 'min-h-10 min-w-10 lg:min-h-8 lg:min-w-8';

export const hairline = 'rgba(4, 9, 32, 0.05)';
export const navy = '#040920';
export const primaryContainerHover = '#0d3260';
export const primaryContainerActive = '#123d73';
export const skyBlue = '#76AEEA';
export const canvas = '#f8fafc';

export const statusStyles: Record<
  string,
  { label: string; accent: string }
> = {
  a_fazer: { label: 'A fazer', accent: '#94a3b8' },
  em_andamento: { label: 'Em andamento', accent: '#76AEEA' },
  aguardando_terceiros: { label: 'Aguardando terceiros', accent: '#e7c16b' },
  concluido: { label: 'Concluído', accent: '#86efac' },
};

export const priorityStyles: Record<
  string,
  { label: string; fg: string; bg: string }
> = {
  urgente: { label: 'Urgente', fg: '#b91c1c', bg: '#fee2e2' },
  alta: { label: 'Alta', fg: '#a16207', bg: '#f4ddb1' },
  normal: { label: 'Normal', fg: 'rgba(13,31,60,0.70)', bg: canvas },
  baixa: { label: 'Baixa', fg: 'rgba(13,31,60,0.50)', bg: canvas },
};

export const infoNotice = {
  border: '#93c5fd',
  bg: '#eff6ff',
  iconBg: '#2563eb',
  text: '#1e40af',
};
