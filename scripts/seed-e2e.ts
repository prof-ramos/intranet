import { db } from '../e2e/helpers/db';
import { admins, associates } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';

async function main() {
  const passwordHash = await bcrypt.hash('Senha-Forte-2026!', 12);

  await db.insert(admins).values([
    {
      name: 'Admin E2E',
      email: 'e2e-admin@asof.local',
      passwordHash,
      role: 'admin',
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: 'Diretoria E2E',
      email: 'e2e-diretoria@asof.local',
      passwordHash,
      role: 'diretoria',
      isActive: true,
      mustChangePassword: false,
    },
    {
      name: 'Secretaria E2E',
      email: 'e2e-secretaria@asof.local',
      passwordHash,
      role: 'secretaria',
      isActive: true,
      mustChangePassword: false,
    },
  ]);

  await db.insert(associates).values([
    {
      fullName: 'João da Silva',
      primaryEmail: 'joao@asof.local',
      functionalStatus: 'ativo',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
    },
    {
      fullName: 'Maria Oliveira',
      primaryEmail: 'maria@asof.local',
      functionalStatus: 'aposentado',
      associationStatus: 'ativo',
      contributionStatus: 'inadimplente',
    },
  ]);

  console.log('E2E seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
