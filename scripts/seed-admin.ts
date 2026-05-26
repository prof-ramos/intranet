import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getInitialAdminCredentials } from './seed-admin-config';

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
    const isProduction = process.env.NODE_ENV === 'production';
    const force = process.argv.includes('--force');

    const updatePayload: Record<string, unknown> = {
      passwordHash: hash,
      mustChangePassword: true,
      updatedAt: new Date(),
    };

    if (!isProduction || force) {
      updatePayload.role = 'admin';
      updatePayload.isActive = true;
    }

    await db
      .update(admins)
      .set(updatePayload)
      .where(eq(admins.id, existingAdmin.id));

    console.log('Admin already exists and was updated in PostgreSQL.');
    console.log('The admin must change the initial password on first login.');
    return;
  }

  await db.insert(admins).values({
    name: 'Administrador',
    email,
    passwordHash: hash,
    role: 'admin',
    isActive: true,
    mustChangePassword: true,
  });

  console.log('Admin created successfully.');
  console.log('The admin must change the initial password on first login.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
