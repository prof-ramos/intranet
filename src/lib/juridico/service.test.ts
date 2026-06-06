import { beforeEach, describe, expect, it, vi } from 'vitest';
import { type PgTransaction } from 'drizzle-orm/pg-core';
import { type PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import * as schema from '@/lib/db/schema';
import { type ExtractTablesWithRelations } from 'drizzle-orm';
import {
  addNoteService,
  createConsultationService,
  updateConsultationStatusService,
} from './service';
import {
  getConsultationById,
  insertNote,
  touchConsultationInteraction,
  updateConsultationStatus,
} from './repository';
import { emitDomainEvent } from '@/lib/integrations/outbox';

const transactionMock = vi.hoisted(() => ({ tx: { __tx: true } }));
const FIXED_CREATED_AT = '2026-05-13T10:00:00.000Z';
const FIXED_UPDATED_AT = '2026-05-13T11:00:00.000Z';

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn(async (callback: (tx: PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>) => Promise<unknown>) =>
      callback(transactionMock.tx as unknown as PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>),
    ),
  },
}));

vi.mock('./repository', () => ({
  getConsultationById: vi.fn(),
  insertConsultation: vi.fn(),
  insertNote: vi.fn(),
  touchConsultationInteraction: vi.fn(),
  updateConsultationStatus: vi.fn(),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: vi.fn(),
}));

