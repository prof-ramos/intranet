import { and, eq, inArray, like } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  activities,
  associates,
  dependents,
  lawyers,
  legalConsultations,
  monthlyPayments,
  oficios,
  type NewActivity,
  type NewAssociate,
  type NewDependent,
  type NewLegalConsultation,
  type NewMonthlyPayment,
  type NewOfficialLetter,
} from '@/lib/db/schema';
import { piiBlindIndex } from '@/lib/crypto/pii';
import {
  normalizeCpfForSearch,
  normalizeSiapeForSearch,
} from '@/lib/associates/search-params.shared';
import { assertDevSeedDatabaseAllowed } from './dev-seed-safety';
import { ensureDevelopmentAdminInDatabase } from './dev-admin-store';

const DEV_SOURCE_PREFIX = 'dev-official-';
const YEAR = 2026;
const FUNCTIONAL_STATUSES = ['aposentado', 'cedido', 'em_licenca', 'ativo'] as const;
const PAYMENT_METHODS = ['folha', 'boleto', 'pix', 'transferencia'] as const;
const CLASS_PATTERNS = ['Classe A - V', 'Classe B - III', 'Classe C - II', 'Especial - I'] as const;
const ACTIVITY_STATUSES = ['a_fazer', 'em_andamento', 'aguardando_terceiros', 'concluido'] as const;
const ACTIVITY_PRIORITIES = ['baixa', 'normal', 'alta', 'urgente'] as const;
const LEGAL_STATUSES = ['aberta', 'aguardando_escritorio', 'respondida', 'arquivada'] as const;
const OFICIO_STATUSES = ['gerado', 'rascunho', 'cancelado'] as const;

const maleNames = [
  'André',
  'Antônio',
  'Bruno',
  'Carlos',
  'Diego',
  'Eduardo',
  'Felipe',
  'Fernando',
  'Gabriel',
  'Gustavo',
  'Henrique',
  'João',
  'José',
  'Leandro',
  'Lucas',
  'Luís',
  'Luiz',
  'Marcelo',
  'Marcos',
  'Mateus',
  'Paulo',
  'Pedro',
  'Rafael',
  'Ricardo',
  'Roberto',
  'Rodrigo',
  'Samuel',
  'Sérgio',
  'Thiago',
  'Vinícius',
];

const femaleNames = [
  'Adriana',
  'Ana',
  'Beatriz',
  'Camila',
  'Carla',
  'Carolina',
  'Daniela',
  'Fernanda',
  'Isabela',
  'Júlia',
  'Letícia',
  'Luciana',
  'Mariana',
  'Patrícia',
  'Renata',
  'Tatiane',
];

const firstNames = [...maleNames, ...femaleNames];

const lastNames = [
  'Almeida',
  'Araújo',
  'Barbosa',
  'Barros',
  'Campos',
  'Cardoso',
  'Carvalho',
  'Castro',
  'Correia',
  'Costa',
  'Dias',
  'Fernandes',
  'Ferreira',
  'Freitas',
  'Gomes',
  'Lima',
  'Martins',
  'Melo',
  'Monteiro',
  'Moraes',
  'Moreira',
  'Nascimento',
  'Oliveira',
  'Pereira',
  'Ribeiro',
  'Santos',
  'Silva',
  'Souza',
  'Teixeira',
  'Vieira',
];

const assignments = [
  ['SERE', 'Brasilia', 'Brasil'],
  ['Embaixada em Paris', 'Paris', 'Franca'],
  ['Consulado-Geral em Nova York', 'Nova York', 'Estados Unidos'],
  ['Embaixada em Lisboa', 'Lisboa', 'Portugal'],
  ['Embaixada em Buenos Aires', 'Buenos Aires', 'Argentina'],
  ['Consulado-Geral em Toquio', 'Toquio', 'Japao'],
] as const;

const brazilianCities = [
  ['Rio de Janeiro', 'RJ'],
  ['São Paulo', 'SP'],
  ['Brasília', 'DF'],
  ['Belo Horizonte', 'MG'],
  ['Salvador', 'BA'],
  ['Fortaleza', 'CE'],
  ['Recife', 'PE'],
  ['Porto Alegre', 'RS'],
  ['Curitiba', 'PR'],
  ['Manaus', 'AM'],
  ['Belém', 'PA'],
  ['Goiânia', 'GO'],
  ['Vitória', 'ES'],
  ['Florianópolis', 'SC'],
  ['João Pessoa', 'PB'],
  ['Natal', 'RN'],
  ['São Luís', 'MA'],
  ['Maceió', 'AL'],
  ['Cuiabá', 'MT'],
  ['Campo Grande', 'MS'],
] as const;

const issuers = ['SSP', 'SSP', 'SSP', 'SSP', 'DETRAN', 'IFP'] as const;

