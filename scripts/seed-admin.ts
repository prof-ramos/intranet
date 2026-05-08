import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { getInitialAdminCredentials } from './seed-admin-config';

async function main() {
  const { email, password } = getInitialAdminCredentials();
  const hash = await bcrypt.hash(password, 12);

  await db.insert(admins)
    .values({
      name: 'Administrador',
      email,
      passwordHash: hash,
      role: 'admin',
      mustChangePassword: true,
    })
    .run();

  console.log(`Admin created: ${email}`);
  console.log('The admin must change the initial password on first login.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
