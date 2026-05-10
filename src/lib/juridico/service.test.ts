import { describe, expect, it } from 'vitest';
import { createConsultationService } from './service';

describe('juridico service', () => {
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
});
