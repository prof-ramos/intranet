import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getInitialAdminCredentials } from './seed-admin-config';
import { ensureAdminPasswordAuthUser } from '@/lib/supabase/admin';

async function main() {
  const { email, password } = getInitialAdminCredentials();
  const hash = await bcrypt.hash(password, 12);

  const [existingAdmin] = await db
    .select({
      id: admins.id,
      name: admins.name,
      role: admins.role,
    })
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);
  if (existingAdmin) {
    await db.transaction(async (tx) => {
      await tx
        .update(admins)
        .set({
          passwordHash: hash,
          mustChangePassword: true,
          updatedAt: new Date(),
        })
        .where(eq(admins.id, existingAdmin.id));

      await ensureAdminPasswordAuthUser({
        email,
        password,
        name: existingAdmin.name,
        role: existingAdmin.role,
        mustChangePassword: true,
        resetPassword: true,
      });
    });

    console.log(`Admin already exists and was synced with Supabase Auth: ${email}`);
    console.log('The admin must change the initial password on first login.');
    return;
  }

  await db.transaction(async (tx) => {
    await tx.insert(admins).values({
      name: 'Administrador',
      email,
      passwordHash: hash,
      role: 'admin',
      mustChangePassword: true,
    });

    await ensureAdminPasswordAuthUser({
      email,
      password,
      name: 'Administrador',
      role: 'admin',
      mustChangePassword: true,
      resetPassword: true,
    });
  });

  console.log(`Admin created: ${email}`);
  console.log('The admin must change the initial password on first login.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
