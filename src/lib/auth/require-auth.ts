import { redirect } from 'next/navigation';
import { getSession } from './session';
import { db } from '../db';
import { admins } from '../db/schema';
import { eq } from 'drizzle-orm';

export interface AuthUser {
  userId: number;
  name: string;
  email: string;
  role: 'admin' | 'diretoria' | 'secretaria';
  mustChangePassword: boolean;
}

export async function requireAuth(): Promise<AuthUser> {
  const session = await getSession();
  if (!session?.isLoggedIn) {
    redirect('/login');
  }

  const user = db
    .select()
    .from(admins)
    .where(eq(admins.id, session.userId))
    .get();

  if (!user || !user.isActive) {
    redirect('/login');
  }

  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}
