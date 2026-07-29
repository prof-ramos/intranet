import { db } from '@/lib/db';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import type { DbExecutor } from '@/lib/db';
import {
  findMaxInternalNumberSequence,
  insertConsultation,
  insertNote,
  touchConsultationInteraction,
  updateConsultationStatus,
  getConsultationById,
} from './repository';
import { isLegalConsultationStatus, type LegalConsultationStatus } from '@/lib/juridico/status';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { getBusinessDateParts } from '@/lib/utils/date';

const MAX_RETRIES = 3;
const WEBHOOKABLE_STATUS_TRANSITIONS = new Set<LegalConsultationStatus>([
  'aguardando_escritorio',
  'respondida',
  'arquivada',
]);

/**
 * Gera um número interno sequencial.
 * Se executado dentro de uma transação, recebe o executor via parâmetro.
 * Caso contrário, cria sua própria transação com retry em caso de conflito.
 */
export async function generateInternalNumber(
  executor?: DbExecutor,
  now: Date = new Date(),
): Promise<string> {
  const year = getBusinessDateParts(now).year;

  async function nextNumber(tx: DbExecutor): Promise<string> {
    const maxSequence = await findMaxInternalNumberSequence(year, tx);
    return `JUR-${year}-${String(maxSequence + 1).padStart(3, '0')}`;
  }

  if (executor) {
    return nextNumber(executor);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await db.transaction(async (tx) => nextNumber(tx as unknown as DbExecutor));
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
  // ponytail: generic internal failure (unique-constraint retries exhausted) — not classifiable as a domain error
}

interface CreateConsultationInput {
  title: string;
  questionSummary: string;
  questionFullText: string | null;
  associateId: number | null;
  slaDays: number;
  slaDueDate?: Date;
  createdBy: number;
  lawyerId?: number | null;
  threadId?: string | null;
}

/**
 * Cria uma consulta jurídica com número interno e SLA.
 * @throws Error se campos obrigatórios estiverem ausentes
 */
export async function createConsultationService(input: CreateConsultationInput) {
  if (!input.title.trim()) {
    throw new ValidationError('O título da consulta é obrigatório.');
  }
  if (!input.questionSummary.trim()) {
    throw new ValidationError('O resumo da pergunta é obrigatório.');
  }
  if (!input.createdBy || Number.isNaN(input.createdBy)) {
    throw new ValidationError('Usuário criador inválido.');
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const internalNumber = await generateInternalNumber(tx);
        const slaDueDate =
          input.slaDueDate ??
          (() => {
            const d = new Date();
            d.setDate(d.getDate() + input.slaDays);
            return d;
          })();

        const inserted = await insertConsultation(
          {
            internalNumber,
            title: input.title.trim(),
            questionSummary: input.questionSummary.trim(),
            questionFullText: input.questionFullText?.trim() || null,
            associateId: input.associateId,
            slaDueDate,
            createdBy: input.createdBy,
            lastInteractionAt: new Date(),
            lawyerId: input.lawyerId ?? null,
            threadId: input.threadId ?? null,
          },
          tx as unknown as DbExecutor,
        );

        await emitDomainEvent(
          {
            type: 'legal_consultation.created',
            entityType: 'legal_consultation',
            entityId: inserted.id,
            actorAdminId: input.createdBy,
            payload: {
              internalNumber,
              status: 'aberta',
              associateId: input.associateId ?? null,
              slaDueDate: slaDueDate.toISOString(),
              title: input.title.trim(),
              links: {
                app: `/app/juridico/consultas/${inserted.id}`,
              },
            },
          },
          tx as unknown as DbExecutor,
        );

        return inserted;
      });
    } catch (error) {
      const isUniqueViolation =
        error instanceof Error && /unique constraint|duplicate key/i.test(error.message);

      if (!isUniqueViolation || attempt === MAX_RETRIES) {
        throw error;
      }

      await new Promise((r) => setTimeout(r, 50 * attempt));
    }
  }

  throw new Error('Falha ao criar consulta após múltiplas tentativas.');
  // ponytail: generic internal failure (unique-constraint retries exhausted) — not classifiable as a domain error
}

export async function updateConsultationStatusService(id: number, status: string) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ValidationError('Consulta inválida.');
  }
  if (!isLegalConsultationStatus(status)) {
    throw new ValidationError('Status de consulta inválido.');
  }

  const validStatus: LegalConsultationStatus = status;
  const lastInteractionAt = validStatus === 'respondida' ? new Date() : undefined;

  await db.transaction(async (tx) => {
    const current = await getConsultationById(id, tx);
    if (!current) {
      throw new NotFoundError('Consulta');
    }

    if (current.status === validStatus) {
      return;
    }

    await updateConsultationStatus(id, validStatus, lastInteractionAt, tx);

    if (!WEBHOOKABLE_STATUS_TRANSITIONS.has(validStatus)) {
      return;
    }

    await emitDomainEvent(
      {
        type: 'legal_consultation.status_changed',
        entityType: 'legal_consultation',
        entityId: id,
        actorAdminId: current.createdBy.id,
        payload: {
          internalNumber: current.internalNumber,
          title: current.title,
          previousStatus: current.status,
          status: validStatus,
          links: {
            app: `/app/juridico/consultas/${id}`,
          },
        },
      },
      tx,
    );
  });
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
    throw new ValidationError('Tipo de entidade inválido.');
  }
  if (!Number.isInteger(input.entityId) || input.entityId <= 0) {
    throw new ValidationError('Entidade inválida.');
  }
  if (!input.content.trim()) {
    throw new ValidationError('O conteúdo da nota é obrigatório.');
  }
  if (!Number.isInteger(input.createdBy) || input.createdBy <= 0) {
    throw new ValidationError('Usuário criador inválido.');
  }

  await db.transaction(async (tx) => {
    await insertNote({ ...input, content: input.content.trim() }, tx);

    if (input.entityType === 'consultation') {
      await touchConsultationInteraction(input.entityId, tx);
    }
  });
}
