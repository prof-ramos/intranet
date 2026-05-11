import type { AuthRole } from '@/lib/auth/config';

/**
 * Whether a role has elevated privileges (admin or diretoria).
 * This is the same check as requireRole(['admin', 'diretoria']) but
 * without the redirect — useful for conditional rendering and data filtering.
 */
export function isPrivilegedRole(role: AuthRole | string): boolean {
  return role === 'admin' || role === 'diretoria';
}