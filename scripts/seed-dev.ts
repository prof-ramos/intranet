import bcrypt from 'bcryptjs';
import { and, eq, inArray, like } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  activities,
  admins,
  associates,
  lawyers,
  legalConsultations,
  monthlyPayments,
  oficios,
  type NewActivity,
  type NewAssociate,
  type NewLegalConsultation,
  type NewMonthlyPayment,
  type NewOfficialLetter,
} from '@/lib/db/schema';
import { assertDevSeedDatabaseAllowed } from './dev-seed-safety';
import { getInitialAdminCredentials } from './seed-admin-config';

const DEV_SOURCE_PREFIX = 'dev-official-';
const YEAR = 2026;
const FUNCTIONAL_STATUSES = ['aposentado', 'cedido', 'em_licenca', 'ativo'] as const;
const PAYMENT_METHODS = ['folha', 'boleto', 'pix', 'transferencia'] as const;
const CLASS_PATTERNS = ['Classe A - V', 'Classe B - III', 'Classe C - II', 'Especial - I'] as const;
const ACTIVITY_STATUSES = ['a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido'] as const;
const ACTIVITY_PRIORITIES = ['baixa', 'normal', 'alta', 'urgente'] as const;
const LEGAL_STATUSES = ['aberta', 'aguardando_escritorio', 'respondida', 'arquivada'] as const;
const OFICIO_STATUSES = ['gerado', 'rascunho', 'cancelado'] as const;

const firstNames = [
  'Ana',
  'Bruno',
  'Carla',
  'Daniel',
  'Eduarda',
  'Felipe',
  'Gabriela',
  'Henrique',
  'Isabela',
  'Joao',
  'Laura',
  'Marcos',
];

const lastNames = [
  'Almeida',
  'Barbosa',
  'Cardoso',
  'Duarte',
  'Esteves',
  'Ferreira',
  'Gomes',
  'Lima',
  'Moraes',
  'Nogueira',
];

const assignments = [
  ['SERE', 'Brasilia', 'Brasil'],
  ['Embaixada em Paris', 'Paris', 'Franca'],
  ['Consulado-Geral em Nova York', 'Nova York', 'Estados Unidos'],
  ['Embaixada em Lisboa', 'Lisboa', 'Portugal'],
  ['Embaixada em Buenos Aires', 'Buenos Aires', 'Argentina'],
  ['Consulado-Geral em Toquio', 'Toquio', 'Japao'],
] as const;

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

function monthAgo(monthOffset: number): Date {
  const date = new Date(Date.UTC(YEAR, 5 - monthOffset, 10, 12, 0, 0));
  return date;
}

async function ensureDevAdmin() {
  const { email, password } = getInitialAdminCredentials();
  const passwordHash = await bcrypt.hash(password, 12);

  const [existing] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(admins)
    .values({
      name: 'Administrador Dev',
      email,
      passwordHash,
      role: 'admin',
      isActive: true,
      mustChangePassword: true,
    })
    .returning({ id: admins.id });

  return created.id;
}

async function ensureDevLawyers() {
  const values = [
    {
      name: 'Dra. Helena Costa',
      email: 'helena.costa@asof.local',
      oab: 'OAB/DF DEV-001',
      firm: 'Costa Advocacia Sintetica',
      specialty: 'Direito Administrativo',
    },
    {
      name: 'Dr. Renato Martins',
      email: 'renato.martins@asof.local',
      oab: 'OAB/SP DEV-002',
      firm: 'Martins Consultoria Juridica',
      specialty: 'Direito Previdenciario',
    },
  ];

  await db.insert(lawyers).values(values).onConflictDoNothing();
  return db
    .select({ id: lawyers.id })
    .from(lawyers)
    .where(inArray(lawyers.email, values.map((lawyer) => lawyer.email)));
}

function buildAssociates(): NewAssociate[] {
  return Array.from({ length: 120 }, (_, index) => {
    const seq = index + 1;
    const [assignment, city, country] = pick(assignments, index);
    const isAssociated = index < 82;
    const functionalStatus =
      index % 17 === 0
        ? FUNCTIONAL_STATUSES[0]
        : index % 29 === 0
          ? FUNCTIONAL_STATUSES[1]
          : index % 31 === 0
            ? FUNCTIONAL_STATUSES[2]
            : FUNCTIONAL_STATUSES[3];
    const contributionStatus = isAssociated && index % 5 !== 0 ? 'em_dia' : 'inadimplente';

    return {
      sourceRowNumber: `${DEV_SOURCE_PREFIX}${String(seq).padStart(3, '0')}`,
      fullName: `${pick(firstNames, index)} ${pick(lastNames, index * 3)} ${String(seq).padStart(3, '0')}`,
      primaryEmail: `oficial.${String(seq).padStart(3, '0')}@asof.local`,
      secondaryEmail: `oficial.${String(seq).padStart(3, '0')}@itamaraty.local`,
      siape: `DEV${String(seq).padStart(7, '0')}`,
      phone: `(61) 9${String(90000000 + seq).slice(1)}`,
      assignment,
      assignmentStartDate: `${2020 + (index % 6)}-${String((index % 12) + 1).padStart(2, '0')}-15`,
      locationCity: city,
      locationCountry: country,
      classPattern: pick(CLASS_PATTERNS, index),
      functionalStatus,
      associationStatus: isAssociated ? 'associado' : 'nao_associado',
      contributionStatus,
      associationCategory: isAssociated ? pick(['mensalista', 'anual'], index) : null,
      paymentMethod: pick(PAYMENT_METHODS, index),
      joinedAt: isAssociated ? `${2010 + (index % 13)}-03-10T12:00:00Z` : null,
      internalNotes: 'Registro sintético de desenvolvimento. Não representa pessoa real.',
    };
  });
}

