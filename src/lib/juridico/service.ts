import { db } from '@/lib/db';
import { legalConsultations } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { insertConsultation } from './repository';

const MAX_RETRIES = 3;

/**
 * Gera um número interno sequencial dentro de uma transação.
 * Usa retry com backoff em caso de conflito de unique constraint.
 */
export async function generateInternalNumber(): Promise<string> {
  const year = new Date().getFullYear();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const next = await db.transaction(async (tx) => {
        // Consulta dentro da transação garante snapshot isolation
        const [result] = await tx
          .select({
            max: sql<string>`max(substring(${legalConsultations.internalNumber} from 'JUR-${year}-([0-9]+)')::integer)`,
          })
          .from(legalConsultations)
          .where(sql`${legalConsultations.internalNumber} like ${`JUR-${year}-%`}`);

        const nextNum = (Number(result?.max) || 0) + 1;
        return `JUR-${year}-${String(nextNum).padStart(3, '0')}`;
      });

      return next;
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error &&
        /unique constraint|duplicate key/i.test(error.message);

      if (!isUniqueViolation || attempt === MAX_RETRIES) {
        throw error;
      }

      // Backoff exponencial leve: 50ms, 150ms
      await new Promise((r) => setTimeout(r, 50 * attempt));
    }
  }

  throw new Error('Falha ao gerar número interno após múltiplas tentativas.');
}

interface CreateConsultationInput {
  title: string;
  questionSummary: string;
  questionFullText: string | null;
  associateId: number | null;
  slaDays: number;
  createdBy: number;
}

/**
 * Cria uma consulta jurídica com número interno e SLA.
 * @throws Error se campos obrigatórios estiverem ausentes
 */
export async function createConsultationService(input: CreateConsultationInput) {
  if (!input.title.trim()) {
    throw new Error('O título da consulta é obrigatório.');
  }
  if (!input.questionSummary.trim()) {
    throw new Error('O resumo da pergunta é obrigatório.');
  }
  if (!input.createdBy || Number.isNaN(input.createdBy)) {
    throw new Error('Usuário criador inválido.');
  }

  const internalNumber = await generateInternalNumber();
  const slaDueDate = new Date();
  slaDueDate.setDate(slaDueDate.getDate() + input.slaDays);

  const inserted = await insertConsultation({
    internalNumber,
    title: input.title.trim(),
    questionSummary: input.questionSummary.trim(),
    questionFullText: input.questionFullText?.trim() || null,
    associateId: input.associateId,
    slaDueDate,
    createdBy: input.createdBy,
    lastInteractionAt: new Date(),
  });

  return inserted;
}
