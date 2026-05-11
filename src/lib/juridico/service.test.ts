import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addNoteService,
  createConsultationService,
  updateConsultationStatusService,
} from './service';
import { insertNote, touchConsultationInteraction, updateConsultationStatus } from './repository';

const transactionMock = vi.hoisted(() => ({ tx: { __tx: true } }));

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(transactionMock.tx),
    ),
  },
}));

vi.mock('./repository', () => ({
  insertConsultation: vi.fn(),
  insertNote: vi.fn(),
  touchConsultationInteraction: vi.fn(),
  updateConsultationStatus: vi.fn(),
}));

describe('juridico service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      await updateConsultationStatusService(10, 'respondida');

      expect(updateConsultationStatus).toHaveBeenCalledOnce();
      const [, status, lastInteractionAt] = vi.mocked(updateConsultationStatus).mock.calls[0];
      expect(status).toBe('respondida');
      expect(lastInteractionAt).toBeInstanceOf(Date);
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