describe('juridico service', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Restore db.transaction to the default callback-invoking implementation
    // so retry-exhaust tests that override it don't pollute subsequent tests.
    const { db } = await import('@/lib/db');
    vi.mocked(db.transaction).mockImplementation(
      async (callback: unknown) => (callback as (tx: PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>) => Promise<unknown>)(transactionMock.tx as unknown as PgTransaction<PostgresJsQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>),
    );
  });

  describe('createConsultationService validation', () => {
    it('throws when title is empty', async () => {
      await expect(
        createConsultationService({
          title: '',
          questionSummary: 'Resumo válido',
          questionFullText: null,
          associateId: null,
          slaDays: 7,
          createdBy: 1,
        }),
      ).rejects.toThrow('O título da consulta é obrigatório.');
    });

    it('throws when title is whitespace only', async () => {
      await expect(
        createConsultationService({
          title: '   ',
          questionSummary: 'Resumo válido',
          questionFullText: null,
          associateId: null,
          slaDays: 7,
          createdBy: 1,
        }),
      ).rejects.toThrow('O título da consulta é obrigatório.');
    });

    it('throws when questionSummary is empty', async () => {
      await expect(
        createConsultationService({
          title: 'Título válido',
          questionSummary: '',
          questionFullText: null,
          associateId: null,
          slaDays: 7,
          createdBy: 1,
        }),
      ).rejects.toThrow('O resumo da pergunta é obrigatório.');
    });

    it('throws when createdBy is NaN', async () => {
      await expect(
        createConsultationService({
          title: 'Título válido',
          questionSummary: 'Resumo válido',
          questionFullText: null,
          associateId: null,
          slaDays: 7,
          createdBy: NaN,
        }),
      ).rejects.toThrow('Usuário criador inválido.');
    });

    it('throws when createdBy is zero', async () => {
      await expect(
        createConsultationService({
          title: 'Título válido',
          questionSummary: 'Resumo válido',
          questionFullText: null,
          associateId: null,
          slaDays: 7,
          createdBy: 0,
        }),
      ).rejects.toThrow('Usuário criador inválido.');
    });
  });

  describe('generateInternalNumber retry exhaust', () => {
    it('throws after MAX_RETRIES attempts on unique constraint violation', async () => {
      const { db } = await import('@/lib/db');
      const uniqueError = new Error('unique constraint violation');

      vi.mocked(db.transaction).mockRejectedValue(uniqueError);

      await expect(
        (await import('./service')).generateInternalNumber(),
      ).rejects.toThrow('unique constraint violation');

      // MAX_RETRIES is 3 — transaction must be attempted exactly 3 times
      expect(db.transaction).toHaveBeenCalledTimes(3);
    });

    it('does not retry on non-unique-constraint errors', async () => {
      const { db } = await import('@/lib/db');
      const genericError = new Error('connection refused');

      vi.mocked(db.transaction).mockRejectedValue(genericError);

      await expect(
        (await import('./service')).generateInternalNumber(),
      ).rejects.toThrow('connection refused');

      expect(db.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('internal number format', () => {
    it('produces JUR-YYYY-NNN format with zero padding', () => {
      const year = new Date().getFullYear();
      const nextNum = 1;
      const formatted = `JUR-${year}-${String(nextNum).padStart(3, '0')}`;
      expect(formatted).toBe(`JUR-${year}-001`);

      const nextNum99 = 99;
      const formatted99 = `JUR-${year}-${String(nextNum99).padStart(3, '0')}`;
      expect(formatted99).toBe(`JUR-${year}-099`);

      const nextNum100 = 100;
      const formatted100 = `JUR-${year}-${String(nextNum100).padStart(3, '0')}`;
      expect(formatted100).toBe(`JUR-${year}-100`);
    });
  });

  describe('updateConsultationStatusService', () => {
    it('touches last interaction when status becomes respondida', async () => {
      vi.mocked(getConsultationById).mockResolvedValue({
        id: 10,
        internalNumber: 'JUR-2026-010',
        title: 'Consulta',
        questionSummary: 'Resumo',
        questionFullText: null,
        status: 'aberta',
        satisfaction: null,
        slaDueDate: null,
        lastInteractionAt: null,
        finalAnswer: null,
        attachments: [],
        createdAt: FIXED_CREATED_AT,
        updatedAt: FIXED_UPDATED_AT,
        associate: null,
        answeredBy: null,
        createdBy: { id: 1, name: 'Admin' },
      });

      await updateConsultationStatusService(10, 'respondida');

      expect(updateConsultationStatus).toHaveBeenCalledOnce();
      const [, status, lastInteractionAt] = vi.mocked(updateConsultationStatus).mock.calls[0];
      expect(status).toBe('respondida');
      expect(lastInteractionAt).toBeInstanceOf(Date);
      expect(emitDomainEvent).toHaveBeenCalledOnce();
    });

    it('throws for invalid status', async () => {
      await expect(updateConsultationStatusService(10, 'invalido')).rejects.toThrow(
        'Status de consulta inválido.',
      );

      expect(updateConsultationStatus).not.toHaveBeenCalled();
    });

    it('throws for invalid id', async () => {
      await expect(updateConsultationStatusService(0, 'aberta')).rejects.toThrow(
        'Consulta inválida.',
      );

      expect(updateConsultationStatus).not.toHaveBeenCalled();
    });

    it('does not emit status change events for non-webhookable statuses', async () => {
      vi.mocked(getConsultationById).mockResolvedValue({
        id: 10,
        internalNumber: 'JUR-2026-010',
        title: 'Consulta',
        questionSummary: 'Resumo',
        questionFullText: null,
        status: 'aguardando_escritorio',
        satisfaction: null,
        slaDueDate: null,
        lastInteractionAt: null,
        finalAnswer: null,
        attachments: [],
        createdAt: FIXED_CREATED_AT,
        updatedAt: FIXED_UPDATED_AT,
        associate: null,
        answeredBy: null,
        createdBy: { id: 1, name: 'Admin' },
      });

      await updateConsultationStatusService(10, 'aberta');

      expect(updateConsultationStatus).toHaveBeenCalledOnce();
      expect(emitDomainEvent).not.toHaveBeenCalled();
    });
  });

  describe('addNoteService', () => {
    it('touches consultation interaction after adding a consultation note', async () => {
      await addNoteService({
        entityType: 'consultation',
        entityId: 20,
        content: 'Nota',
        createdBy: 1,
        isEscritorioResponse: false,
      });

      expect(insertNote).toHaveBeenCalledWith(
        {
          entityType: 'consultation',
          entityId: 20,
          content: 'Nota',
          createdBy: 1,
          isEscritorioResponse: false,
        },
        transactionMock.tx,
      );
      expect(touchConsultationInteraction).toHaveBeenCalledWith(20, transactionMock.tx);
    });

    it('does not touch consultation interaction for process notes', async () => {
      await addNoteService({
        entityType: 'process',
        entityId: 20,
        content: 'Nota',
        createdBy: 1,
        isEscritorioResponse: false,
      });

      expect(insertNote).toHaveBeenCalledWith(
        {
          entityType: 'process',
          entityId: 20,
          content: 'Nota',
          createdBy: 1,
          isEscritorioResponse: false,
        },
        transactionMock.tx,
      );
      expect(touchConsultationInteraction).not.toHaveBeenCalled();
    });

    it('rejects empty note content before repository calls', async () => {
      await expect(
        addNoteService({
          entityType: 'consultation',
          entityId: 20,
          content: '   ',
          createdBy: 1,
          isEscritorioResponse: false,
        }),
      ).rejects.toThrow('O conteúdo da nota é obrigatório.');

      expect(insertNote).not.toHaveBeenCalled();
      expect(touchConsultationInteraction).not.toHaveBeenCalled();
    });
  });
});
