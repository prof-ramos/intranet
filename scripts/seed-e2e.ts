import { closeDb, db, truncateAll } from '../e2e/helpers/db';
import { activities, admins, associates, monthlyPayments, oficios } from '@/lib/db/schema';
import bcrypt from 'bcryptjs';
import {
  E2E_ADMIN_PASSWORD,
  E2E_ADMIN_EMAIL,
  E2E_DIRETORIA_EMAIL,
  E2E_SECRETARIA_EMAIL,
  ASSINAFY_DOC_PENDING,
  ASSINAFY_DOC_CERTIFICATED,
  ASSINAFY_SIGNING_URL_PENDING,
} from '../e2e/constants';

type OficioInsert = typeof oficios.$inferInsert;

let oficioCounter = 0;

function makeOficio(createdBy: number, overrides: Partial<OficioInsert> = {}): OficioInsert {
  const seq = ++oficioCounter;
  const year = 2026;
  return {
    number: `Ofício nº ${String(seq).padStart(3, '0')}/${year}-ASOF`,
    year,
    sequence: seq,
    recipient: 'Ministro das Relações Exteriores',
    recipientRole: 'Ministro de Estado',
    vocativo: 'Senhor Ministro',
    letterDate: `${seq} de janeiro de ${year}`,
    subject: `Solicitação de dados funcionais #${seq}`,
    itamaratySector: 'SGPR / SGP',
    signatoryName: 'Presidente da ASOF',
    signatoryRole: 'Presidente',
    closure: 'Atenciosamente,',
    bodyRichText: `Texto do ofício ${seq}.`,
    bodyPlainText: `Texto do ofício ${seq}.`,
    status: 'gerado',
    createdBy,
    ...overrides,
  };
}

async function main() {
  // Clear existing E2E data
  await truncateAll();

  const passwordHash = await bcrypt.hash(E2E_ADMIN_PASSWORD, 12);

  const insertedAdmins = await db
    .insert(admins)
    .values([
      {
        name: 'Admin E2E',
        email: E2E_ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
        isActive: true,
        mustChangePassword: false,
      },
      {
        name: 'Diretoria E2E',
        email: E2E_DIRETORIA_EMAIL,
        passwordHash,
        role: 'diretoria',
        isActive: true,
        mustChangePassword: false,
      },
      {
        name: 'Secretaria E2E',
        email: E2E_SECRETARIA_EMAIL,
        passwordHash,
        role: 'secretaria',
        isActive: true,
        mustChangePassword: false,
      },
    ])
    .returning();

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
        associationStatus: 'associado',
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
        retirementDate: '2023-04-01',
        associationStatus: 'associado',
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
        associationStatus: 'nao_associado',
        contributionStatus: 'inadimplente',
        birthDate: '1957-03-03',
        address: 'SQN 308 BL. A, Asa Norte',
        associationCategory: 'mensalista',
        paymentMethod: 'folha',
        joinedAt: '1994-02-01T08:00:00Z',
        internalNotes:
          'Ex-associado. Cancelamento em 15/09/2025. Oficial ativo com lotação permanente em São Francisco.',
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

  await db.insert(activities).values([
    {
      title: 'Revisar pendência vencida E2E',
      description: 'Atividade usada para validar a retomada operacional pelo dashboard.',
      status: 'a_fazer',
      priority: 'urgente',
      assigneeId: adminId,
      associateId: maria.id,
      dueDate: '2026-01-10T12:00:00.000Z',
      tags: ['e2e'],
      createdBy: adminId,
    },
    {
      title: 'Atividade concluída E2E',
      status: 'concluido',
      priority: 'normal',
      completedAt: new Date('2026-01-05T12:00:00.000Z'),
      tags: ['e2e'],
      createdBy: adminId,
    },
  ]);

  await db.insert(oficios).values([
    makeOficio(adminId, {
      subject: 'Solicitação de dados funcionais',
      bodyRichText: 'Solicitamos a lista atualizada de associados lotados na Embaixada em Paris.',
      bodyPlainText: 'Solicitamos a lista atualizada de associados lotados na Embaixada em Paris.',
    }),
    makeOficio(adminId, {
      recipient: 'Secretário-Geral',
      recipientRole: 'Secretário-Geral das Relações Exteriores',
      vocativo: 'Senhor Secretário-Geral',
      subject: 'Convite para evento anual',
      itamaratySector: 'SETEC / SEB',
      closure: 'Respeitosamente,',
      bodyRichText: 'Convidamos Vossa Excelência para o evento anual da ASOF.',
      bodyPlainText: 'Convidamos Vossa Excelência para o evento anual da ASOF.',
    }),
    // Ofícios com estados Assinafy para testes E2E
    makeOficio(adminId, {
      recipient: 'Diretor do DSE',
      recipientRole: 'Diretor',
      vocativo: 'Senhor Diretor',
      subject: 'Audiência institucional',
      itamaratySector: 'DSE',
      closure: 'Respeitosamente,',
      bodyRichText:
        'Solicitamos audiência institucional para tratar de assuntos de interesse da ASOF.',
      bodyPlainText:
        'Solicitamos audiência institucional para tratar de assuntos de interesse da ASOF.',
      status: 'rascunho',
    }),
    makeOficio(adminId, {
      recipient: 'Chefe da SEF',
      recipientRole: 'Chefe de Setor',
      vocativo: 'Senhor Chefe',
      subject: 'Reunião mensal',
      itamaratySector: 'SEF',
      bodyRichText: 'Convidamos para a reunião mensal da ASOF.',
      bodyPlainText: 'Convidamos para a reunião mensal da ASOF.',
      assinafyDocumentId: ASSINAFY_DOC_PENDING,
      assinafyStatus: 'pending_signature',
      assinafySigningUrl: ASSINAFY_SIGNING_URL_PENDING,
      assinafySentAt: new Date(),
    }),
    makeOficio(adminId, {
      recipient: 'Assessor Parlamentar',
      recipientRole: 'Assessor',
      vocativo: 'Senhor Assessor',
      subject: 'Pauta legislativa',
      itamaratySector: 'AP',
      closure: 'Respeitosamente,',
      bodyRichText: 'Solicitamos inclusão de pauta legislativa.',
      bodyPlainText: 'Solicitamos inclusão de pauta legislativa.',
      assinafyDocumentId: ASSINAFY_DOC_CERTIFICATED,
      assinafyStatus: 'certificated',
      assinafySignedAt: new Date(),
    }),
    makeOficio(adminId, {
      recipient: 'Secretário Adjunto',
      recipientRole: 'Secretário Adjunto',
      vocativo: 'Senhor Secretário',
      subject: 'Cancelamento de reunião',
      itamaratySector: 'SA',
      bodyRichText: 'Comunicamos o cancelamento da reunião marcada.',
      bodyPlainText: 'Comunicamos o cancelamento da reunião marcada.',
      status: 'cancelado',
    }),
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
