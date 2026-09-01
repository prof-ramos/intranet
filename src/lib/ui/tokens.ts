export const focusRingClass =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76AEEA] focus-visible:ring-offset-2';

export const focusWithinClass =
  'focus-within:ring-2 focus-within:ring-[#76AEEA] focus-within:ring-offset-2';

export const mobileTouchTargetClass = 'min-h-11 min-w-11';

export const desktopDenseControlClass = 'min-h-11 lg:min-h-8';

export const compactActionClass = 'min-h-10 min-w-10 lg:min-h-8 lg:min-w-8';

export const hairline = 'rgba(4, 9, 32, 0.05)';
export const navy = '#040920';
export const sidebarGradientStart = '#031a35';
export const sidebarGradientEnd = '#06284f';
export const sidebarAccentBorder = 'rgba(142, 193, 232, 0.22)';
export const sidebarEyebrowText = '#b3d2ea';
export const primaryContainerHover = '#0d3260';
export const primaryContainerActive = '#123d73';
export const skyBlue = '#76AEEA';
export const linkText = '#0d3260';
export const canvas = '#f8fafc';
export const white = '#ffffff';
export const borderMuted = '#c9d2df';
export const borderSoft = '#dde3ec';
export const overlayScrim = 'rgba(4, 9, 32, 0.35)';
export const surfaceMuted = '#f8fafc';
export const borderSubtle = 'rgba(4, 9, 32, 0.15)';
export const borderFaint = 'rgba(4, 9, 32, 0.05)';

export const statusStyles: Record<string, { label: string; accent: string }> = {
  a_fazer: { label: 'A fazer', accent: '#94a3b8' },
  em_andamento: { label: 'Em andamento', accent: '#76AEEA' },
  aguardando_terceiros: { label: 'Aguardando terceiros', accent: '#e7c16b' },
  concluido: { label: 'Concluído', accent: '#86efac' },
};

export const priorityStyles: Record<string, { label: string; fg: string; bg: string }> = {
  urgente: { label: 'Urgente', fg: '#b91c1c', bg: '#fee2e2' },
  alta: { label: 'Alta', fg: '#a16207', bg: '#f4ddb1' },
  normal: { label: 'Normal', fg: 'rgba(13,31,60,0.70)', bg: canvas },
  baixa: { label: 'Baixa', fg: 'rgba(13,31,60,0.50)', bg: canvas },
};

// Feedback colors
export const error = '#ef4444';
export const errorBg = '#fee2e2';
const errorBorder = '#fca5a5';
export const dangerBorder = errorBorder;
export const warning = '#eab308';
export const warningBg = '#fef3c7';
export const warningBorder = '#fde68a';
export const success = '#22c55e';
export const successBg = '#dcfce7';
export const info = '#2563eb';
export const infoBg = '#eff6ff';

// Shadows
export const cardShadow = '0 1px 3px rgba(4, 9, 32, 0.08), 0 1px 2px rgba(4, 9, 32, 0.04)';
export const elevatedShadow =
  '0 10px 15px -3px rgba(4, 9, 32, 0.08), 0 4px 6px -4px rgba(4, 9, 32, 0.04)';
export const drawerShadow = '-12px 0 30px rgba(4, 9, 32, 0.12)';

// Borders
export const cardBorder = `1px solid ${hairline}`;

// Button tokens
export const buttonPrimaryBg = navy;
export const buttonPrimaryHover = primaryContainerHover;
export const buttonPrimaryText = '#ffffff';
export const buttonOutlineBorder = 'rgba(4, 9, 32, 0.15)';
export const buttonOutlineHoverBg = 'rgba(4, 9, 32, 0.04)';

// Input tokens
export const inputBg = '#ffffff';

// Text colors
export const textMuted = 'rgba(13, 31, 60, 0.65)';
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
export const progressBg = surfaceMuted;
export const progressFg = navy;

// Category badge colors (used in DocumentList)
export const textEyebrowMuted = 'rgba(13,31,60,0.55)';

export const auditEntityBadgeColors: Record<string, { bg: string; text: string }> = {
  associate: { bg: '#eff6ff', text: '#1e40af' },
  admin: { bg: '#f5f3ff', text: '#5b21b6' },
  activity: { bg: '#fef3c7', text: '#92400e' },
  assignment: { bg: '#ecfdf5', text: '#065f46' },
  legal_consultation: { bg: '#fff1f2', text: '#9f1239' },
  legal_process: { bg: '#fff1f2', text: '#9f1239' },
  finance: { bg: '#dcfce7', text: '#15803d' },
  monthly_payment: { bg: '#dcfce7', text: '#15803d' },
  official_letter: { bg: '#e0f2fe', text: '#0369a1' },
  domain_event: { bg: '#eef1f6', text: '#59677a' },
  webhook_subscription: { bg: '#eef2ff', text: '#4338ca' },
};

export const categoryColors: Record<string, { bg: string; text: string }> = {
  modelo_contrato: { bg: '#e0f2fe', text: '#0369a1' },
  contrato: { bg: '#eff6ff', text: '#1e40af' },
  minuta: { bg: '#f5f3ff', text: '#5b21b6' },
  estatuto: { bg: '#faf5ff', text: '#6b21a8' },
  ata: { bg: '#ecfdf5', text: '#065f46' },
  oficio: { bg: '#f0fdf4', text: '#166534' },
  rh: { bg: '#fff7ed', text: '#9a3412' },
  evento: { bg: '#fff1f2', text: '#9f1239' },
  nota_fiscal: { bg: '#fef3c7', text: '#92400e' },
  comprovante: { bg: '#fef3c7', text: '#92400e' },
  outro: { bg: '#f1f5f9', text: '#334155' },
};

// File icon color tokens (used in DocumentList and similar components)
export const fileIconPdf = '#ef4444';
export const fileIconSpreadsheet = '#16a34a';
export const fileIconImage = '#3b82f6';
export const fileIconArchive = '#d97706';
export const fileIconCode = '#a855f7';
export const fileIconDefault = '#94a3b8';

// Alert / danger section tokens (used in privacidade page and similar destructive-action blocks)
export const alertDangerBorder = '#fecaca';
export const alertDangerBg = '#fff1f2';
export const alertDangerText = '#b91c1c';
export const alertDangerNoteBg = '#fef2f2';
export const alertDangerNoteText = '#991b1b';
export const alertDangerNoteBorder = '#fecaca';
export const alertDangerButtonBorder = '#fca5a5';
