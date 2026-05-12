import { db } from '@/lib/db';
import { legalConsultations } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '@/lib/db/schema';
import {
  insertConsultation,
  insertNote,
  touchConsultationInteraction,
  updateConsultationStatus,
} from './repository';
import { isLegalConsultationStatus, type LegalConsultationStatus } from '@/lib/juridico/status';

type Tx = PostgresJsDatabase<typeof schema>;

const MAX_RETRIES = 3;

/**
 * Gera um número interno sequencial.
 * Se executado dentro de uma transação, recebe o executor via parâmetro.
 * Caso contrário, cria sua própria transação com retry em caso de conflito.
 */
export async function generateInternalNumber(executor?: Tx): Promise<string> {
  const year = new Date().getFullYear();

  async function nextNumber(tx: Tx): Promise<string> {
    const likePattern = `JUR-${year}-%`;
    const regexPattern = `JUR-${year}-([0-9]+)`;
    const [result] = await tx
      .select({
        max: sql<string>`max(substring(${legalConsultations.internalNumber} from ${sql.raw(`'${regexPattern}'`)})::integer)`,
      })
      .from(legalConsultations)
      .where(sql`${legalConsultations.internalNumber} like ${likePattern}`);

    const nextNum = (Number(result?.max) || 0) + 1;
    return `JUR-${year}-${String(nextNum).padStart(3, '0')}`;
  }

  if (executor) {
    return nextNumber(executor);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await db.transaction(async (tx) => nextNumber(tx as unknown as Tx));
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error && /unique constraint|duplicate key/i.test(error.message);

      if (!isUniqueViolation || attempt === MAX_RETRIES) {
        throw error;
      }

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

  return db.transaction(async (tx) => {
    const internalNumber = await generateInternalNumber(tx as unknown as Tx);
    const slaDueDate = new Date();
    slaDueDate.setDate(slaDueDate.getDate() + input.slaDays);

    return insertConsultation(
      {
        internalNumber,
        title: input.title.trim(),
        questionSummary: input.questionSummary.trim(),
        questionFullText: input.questionFullText?.trim() || null,
        associateId: input.associateId,
        slaDueDate,
        createdBy: input.createdBy,
        lastInteractionAt: new Date(),
      },
      tx as unknown as Tx,
    );
  });
}

export async function updateConsultationStatusService(id: number, status: string) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('Consulta inválida.');
  }
  if (!isLegalConsultationStatus(status)) {
    throw new Error('Status de consulta inválido.');
  }

  const validStatus: LegalConsultationStatus = status;
  const lastInteractionAt = validStatus === 'respondida' ? new Date() : undefined;

  await updateConsultationStatus(id, validStatus, lastInteractionAt);
}

export type LegalNoteEntityType = 'consultation' | 'process';

interface AddNoteInput {
  entityType: LegalNoteEntityType;
  entityId: number;
  content: string;
  createdBy: number;
  isEscritorioResponse: boolean;
}

export async function addNoteService(input: AddNoteInput) {
  if (!['consultation', 'process'].includes(input.entityType)) {
    throw new Error('Tipo de entidade inválido.');
  }
  if (!Number.isInteger(input.entityId) || input.entityId < 0) {
    throw new Error('Entidade inválida.');
  }
  if (!input.content.trim()) {
    throw new Error('O conteúdo da nota é obrigatório.');
  }
  if (!Number.isInteger(input.createdBy) || input.createdBy <= 0) {
    throw new Error('Usuário criador inválido.');
  }

  await db.transaction(async (tx) => {
    await insertNote({ ...input, content: input.content.trim() }, tx);

    if (input.entityType === 'consultation') {
      await touchConsultationInteraction(input.entityId, tx);
    }
  });
}
