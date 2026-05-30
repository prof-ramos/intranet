import { db } from '@/lib/db';
import { admins, lawyers } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { getInitialAdminCredentials } from './seed-admin-config';

async function seedAdmin() {
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

async function seedLawyers() {
  const lawFirms = [
    { name: 'Dr. Carlos Andrade', email: 'carlos.andrade@asof.org.br', oab: 'OAB/DF 12345', firm: 'Andrade & Associados', specialty: 'Direito Administrativo' },
    { name: 'Dra. Marina Silva', email: 'marina.silva@asof.org.br', oab: 'OAB/SP 67890', firm: 'Silva Advocacia', specialty: 'Direito Trabalhista' },
    { name: 'Dr. Rafael Oliveira', email: 'rafael.oliveira@asof.org.br', oab: 'OAB/RJ 54321', firm: 'Oliveira & Mendes Advogados', specialty: 'Direito Civil' },
  ];

  for (const lawyer of lawFirms) {
    const [existing] = await db
      .select({ id: lawyers.id })
      .from(lawyers)
      .where(eq(lawyers.email, lawyer.email))
      .limit(1);

    if (existing) {
      console.log(`Lawyer ${lawyer.name} already exists, skipping.`);
      continue;
    }

    await db.insert(lawyers).values(lawyer);
    console.log(`Lawyer ${lawyer.name} created successfully.`);
  }
}

async function main() {
  await seedAdmin();
  await seedLawyers();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
