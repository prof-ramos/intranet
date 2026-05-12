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
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);
  if (existingAdmin) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  await db.insert(admins).values({
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

  console.log(`Admin created: ${email}`);
  console.log('The admin must change the initial password on first login.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
