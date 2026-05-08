import { redirect } from 'next/navigation';
import { type AuthRole } from './config';
import { requireAuth } from './require-auth';

export function canAccessRole(role: AuthRole, allowedRoles: readonly AuthRole[]): boolean {
  return allowedRoles.includes(role);
}

export async function requireRole(allowedRoles: readonly AuthRole[]) {
  const user = await requireAuth();

  if (!canAccessRole(user.role, allowedRoles)) {
    redirect('/app');
  }

  return user;
}