function buildPayments(
  associateRows: Array<{ id: number; associationStatus: string; paymentMethod: NewAssociate['paymentMethod'] }>,
  adminId: number,
): NewMonthlyPayment[] {
  return associateRows
    .filter((associate) => associate.associationStatus === 'associado')
    .flatMap((associate, associateIndex) =>
      [2, 3, 4, 5].map((month, monthIndex) => {
        const shouldBePaid = (associateIndex + monthIndex) % 4 !== 0;
        return {
          associateId: associate.id,
          year: YEAR,
          month,
          status: shouldBePaid ? 'pago' : month < 5 ? 'atrasado' : 'pendente',
          paymentMethod: associate.paymentMethod,
          paidAt: shouldBePaid ? monthAgo(5 - month) : null,
          updatedBy: adminId,
        };
      }),
    );
}

async function main() {
  assertDevSeedDatabaseAllowed(process.env);

  const adminId = await ensureDevAdmin();
  const devLawyers = await ensureDevLawyers();

  await db.transaction(async (tx) => {
    const existingAssociates = await tx
      .select({ id: associates.id })
      .from(associates)
      .where(like(associates.sourceRowNumber, `${DEV_SOURCE_PREFIX}%`));
    const existingIds = existingAssociates.map((row) => row.id);

    if (existingIds.length > 0) {
      await tx.delete(monthlyPayments).where(inArray(monthlyPayments.associateId, existingIds));
      await tx.delete(legalConsultations).where(inArray(legalConsultations.associateId, existingIds));
      await tx.delete(activities).where(inArray(activities.associateId, existingIds));
      await tx.delete(associates).where(inArray(associates.id, existingIds));
    }

    await tx.delete(oficios).where(and(eq(oficios.year, YEAR), like(oficios.number, 'DEV-%')));

    const insertedAssociates = await tx
      .insert(associates)
      .values(buildAssociates())
      .returning({
        id: associates.id,
        fullName: associates.fullName,
        associationStatus: associates.associationStatus,
        paymentMethod: associates.paymentMethod,
      });

    await tx.insert(monthlyPayments).values(buildPayments(insertedAssociates, adminId));

    const devActivities: NewActivity[] =
      insertedAssociates.slice(0, 30).map((associate, index) => ({
        title: `Recadastramento sintético #${String(index + 1).padStart(2, '0')}`,
        description: 'Atividade sintética para desenvolvimento local.',
        status: pick(ACTIVITY_STATUSES, index),
        priority: pick(ACTIVITY_PRIORITIES, index),
        associateId: associate.id,
        assigneeId: adminId,
        createdBy: adminId,
        dueDate: new Date(Date.UTC(YEAR, 5, 20 + (index % 10), 12, 0, 0)).toISOString(),
        position: (index + 1) * 1000,
        tags: ['dev', 'sintetico'],
      }));
    await tx.insert(activities).values(devActivities);

    const devConsultations: NewLegalConsultation[] =
      insertedAssociates.slice(0, 20).map((associate, index) => ({
        internalNumber: `DEV-JUR-${YEAR}-${String(index + 1).padStart(3, '0')}`,
        title: `Consulta sintética de ${associate.fullName}`,
        questionSummary: 'Dúvida funcional sintética para desenvolvimento.',
        questionFullText: 'Texto sintético sem dados reais.',
        associateId: associate.id,
        status: pick(LEGAL_STATUSES, index),
        lawyerId: devLawyers[index % devLawyers.length]?.id ?? null,
        createdBy: adminId,
        answeredBy: index % 4 === 3 ? adminId : null,
        finalAnswer: index % 4 === 3 ? 'Resposta sintética registrada.' : null,
        slaDueDate: new Date(Date.UTC(YEAR, 5, 18 + (index % 12), 12, 0, 0)),
        lastInteractionAt: new Date(Date.UTC(YEAR, 5, 10 + (index % 12), 12, 0, 0)),
      }));
    await tx.insert(legalConsultations).values(devConsultations);

    const devOficios: NewOfficialLetter[] =
      Array.from({ length: 12 }, (_, index) => ({
        number: `DEV-${String(index + 1).padStart(3, '0')}/${YEAR}-ASOF`,
        year: YEAR,
        sequence: 9000 + index,
        recipient: pick(['Secretaria de Gestao de Pessoas', 'Departamento do Servico Exterior', 'Gabinete'], index),
        recipientRole: pick(['Secretario', 'Diretor', 'Chefe de Gabinete'], index),
        vocativo: 'Senhor(a)',
        letterDate: `${index + 1} de junho de ${YEAR}`,
        subject: `Oficio sintetico #${index + 1}`,
        itamaratySector: pick(['SGP', 'DSE', 'SETEC'], index),
        signatoryName: 'Presidencia ASOF',
        signatoryRole: 'Presidente',
        closure: 'Atenciosamente,',
        bodyRichText: 'Conteudo sintetico para desenvolvimento local.',
        bodyPlainText: 'Conteudo sintetico para desenvolvimento local.',
        status: pick(OFICIO_STATUSES, index),
        createdBy: adminId,
      }));
    await tx.insert(oficios).values(devOficios);
  });

  console.log('Development seed complete: 120 oficiais, mensalidades, atividades, consultas juridicas e oficios sintéticos.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
