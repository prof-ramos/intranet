import { type AuthRole } from '@/lib/auth/config';

export const ROLE_LABELS: Record<AuthRole, string> = {
  admin: 'Coordenador',
  diretoria: 'Diretoria',
  secretaria: 'Secretaria',
};

export function getRoleLabel(role: AuthRole): string {
  return ROLE_LABELS[role] ?? role;
}
