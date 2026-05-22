import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  saveOfficialLetter,
  updateOfficialLetter,
  cancelOfficialLetter,
  generateOfficialLetterNumber,
} from './service';
import { emitDomainEvent } from '@/lib/integrations/outbox';
import type { NewOfficialLetter, OfficialLetter } from '@/lib/db/schema/oficios';

const transactionMock = vi.hoisted(() => ({ tx: { __tx: true } }));
const BASE_OFFICIAL_LETTER: OfficialLetter = {
  id: 12,
  number: 'OFÍCIO No 001/2026/ASOF',
  year: 2026,
  sequence: 1,
  recipient: 'Destinatário',
  recipientRole: 'Cargo',
  vocativo: 'Senhor',
  letterDate: '13 de maio de 2026',
  subject: 'Assunto',
  itamaratySector: 'SGP',
  signatoryName: 'Nome',
  signatoryRole: 'Cargo',
  closure: 'Atenciosamente,',
  bodyRichText: 'Texto',
  bodyPlainText: 'Texto',
  pdfStoragePath: null,
  status: 'gerado',
  createdBy: 1,
  updatedBy: 1,
  createdAt: new Date('2026-05-13T10:00:00.000Z'),
  updatedAt: new Date('2026-05-13T11:00:00.000Z'),
};

vi.mock('@/lib/db', () => ({
  db: {
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(transactionMock.tx),
    ),
  },
}));

vi.mock('./repository', () => ({
  getLastSequenceForYear: vi.fn().mockResolvedValue(0),
  createOfficialLetter: vi.fn(),
  findOfficialLetterById: vi.fn(),
  updateOfficialLetter: vi.fn(),
  cancelOfficialLetter: vi.fn(),
}));

vi.mock('@/lib/audit/service', () => ({
  logAuditAction: vi.fn(),
}));

vi.mock('@/lib/integrations/outbox', () => ({
  emitDomainEvent: vi.fn(),
}));

describe('oficios service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits an event when a generated official letter is created', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.createOfficialLetter).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'gerado',
    });

    await saveOfficialLetter(
      {
        recipient: 'Destinatário',
        recipientRole: 'Cargo',
        vocativo: 'Senhor',
        letterDate: '13 de maio de 2026',
        subject: 'Assunto',
        itamaratySector: 'SGP',
        signatoryName: 'Nome',
        signatoryRole: 'Cargo',
        closure: 'Atenciosamente,',
        bodyRichText: 'Texto',
        bodyPlainText: 'Texto',
      },
      1,
    );

    expect(emitDomainEvent).toHaveBeenCalledOnce();
    expect(emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'official_letter.created',
        payload: expect.objectContaining({
          links: {
            app: '/app/secretaria/oficios/12',
          },
        }),
      }),
      transactionMock.tx,
    );
  });

  it('generates padded sequence number starting from last+1', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.getLastSequenceForYear).mockResolvedValue(5);

    const result = await generateOfficialLetterNumber(2026);
    expect(result).toEqual({ number: 'OFÍCIO No 006/2026/ASOF', sequence: 6 });
  });

  it('generates sequence 001 when no letters exist for the year', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.getLastSequenceForYear).mockResolvedValue(0);

    const result = await generateOfficialLetterNumber(2026);
    expect(result).toEqual({ number: 'OFÍCIO No 001/2026/ASOF', sequence: 1 });
  });

  it('does not emit event when a draft is created', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.createOfficialLetter).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'rascunho',
    });

    await saveOfficialLetter(
      {
        recipient: 'Destinatário',
        recipientRole: 'Cargo',
        vocativo: 'Senhor',
        letterDate: '13 de maio de 2026',
        subject: 'Assunto',
        itamaratySector: 'SGP',
        signatoryName: 'Nome',
        signatoryRole: 'Cargo',
        closure: 'Atenciosamente,',
        bodyRichText: 'Texto',
        bodyPlainText: 'Texto',
      },
      1,
    );

    expect(emitDomainEvent).not.toHaveBeenCalled();
  });

  it('emits a published event when an existing draft transitions to gerado', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.findOfficialLetterById).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'rascunho',
    });
    vi.mocked(repository.updateOfficialLetter).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'gerado',
    });

    const partialUpdate: Partial<NewOfficialLetter> = { status: 'gerado' };

    await updateOfficialLetter(12, partialUpdate, 1);

    expect(emitDomainEvent).toHaveBeenCalledOnce();
    expect(emitDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'official_letter.published',
        payload: expect.objectContaining({
          links: {
            app: '/app/secretaria/oficios/12',
          },
        }),
      }),
      transactionMock.tx,
    );
  });

  it('cancels an official letter and logs audit action', async () => {
    const repository = await import('./repository');
    const audit = await import('@/lib/audit/service');

    vi.mocked(repository.findOfficialLetterById).mockResolvedValue(BASE_OFFICIAL_LETTER);
    vi.mocked(repository.cancelOfficialLetter).mockResolvedValue({
      ...BASE_OFFICIAL_LETTER,
      status: 'cancelado',
    });

    const result = await cancelOfficialLetter(12, 1);

    expect(result.status).toBe('cancelado');
    expect(audit.logAuditAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'official_letter_cancelled',
        entityId: 12,
      }),
    );
  });

  it('throws when cancelling a non-existent letter', async () => {
    const repository = await import('./repository');
    vi.mocked(repository.findOfficialLetterById).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof repository.findOfficialLetterById>>,
    );

    await expect(cancelOfficialLetter(999, 1)).rejects.toThrow('Ofício não encontrado.');
  });
});
