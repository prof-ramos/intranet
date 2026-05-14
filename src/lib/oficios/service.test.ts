import { beforeEach, describe, expect, it, vi } from 'vitest';
import { saveOfficialLetter, updateOfficialLetter } from './service';
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
});
