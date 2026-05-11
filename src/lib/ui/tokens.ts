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
export const white = '#ffffff';
export const borderMuted = '#c9d2df';
export const borderSoft = '#dde3ec';
export const activityColumnBg = '#eef1f6';
export const overlayScrim = 'rgba(4, 9, 32, 0.35)';
export const surfaceMuted = '#f8fafc';
export const borderSubtle = 'rgba(4, 9, 32, 0.15)';
export const borderFaint = 'rgba(4, 9, 32, 0.05)';

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

// Feedback colors
export const error = '#ef4444';
export const errorBg = '#fee2e2';
export const warning = '#eab308';
export const warningBg = '#fef3c7';
export const success = '#22c55e';
export const successBg = '#dcfce7';
export const info = '#2563eb';
export const infoBg = '#eff6ff';

// Shadows
export const cardShadow =
  '0 1px 3px rgba(4, 9, 32, 0.08), 0 1px 2px rgba(4, 9, 32, 0.04)';
export const elevatedShadow =
  '0 10px 15px -3px rgba(4, 9, 32, 0.08), 0 4px 6px -4px rgba(4, 9, 32, 0.04)';
export const drawerShadow = '-12px 0 30px rgba(4, 9, 32, 0.12)';
export const floatingBadgeShadow = `0 0 0 2px ${white}`;

// Borders
export const cardBorder = `1px solid ${hairline}`;

// Button tokens
export const buttonPrimaryBg = navy;
export const buttonPrimaryHover = primaryContainerHover;
export const buttonPrimaryText = '#ffffff';
export const buttonOutlineBorder = 'rgba(4, 9, 32, 0.15)';
export const buttonOutlineHoverBg = 'rgba(4, 9, 32, 0.04)';

// Input tokens
export const inputBorder = '#e2e8f0';
export const inputFocusBorder = skyBlue;
export const inputBg = '#ffffff';

// Text colors
export const textMuted = 'rgba(13, 31, 60, 0.55)';
export const textPrimary = '#040920';
export const textStrong = '#0d1f3c';
export const textSecondary = 'rgba(13, 31, 60, 0.70)';
export const textSubtle = 'rgba(13, 31, 60, 0.60)';
export const textFaint = 'rgba(13, 31, 60, 0.40)';
export const iconMuted = 'rgba(13, 31, 60, 0.45)';
export const slateText = '#59677a';
export const dangerText = '#b91c1c';
export const warningText = '#a16207';
export const successText = '#15803d';
export const successTextHover = '#166534';
export const progressBg = surfaceMuted;
export const progressFg = navy;

export const reassignmentNotice = {
  border: statusStyles.aguardando_terceiros.accent,
  bg: priorityStyles.alta.bg,
  label: '#7a4a08',
  text: '#5a3a08',
};

export const infoNotice = {
  border: '#93c5fd',
  bg: infoBg,
  iconBg: info,
  text: '#1e40af',
};