const streetNames = [
  'SQS 308 Bloco K',
  'SHIS QI 11 Conjunto 6',
  'CLN 406 Bloco D',
  'SQN 207 Bloco A',
  'SGAN 604 Lote 23',
  'SHIN QL 10 Conjunto 4',
  'SEPS 709/909 Bloco E',
  'SIA Trecho 17 Lote 6',
  'SCRN 716 Bloco H',
  'SQSW 101 Bloco F',
  'SMPW 16 Conjunto 3',
  'SHCES Quadra 1301',
  'SQN 105 Bloco C',
  'SQS 202 Bloco L',
  'CLSW 103 Bloco A',
  'SQN 306 Bloco H',
  'SAS Quadra 5 Lote 11',
  'SHS Quadra 6 Conjunto A',
];

const neighborhoods = [
  'Asa Sul',
  'Asa Norte',
  'Sudoeste',
  'Lago Sul',
  'Lago Norte',
  'Jardim Botanico',
  'Guara',
  'Taguatinga',
  'Águas Claras',
  'Nucleo Bandeirante',
  'Park Way',
  'Sobradinho',
];

const ceps = [
  '70390-110',
  '70297-400',
  '70650-550',
  '70840-080',
  '71680-360',
  '71520-100',
  '70610-210',
  '70367-100',
  '70740-545',
  '71994-290',
];

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

function sexFromName(name: string): 'M' | 'F' {
  return maleNames.includes(name) ? 'M' : 'F';
}

function syntheticCpf(seq: number): string {
  const n = (seq * 423871 + 5737) % 1000000000;
  const base = String(n).padStart(9, '0');
  let d1 = 0;
  for (let i = 0; i < 9; i++) d1 += Number(base[i]) * (10 - i);
  d1 = d1 % 11 < 2 ? 0 : 11 - (d1 % 11);
  let d2 = 0;
  for (let i = 0; i < 9; i++) d2 += Number(base[i]) * (11 - i);
  d2 += d1 * 2;
  d2 = d2 % 11 < 2 ? 0 : 11 - (d2 % 11);
  return `${base.slice(0, 3)}.${base.slice(3, 6)}.${base.slice(6, 9)}-${d1}${d2}`;
}

