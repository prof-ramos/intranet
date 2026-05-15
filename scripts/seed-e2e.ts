import { closeDb, db, truncateAll } from '../e2e/helpers/db';
import { admins, associates, monthlyPayments, oficios } from '@/lib/db/schema';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const E2E_ADMIN_PASSWORD = 'Senha-Forte-2026!';

async function main() {
  // Clear existing E2E data
  await truncateAll();

  const passwordHash = await bcrypt.hash(E2E_ADMIN_PASSWORD, 12);

  const insertedAdmins = await db
    .insert(admins)
    .values([
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
    ])
    .returning();

  // Ensure corresponding Supabase Auth users exist so E2E login works.
  // We create them directly via the Admin API because the Next.js
  // `server-only` guard prevents us from importing the app's helper.
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.NEXT_PUBLIC_DATABASE_SUPABASE_URL ??
    process.env.DATABASE_SUPABASE_URL;
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.DATABASE_SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: listData, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

    if (!listError && listData) {
      for (const admin of insertedAdmins) {
        const existing = listData.users.find(
          (u) => u.email?.toLowerCase() === admin.email.toLowerCase(),
        );

        const payload = {
          email: admin.email,
          email_confirm: true,
          user_metadata: { name: admin.name },
          app_metadata: {
            role: admin.role,
            mustChangePassword: admin.mustChangePassword,
          },
        };

        if (existing) {
          const { error } = await supabase.auth.admin.updateUserById(existing.id, {
            ...payload,
            password: E2E_ADMIN_PASSWORD,
          });
          if (error) {
            console.error(`Failed to update auth user ${admin.email}:`, error.message);
          } else {
            console.log(`Updated Supabase auth user: ${admin.email}`);
          }
        } else {
          const { error } = await supabase.auth.admin.createUser({
            ...payload,
            password: E2E_ADMIN_PASSWORD,
          });
          if (error) {
            console.error(`Failed to create auth user ${admin.email}:`, error.message);
          } else {
            console.log(`Created Supabase auth user: ${admin.email}`);
          }
        }
      }
    } else if (listError) {
      console.error('Supabase auth user listing failed:', listError.message);
    }
  } else {
    console.warn('Supabase credentials not found; skipping auth user seed.');
  }

  const adminId = insertedAdmins[0].id;

  const insertedAssociates = await db
    .insert(associates)
    .values([
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
        paymentMethod: 'folha',
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
        paymentMethod: 'boleto',
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
        paymentMethod: 'folha',
        joinedAt: '1994-02-01T08:00:00Z',
        internalNotes: 'Ex-associado. Cancelamento em 15/09/2025. Oficial ativo com lotação permanente em São Francisco.',
      },
    ])
    .returning();

  const joao = insertedAssociates.find((a) => a.fullName === 'João da Silva')!;
  const maria = insertedAssociates.find((a) => a.fullName === 'Maria Oliveira')!;

  await db.insert(monthlyPayments).values([
    {
      associateId: joao.id,
      year: 2026,
      month: 1,
      status: 'pago',
      paymentMethod: 'folha',
      paidAt: new Date(),
      updatedBy: adminId,
    },
    {
      associateId: maria.id,
      year: 2026,
      month: 1,
      status: 'pendente',
      paymentMethod: 'boleto',
      updatedBy: adminId,
    },
  ]);

  await db.insert(oficios).values([
    {
      number: 'OFÍCIO No 001/2026/ASOF',
      year: 2026,
      sequence: 1,
      recipient: 'Ministro das Relações Exteriores',
      recipientRole: 'Ministro de Estado',
      vocativo: 'Senhor Ministro',
      letterDate: '13 de janeiro de 2026',
      subject: 'Solicitação de dados funcionais',
      itamaratySector: 'SGPR / SGP',
      signatoryName: 'Presidente da ASOF',
      signatoryRole: 'Presidente',
      closure: 'Atenciosamente,',
      bodyRichText: 'Solicitamos a lista atualizada de associados lotados na Embaixada em Paris.',
      bodyPlainText: 'Solicitamos a lista atualizada de associados lotados na Embaixada em Paris.',
      status: 'gerado',
      createdBy: adminId,
    },
    {
      number: 'OFÍCIO No 002/2026/ASOF',
      year: 2026,
      sequence: 2,
      recipient: 'Secretário-Geral',
      recipientRole: 'Secretário-Geral das Relações Exteriores',
      vocativo: 'Senhor Secretário-Geral',
      letterDate: '14 de janeiro de 2026',
      subject: 'Convite para evento anual',
      itamaratySector: 'SETEC / SEB',
      signatoryName: 'Presidente da ASOF',
      signatoryRole: 'Presidente',
      closure: 'Respeitosamente,',
      bodyRichText: 'Convidamos Vossa Excelência para o evento anual da ASOF.',
      bodyPlainText: 'Convidamos Vossa Excelência para o evento anual da ASOF.',
      status: 'gerado',
      createdBy: adminId,
    },
  ]);

  console.log('E2E seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
