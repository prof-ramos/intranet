import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL || 'gabriel@asof.org.br';
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'admin123';
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
  console.log('You MUST change the default password on first login.');
}

main().catch(console.error);
