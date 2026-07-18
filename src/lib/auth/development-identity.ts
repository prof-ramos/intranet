import { eq } from 'drizzle-orm';
import { db, type DbExecutor } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import type { AuthUser } from './config';

export async function resolvePersistedDevelopmentUser(
  configured: AuthUser,
  executor: DbExecutor = db,
): Promise<AuthUser> {
  const [admin] = await executor
    .select({
      id: admins.id,
      name: admins.name,
      email: admins.email,
      role: admins.role,
      isActive: admins.isActive,
      mustChangePassword: admins.mustChangePassword,
    })
    .from(admins)
    .where(eq(admins.id, configured.userId))
    .limit(1);

  if (!admin || !admin.isActive) {
    throw new Error(
      `Development admin ${configured.userId} is unavailable. Run npm run db:seed:dev before starting the app.`,
    );
  }

  if (admin.email.trim().toLowerCase() !== configured.email.trim().toLowerCase()) {
    throw new Error(
      `Development admin ${configured.userId} does not match DEV_USER_EMAIL. Run npm run db:seed:dev before starting the app.`,
    );
  }

  if (admin.role !== configured.role) {
    throw new Error(
      `Development admin ${configured.userId} does not match DEV_USER_ROLE. Run npm run db:seed:dev before starting the app.`,
    );
  }

  return {
    userId: admin.id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
  };
}
