import type { AuthRole } from '@/lib/auth/config';

export const PRIVILEGED_ROLES: readonly AuthRole[] = ['admin', 'diretoria'];

/**
 * Whether a role has elevated privileges (admin or diretoria).
 * This is the same check as requireRole(PRIVILEGED_ROLES) but
 * without the redirect — useful for conditional rendering and data filtering.
 */
export function isPrivilegedRole(role: AuthRole): boolean {
  return PRIVILEGED_ROLES.includes(role);
}