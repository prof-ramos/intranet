import { db, truncateAll } from '../e2e/helpers/db';
import { admins, associates } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';

async function main() {
  // Clear existing E2E data
  await truncateAll();

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
      secondaryEmail: 'joao.silva@itamaraty.gov.br',
      cpf: '123.456.789-09',
      siape: '1234567',
      phone: '(61) 99999-1111',
      whatsapp: '(61) 99999-1111',
      assignment: 'Embaixada em Paris',
      assignmentStartDate: '2022-03-15',
      locationCity: 'Paris',
      locationCountry: 'França',
      classPattern: 'Classe A - Padrão V',
      functionalStatus: 'ativo',
      associationStatus: 'ativo',
      contributionStatus: 'em_dia',
      birthDate: '1985-07-12',
      address: 'SQN 308 BL. A, Asa Norte',
      associationCategory: 'mensalista',
      joinedAt: '2010-05-20T10:00:00Z',
      internalNotes: 'Associado fundador. Responsável pela filial Europa.',
    },
    {
      fullName: 'Maria Oliveira',
      primaryEmail: 'maria@asof.local',
      secondaryEmail: 'maria.oliveira@itamaraty.gov.br',
      cpf: '987.654.321-00',
      siape: '7654321',
      phone: '(61) 99999-2222',
      assignment: 'Consulado em Nova York',
      assignmentStartDate: '2020-01-10',
      locationCity: 'Nova York',
      locationCountry: 'EUA',
      classPattern: 'Classe B - Padrão III',
      functionalStatus: 'aposentado',
      associationStatus: 'ativo',
      contributionStatus: 'inadimplente',
      birthDate: '1960-03-03',
      address: 'Av. das Nações, 500',
      associationCategory: 'anual',
      joinedAt: '2015-08-14T14:30:00Z',
    },
    {
      fullName: 'EDSON MARCOS VALENTE',
      primaryEmail: 'edson.valente@itamaraty.gov.br',
      secondaryEmail: 'edsonmarcosvalente@yahoo.com.br',
      cpf: '149.468.401-25',
      siape: '0461303',
      phone: '(61) 99180-3759',
      assignment: 'São Francisco - Consulado-Geral',
      assignmentStartDate: '2023-01-10',
      locationCity: 'São Francisco',
      locationCountry: 'EUA',
      classPattern: 'Especial - V',
      functionalStatus: 'ativo',
      associationStatus: 'inativo',
      contributionStatus: 'inadimplente',
      birthDate: '1957-03-03',
      address: 'SQN 308 BL. A, Asa Norte',
      associationCategory: 'mensalista',
      joinedAt: '1994-02-01T08:00:00Z',
      internalNotes: 'Ex-associado. Cancelamento em 15/09/2025. Oficial ativo com lotação permanente em São Francisco.',
    },
  ]);

  console.log('E2E seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