function syntheticRg(seq: number): string {
  const digits = String(seq * 9817 + 593)
    .padStart(8, '0')
    .slice(0, 8);
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}`;
}

function fmtDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthAgo(monthOffset: number): Date {
  const date = new Date(Date.UTC(YEAR, 5 - monthOffset, 10, 12, 0, 0));
  return date;
}

async function ensureDevAdmin() {
  return db.transaction((tx) => ensureDevelopmentAdminInDatabase(tx));
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
    .where(
      inArray(
        lawyers.email,
        values.map((lawyer) => lawyer.email),
      ),
    );
}

/** Contagem canônica de dependentes (cache denormalizado + linhas em `dependents`). */
function dependentCountForIndex(index: number): number {
  if (index % 7 === 0) return 0;
  if (index % 5 === 0) return 3;
  if (index % 3 === 0) return 2;
  return 1;
}

function optionalIdentityHash(value: string): string | null {
  if (!process.env.ENCRYPTION_MASTER_KEY || !value) return null;
  return piiBlindIndex(value);
}

function buildAssociates(): NewAssociate[] {
  return Array.from({ length: 120 }, (_, index) => {
    const seq = index + 1;
    const firstName = pick(firstNames, index);
    const [assignment, city, country] = pick(assignments, index);
    const [bCity, bState] = pick(brazilianCities, index * 3 + 1);
    // index < 82: já teve vínculo; % 11 === 0 → ex-associado (cancelou)
    const everAssociated = index < 82;
    const isCancelled = everAssociated && index % 11 === 0;
    const isAssociated = everAssociated && !isCancelled;
    const functionalStatus =
      index % 17 === 0
        ? FUNCTIONAL_STATUSES[0]
        : index % 29 === 0
          ? FUNCTIONAL_STATUSES[1]
          : index % 31 === 0
            ? FUNCTIONAL_STATUSES[2]
            : FUNCTIONAL_STATUSES[3];
    const isRetired = functionalStatus === 'aposentado';
    const birthYear = 1965 - (index % 25) - (index % 7 === 0 ? 10 : 0);
    const admissionYear = birthYear + 28 + (index % 10);
    const inaugurationYear = admissionYear;
    const joinYear = 2010 + (index % 13);
    const joinedAt = everAssociated ? `${joinYear}-03-10T12:00:00Z` : null;
    const contributionStatus = isAssociated && index % 5 !== 0 ? 'em_dia' : 'inadimplente';
    const neighborhood = pick(neighborhoods, index);
    const street = pick(streetNames, index);

    return {
      sourceRowNumber: `${DEV_SOURCE_PREFIX}${String(seq).padStart(3, '0')}`,
      fullName: `${firstName} ${pick(lastNames, index)} ${pick(lastNames, index + 15)}`,
      sex: sexFromName(firstName),
      primaryEmail: `oficial.${String(seq).padStart(3, '0')}@asof.local`,
      secondaryEmail: `oficial.${String(seq).padStart(3, '0')}@itamaraty.local`,
      cpf: syntheticCpf(seq),
      cpfHash: optionalIdentityHash(normalizeCpfForSearch(syntheticCpf(seq))),
      siape: `DEV${String(seq).padStart(7, '0')}`,
      siapeHash: optionalIdentityHash(
        normalizeSiapeForSearch(`DEV${String(seq).padStart(7, '0')}`),
      ),
      phone: `(61) 9${String(90000000 + seq).slice(1)}`,
      whatsapp: `(61) 9${String(91000000 + seq).slice(1)}`,
      rg: syntheticRg(seq),
      rgIssuer: pick(issuers, index),
      rgState: pick(brazilianCities, index * 5 + 3)[1],
      rgExpeditionDate: fmtDate(birthYear + 20, (index % 12) + 1, 15),
      birthDate: fmtDate(birthYear, (index % 12) + 1, (index % 28) + 1),
      birthCity: bCity,
      birthState: bState,
      address: `${street}, apto ${(index % 10) + 1}${index % 3 === 0 ? '02' : '00'} — ${neighborhood}`,
      // All streetNames/ceps/neighborhoods in this seed are Brasília/DF — keep addressState as DF.
      addressState: 'DF',
      neighborhood,
      zipCode: pick(ceps, index),
      maritalStatus: pick(['casado', 'solteiro', 'divorciado', 'casado', 'casado'], index),
      numberOfDependents: dependentCountForIndex(index),
      assignment,
      assignmentStartDate: `${2020 + (index % 6)}-${String((index % 12) + 1).padStart(2, '0')}-15`,
      locationCity: city,
      locationCountry: country,
      admissionDate: fmtDate(admissionYear, (index % 12) + 1, 1),
      inaugurationDate: fmtDate(inaugurationYear, Math.min((index % 12) + 1, 11), 15),
      retirementDate: isRetired ? fmtDate(2021 + (index % 4), (index % 12) + 1, 1) : null,
      leaveDate:
        functionalStatus === 'em_licenca' ? fmtDate(2023 + (index % 2), (index % 12) + 1, 1) : null,
      cancellationDate: isCancelled
        ? fmtDate(joinYear + 2 + (index % 3), (index % 12) + 1, 1)
        : null,
      missionType: pick(['permanente', 'transitoria', 'permanente', 'permanente'], index),
      careerOrigin: pick(['brasil', 'brasil', 'brasil', 'exterior', 'outros_orgaos'], index),
      ceocMember: index % 13 === 0,
      caocMember: index % 17 === 0,
      classPattern: pick(CLASS_PATTERNS, index),
      functionalStatus,
      associationStatus: isAssociated ? 'associado' : 'nao_associado',
      contributionStatus,
      associationCategory: isAssociated ? pick(['mensalista', 'anual'], index) : null,
      paymentMethod: pick(PAYMENT_METHODS, index),
      joinedAt,
      internalNotes: 'Registro sintético de desenvolvimento. Não representa pessoa real.',
    };
  });
}

function buildDependents(associateRows: Array<{ id: number; fullName: string }>): NewDependent[] {
  return associateRows.flatMap((row, index) => {
    const count = dependentCountForIndex(index);
    if (count === 0) return [];
    return Array.from({ length: count }, (_, depIndex) => ({
      associateId: row.id,
      name: `Dependente ${depIndex + 1} de ${row.fullName.split(' ')[0]}`,
      relationship: pick(['cônjuge', 'filho(a)', 'filho(a)', 'pai/mãe'] as const, index + depIndex),
    }));
  });
}

function buildPayments(
  associateRows: Array<{
    id: number;
    associationStatus: string;
    paymentMethod: NewAssociate['paymentMethod'];
  }>,
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
      await tx
        .delete(legalConsultations)
        .where(inArray(legalConsultations.associateId, existingIds));
      await tx.delete(activities).where(inArray(activities.associateId, existingIds));
      await tx.delete(associates).where(inArray(associates.id, existingIds));
    }

    await tx.delete(oficios).where(and(eq(oficios.year, YEAR), like(oficios.number, 'DEV-%')));

    const insertedAssociates = await tx.insert(associates).values(buildAssociates()).returning({
      id: associates.id,
      fullName: associates.fullName,
      associationStatus: associates.associationStatus,
      paymentMethod: associates.paymentMethod,
    });

    const dependentRows = buildDependents(insertedAssociates);
    if (dependentRows.length > 0) {
      await tx.insert(dependents).values(dependentRows);
    }

    await tx.insert(monthlyPayments).values(buildPayments(insertedAssociates, adminId));

    const devActivities: NewActivity[] = insertedAssociates
      .slice(0, 30)
      .map((associate, index) => ({
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

    const devConsultations: NewLegalConsultation[] = insertedAssociates
      .slice(0, 20)
      .map((associate, index) => ({
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

    const devOficios: NewOfficialLetter[] = Array.from({ length: 12 }, (_, index) => ({
      number: `DEV-${String(index + 1).padStart(3, '0')}/${YEAR}-ASOF`,
      year: YEAR,
      sequence: 9000 + index,
      recipient: pick(
        ['Secretaria de Gestao de Pessoas', 'Departamento do Servico Exterior', 'Gabinete'],
        index,
      ),
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

  console.log(
    'Development seed complete: 120 oficiais, mensalidades, atividades, consultas juridicas e oficios sintéticos.',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
