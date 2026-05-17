import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getDevAuthUser, isAuthRole, isSkipAuthEnabled, type SessionData } from '@/lib/auth/config';

export async function getSession(): Promise<SessionData | null> {
  if (isSkipAuthEnabled()) {
    return { ...getDevAuthUser(), isLoggedIn: true };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  const normalizedEmail = user.email.trim().toLowerCase();

  const [admin] = await db
    .select({
      id: admins.id,
      name: admins.name,
      email: admins.email,
      role: admins.role,
      isActive: admins.isActive,
      mustChangePassword: admins.mustChangePassword,
    })
    .from(admins)
    .where(sql`lower(${admins.email}) = ${normalizedEmail}`)
    .limit(1);

  if (!admin || !admin.isActive || !isAuthRole(admin.role)) {
    return null;
  }

  return {
    userId: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
    isLoggedIn: true,
  };
}

export async function destroySession(): Promise<void> {
  if (isSkipAuthEnabled()) {
    return;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
