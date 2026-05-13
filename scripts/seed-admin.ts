import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getInitialAdminCredentials } from './seed-admin-config';
import { ensureAdminPasswordAuthUser, deleteAdminAuthUser } from '@/lib/supabase/admin';

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
    await ensureAdminPasswordAuthUser({
      email,
      password,
      name: existingAdmin.name,
      role: existingAdmin.role,
      mustChangePassword: true,
      resetPassword: true,
    });

    await db
      .update(admins)
      .set({
        passwordHash: hash,
        mustChangePassword: true,
        updatedAt: new Date(),
      })
      .where(eq(admins.id, existingAdmin.id));

    console.log('Admin already exists and was synced with Supabase Auth.');
    console.log('The admin must change the initial password on first login.');
    return;
  }

  const { userId } = await ensureAdminPasswordAuthUser({
    email,
    password,
    name: 'Administrador',
    role: 'admin',
    mustChangePassword: true,
    resetPassword: true,
  });

  try {
    await db.insert(admins).values({
      name: 'Administrador',
      email,
      passwordHash: hash,
      role: 'admin',
      mustChangePassword: true,
    });
  } catch (error) {
    console.error('DB insert failed after creating auth user. Rolling back auth user...');
    try {
      await deleteAdminAuthUser(email);
    } catch {
      /* cleanup failure logged by helper */
    }
    throw error;
  }

  console.log('Admin created successfully.');
  console.log('The admin must change the initial password on first login.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
