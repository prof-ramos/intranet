import { eq, or, sql } from 'drizzle-orm';
import { db, type DbExecutor } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { ensureDevelopmentAdmin } from './dev-admin';

type DevelopmentAdminEnv = Record<string, string | undefined>;

export async function ensureDevelopmentAdminInDatabase(
  executor: DbExecutor = db,
  env: DevelopmentAdminEnv = process.env,
  passwordHasher?: () => Promise<string>,
): Promise<number> {
  return ensureDevelopmentAdmin(
    {
      async findByIdOrEmail(userId, email) {
        return executor
          .select({ id: admins.id, email: admins.email })
          .from(admins)
          .where(or(eq(admins.id, userId), eq(admins.email, email)));
      },
      async create(user, passwordHash) {
        await executor.insert(admins).overridingSystemValue().values({
          id: user.userId,
          name: user.name,
          email: user.email,
          passwordHash,
          role: user.role,
          isActive: true,
          mustChangePassword: user.mustChangePassword,
        });
      },
      async normalize(user) {
        await executor
          .update(admins)
          .set({
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: true,
            mustChangePassword: user.mustChangePassword,
          })
          .where(eq(admins.id, user.userId));
      },
      async realignIdentitySequence() {
        await executor.execute(sql`
          SELECT setval(
            'admins_id_seq',
            GREATEST(
              (SELECT COALESCE(MAX(id), 1) FROM admins),
              (SELECT last_value FROM admins_id_seq)
            ),
            true
          )
        `);
      },
    },
    env,
    passwordHasher,
  );
}
