import { type AuthRole } from './config';

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Coordenador',
  diretoria: 'Diretoria',
  secretaria: 'Secretaria',
};

export function getRoleLabel(role: AuthRole | string): string {
  return ROLE_LABELS[role] ?? role;
}
